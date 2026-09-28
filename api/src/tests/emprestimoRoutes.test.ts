import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query, getClient } from '../config/database.js';
import { criarEmprestimoSchema } from '../validators/emprestimoValidator.js';

// Testes de rota (Vitest + Supertest) da API-11 (issue #47): registro de
// retirada e sugestão de previsão de devolução. Cada caso usa a sua própria
// ferramenta, criada aqui com o prefixo abaixo, para não depender do estado do
// seed nem de outros arquivos de teste; o afterAll apaga tudo pelo prefixo.
const PREFIXO = 'ZZTESTE_API11_';

function gerarToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
}

async function criarFerramenta(nome: string, ehKit = false): Promise<number> {
  const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
  const result = await query<{ id: number }>(
    'INSERT INTO ferramentas (nome, grupo_id, eh_kit) VALUES ($1, $2, $3) RETURNING id',
    [`${PREFIXO}${nome}`, grupoId, ehKit]
  );
  return result.rows[0].id;
}

describe('Rotas de Empréstimos (API-11)', () => {
  let usuarioId: number;
  let manutencaoToken: string;
  let consultaToken: string;

  let setorId: number;
  let colaboradorId: number;
  let atividadeId: number;
  let previsaoDevolucao: string;

  const post = (body: Record<string, unknown>, token: string | null = manutencaoToken) => {
    const req = request(app).post('/v1/emprestimos');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  };

  const corpo = (ferramentaId: number, extra: Record<string, unknown> = {}) => ({
    ferramentaId,
    colaboradorId,
    setorDestinoId: setorId,
    previsaoDevolucao,
    ...extra,
  });

  beforeAll(async () => {
    usuarioId = (await query<{ id: number }>("SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo = true ORDER BY id LIMIT 1"))
      .rows[0].id;
    setorId = (await query<{ id: number }>('SELECT id FROM setores WHERE ativo = true ORDER BY id LIMIT 1')).rows[0].id;
    colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1')).rows[0].id;
    atividadeId = (await query<{ id: number }>('SELECT id FROM atividades WHERE ativo = true ORDER BY id LIMIT 1')).rows[0].id;

    manutencaoToken = gerarToken({ id: usuarioId, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' });
    // authenticate só decodifica o JWT — mesmo padrão do authorize.test.ts.
    consultaToken = gerarToken({ id: usuarioId, nome: 'Consulta Teste', papel: 'consulta', matricula: '9309' });

    previsaoDevolucao = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  });

  afterAll(async () => {
    const ferramentas = `SELECT id FROM ferramentas WHERE nome LIKE $1`;
    // ocorrencias.ferramenta_id é ON DELETE RESTRICT: precisa sair antes das
    // ferramentas, ou o DELETE final falha para os casos de avaria/perda.
    await query(`DELETE FROM ocorrencias WHERE ferramenta_id IN (${ferramentas})`, [`${PREFIXO}%`]);
    await query(`DELETE FROM emprestimos WHERE ferramenta_id IN (${ferramentas})`, [`${PREFIXO}%`]);
    await query(`DELETE FROM itens_kit WHERE ferramenta_id IN (${ferramentas})`, [`${PREFIXO}%`]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
  });

  describe('POST /v1/emprestimos', () => {
    it('registra a retirada (201), coloca a ferramenta em uso e grava o responsável do JWT', async () => {
      const ferramentaId = await criarFerramenta('Normal');

      const res = await post(corpo(ferramentaId, { atividadeId, ordemServico: 'OS-API11', observacoesRetirada: 'teste' }));

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        ferramenta_id: ferramentaId,
        colaborador_id: colaboradorId,
        setor_id: setorId,
        atividade_id: atividadeId,
        ordem_servico: 'OS-API11',
        observacoes_retirada: 'teste',
        situacao: 'em_aberto',
      });

      const emprestimo = await query<{ usuario_retirada_id: number }>(
        'SELECT usuario_retirada_id FROM emprestimos WHERE id = $1',
        [res.body.data.id]
      );
      expect(emprestimo.rows[0].usuario_retirada_id).toBe(usuarioId);

      const ferramenta = await query<{ status: string }>('SELECT status FROM ferramentas WHERE id = $1', [ferramentaId]);
      expect(ferramenta.rows[0].status).toBe('em_uso');
    });

    it('recusa ferramenta já emprestada com 409 FERRAMENTA_INDISPONIVEL', async () => {
      const ferramentaId = await criarFerramenta('JaEmprestada');
      expect((await post(corpo(ferramentaId))).status).toBe(201);

      const res = await post(corpo(ferramentaId));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('FERRAMENTA_INDISPONIVEL');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error).toHaveProperty('details');
    });

    it('aceita retirada sem atividade (Regra 4)', async () => {
      const ferramentaId = await criarFerramenta('SemAtividade');

      const res = await post(corpo(ferramentaId));

      expect(res.status).toBe(201);
      expect(res.body.data.atividade_id).toBeNull();
    });

    it('ignora usuarioRetiradaId enviado no corpo (Regra 6)', async () => {
      const ferramentaId = await criarFerramenta('CorpoSpoof');

      const res = await post(corpo(ferramentaId, { usuarioRetiradaId: 999999, usuario_retirada_id: 999999 }));

      expect(res.status).toBe(201);
      const emprestimo = await query<{ usuario_retirada_id: number }>(
        'SELECT usuario_retirada_id FROM emprestimos WHERE id = $1',
        [res.body.data.id]
      );
      expect(emprestimo.rows[0].usuario_retirada_id).toBe(usuarioId);
    });

    it('trata previsaoDevolucao só com data como o fim do dia em Brasília', async () => {
      const ferramentaId = await criarFerramenta('DataSemHora');

      const res = await post(corpo(ferramentaId, { previsaoDevolucao: '2099-01-10' }));

      expect(res.status).toBe(201);
      expect(new Date(res.body.data.previsao_devolucao).toISOString()).toBe('2099-01-11T02:59:59.000Z');
    });

    it('retorna 400 sem previsaoDevolucao', async () => {
      const ferramentaId = await criarFerramenta('SemPrevisao');

      const res = await post({ ...corpo(ferramentaId), previsaoDevolucao: undefined });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0]).toMatchObject({ field: 'previsaoDevolucao' });
    });

    it('retorna 400 com previsaoDevolucao no passado ou inválida', async () => {
      const ferramentaId = await criarFerramenta('PrevisaoInvalida');

      const passado = await post(corpo(ferramentaId, { previsaoDevolucao: '2020-01-01' }));
      const invalida = await post(corpo(ferramentaId, { previsaoDevolucao: 'amanha' }));

      expect(passado.status).toBe(400);
      expect(invalida.status).toBe(400);
    });

    it('retorna 400 quando falta um campo obrigatório', async () => {
      const res = await post({ colaboradorId, setorDestinoId: setorId, previsaoDevolucao });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0]).toMatchObject({ field: 'ferramentaId' });
    });

    it('retorna 404 para ferramenta, colaborador, setor e atividade inexistentes', async () => {
      const ferramentaId = await criarFerramenta('Inexistentes');

      const ferramenta = await post(corpo(99999999));
      const colaborador = await post(corpo(ferramentaId, { colaboradorId: 99999999 }));
      const setor = await post(corpo(ferramentaId, { setorDestinoId: 99999999 }));
      const atividade = await post(corpo(ferramentaId, { atividadeId: 99999999 }));

      expect(ferramenta.status).toBe(404);
      expect(ferramenta.body.error.code).toBe('FERRAMENTA_NOT_FOUND');
      expect(colaborador.status).toBe(404);
      expect(colaborador.body.error.code).toBe('COLABORADOR_NOT_FOUND');
      expect(setor.status).toBe(404);
      expect(setor.body.error.code).toBe('SETOR_NOT_FOUND');
      expect(atividade.status).toBe(404);
      expect(atividade.body.error.code).toBe('ATIVIDADE_NOT_FOUND');
    });

    it('retorna 401 sem token e 403 com papel consulta', async () => {
      const ferramentaId = await criarFerramenta('SemPermissao');

      const semToken = await post(corpo(ferramentaId), null);
      const consulta = await post(corpo(ferramentaId), consultaToken);

      expect(semToken.status).toBe(401);
      expect(consulta.status).toBe(403);
    });

    describe('kits', () => {
      let kitId: number;
      let itemId: number;
      let simplesId: number;

      beforeAll(async () => {
        kitId = await criarFerramenta('Kit', true);
        simplesId = await criarFerramenta('SimplesParaItem');
        itemId = (
          await query<{ id: number }>("INSERT INTO itens_kit (ferramenta_id, nome) VALUES ($1, 'peça') RETURNING id", [kitId])
        ).rows[0].id;
      });

      it('retorna 400 ITEM_KIT_INVALIDO quando o item não pertence à ferramenta', async () => {
        const res = await post(corpo(simplesId, { itemKitId: itemId }));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('ITEM_KIT_INVALIDO');
      });

      it('retorna 404 ITEM_KIT_NOT_FOUND para item inexistente', async () => {
        const res = await post(corpo(kitId, { itemKitId: 99999999 }));

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('ITEM_KIT_NOT_FOUND');
      });

      it('empresta uma peça avulsa e bloqueia repetir a peça e emprestar o kit inteiro (409)', async () => {
        const peca = await post(corpo(kitId, { itemKitId: itemId }));
        const repetida = await post(corpo(kitId, { itemKitId: itemId }));
        const kitInteiro = await post(corpo(kitId));

        expect(peca.status).toBe(201);
        expect(peca.body.data.item_kit_id).toBe(itemId);
        expect(repetida.status).toBe(409);
        expect(repetida.body.error.code).toBe('FERRAMENTA_INDISPONIVEL');
        expect(kitInteiro.status).toBe(409);
        expect(kitInteiro.body.error.code).toBe('FERRAMENTA_INDISPONIVEL');
      });
    });
  });

  describe('PATCH /v1/emprestimos/:id/devolucao (API-12)', () => {
    const patch = (id: number, body: Record<string, unknown>, token: string | null = manutencaoToken) => {
      const req = request(app).patch(`/v1/emprestimos/${id}/devolucao`);
      if (token) req.set('Authorization', `Bearer ${token}`);
      return req.send(body);
    };

    // Registra a retirada e devolve o id do empréstimo aberto, para o teste
    // só se preocupar com a devolução em si.
    const retirar = async (nome: string, extra: Record<string, unknown> = {}) => {
      const ferramentaId = await criarFerramenta(nome);
      const res = await post(corpo(ferramentaId, extra));
      return { emprestimoId: res.body.data.id as number, ferramentaId };
    };

    const statusFerramenta = async (id: number) =>
      (await query<{ status: string; motivo_indisponivel: string | null }>(
        'SELECT status, motivo_indisponivel FROM ferramentas WHERE id = $1',
        [id]
      )).rows[0];

    it('devolução ok (200) volta a ferramenta a disponivel', async () => {
      const { emprestimoId, ferramentaId } = await retirar('DevolucaoOk');

      const res = await patch(emprestimoId, { condicaoDevolucao: 'ok' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: emprestimoId, situacao: 'devolvido' });
      expect(res.body.data.data_devolucao).not.toBeNull();
      expect(res.body.data.resumo).toBe(`${res.body.data.ferramenta_nome} foi devolvida e está disponível.`);
      expect(await statusFerramenta(ferramentaId)).toEqual({ status: 'disponivel', motivo_indisponivel: null });
    });

    it('devolução com avaria (200) deixa a ferramenta indisponivel e abre ocorrência com o colaborador certo', async () => {
      const { emprestimoId, ferramentaId } = await retirar('DevolucaoAvaria');

      const res = await patch(emprestimoId, { condicaoDevolucao: 'avaria', observacaoDevolucao: 'cabo rompido' });

      expect(res.status).toBe(200);
      expect(res.body.data.resumo).toBe(`${res.body.data.ferramenta_nome} foi para indisponível por avaria.`);
      expect(await statusFerramenta(ferramentaId)).toEqual({ status: 'indisponivel', motivo_indisponivel: 'avaria' });

      const ocorrencia = await query<{ colaborador_id: number; tipo: string; registrada_por: number }>(
        'SELECT colaborador_id, tipo, registrada_por FROM ocorrencias WHERE emprestimo_id = $1',
        [emprestimoId]
      );
      expect(ocorrencia.rows[0]).toMatchObject({ colaborador_id: colaboradorId, tipo: 'AVARIA', registrada_por: usuarioId });
    });

    it('devolução com perda (200) deixa a ferramenta indisponivel e abre ocorrência', async () => {
      const { emprestimoId, ferramentaId } = await retirar('DevolucaoPerda');

      const res = await patch(emprestimoId, { condicaoDevolucao: 'perda' });

      expect(res.status).toBe(200);
      expect(res.body.data.resumo).toBe(`${res.body.data.ferramenta_nome} foi para indisponível por perda.`);
      expect(await statusFerramenta(ferramentaId)).toEqual({ status: 'indisponivel', motivo_indisponivel: 'perda' });

      const ocorrencia = await query('SELECT 1 FROM ocorrencias WHERE emprestimo_id = $1 AND tipo = $2', [emprestimoId, 'PERDA']);
      expect(ocorrencia.rowCount).toBe(1);
    });

    it('recusa devolver o mesmo empréstimo duas vezes (409 EMPRESTIMO_JA_DEVOLVIDO)', async () => {
      const { emprestimoId } = await retirar('DevolucaoDuplicada');
      expect((await patch(emprestimoId, { condicaoDevolucao: 'ok' })).status).toBe(200);

      const res = await patch(emprestimoId, { condicaoDevolucao: 'ok' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMPRESTIMO_JA_DEVOLVIDO');
    });

    it('retorna 404 EMPRESTIMO_NOT_FOUND para empréstimo inexistente', async () => {
      const res = await patch(99999999, { condicaoDevolucao: 'ok' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EMPRESTIMO_NOT_FOUND');
    });

    it('retorna 400 com condicaoDevolucao ausente ou inválida', async () => {
      const { emprestimoId } = await retirar('CondicaoInvalida');

      const ausente = await patch(emprestimoId, {});
      const invalida = await patch(emprestimoId, { condicaoDevolucao: 'quebrada' });

      expect(ausente.status).toBe(400);
      expect(ausente.body.error.details[0]).toMatchObject({ field: 'condicaoDevolucao' });
      expect(invalida.status).toBe(400);
    });

    it('retorna 401 sem token e 403 com papel consulta', async () => {
      const { emprestimoId } = await retirar('SemPermissaoDevolucao');

      const semToken = await patch(emprestimoId, { condicaoDevolucao: 'ok' }, null);
      const consulta = await patch(emprestimoId, { condicaoDevolucao: 'ok' }, consultaToken);

      expect(semToken.status).toBe(401);
      expect(consulta.status).toBe(403);
    });

    it('ignora usuarioDevolucaoId enviado no corpo (Regra 6)', async () => {
      const { emprestimoId } = await retirar('CorpoSpoofDevolucao');

      const res = await patch(emprestimoId, { condicaoDevolucao: 'ok', usuarioDevolucaoId: 999999, usuario_devolucao_id: 999999 });

      expect(res.status).toBe(200);
      const emprestimo = await query<{ usuario_devolucao_id: number }>(
        'SELECT usuario_devolucao_id FROM emprestimos WHERE id = $1',
        [emprestimoId]
      );
      expect(emprestimo.rows[0].usuario_devolucao_id).toBe(usuarioId);
    });

    it('devolve peça avulsa de kit sem mudar o status do kit e abre ocorrência na avaria', async () => {
      const kitId = await criarFerramenta('KitDevolucao', true);
      const itemId = (
        await query<{ id: number }>("INSERT INTO itens_kit (ferramenta_id, nome) VALUES ($1, 'peça') RETURNING id", [kitId])
      ).rows[0].id;
      const retirada = await post(corpo(kitId, { itemKitId: itemId }));
      const emprestimoId = retirada.body.data.id as number;

      const res = await patch(emprestimoId, { condicaoDevolucao: 'avaria' });

      expect(res.status).toBe(200);
      // O status do kit não muda na peça avulsa: o restante do kit continua
      // disponível (decisão registrada em docs/decisoes-pendentes.md). O
      // resumo fala da peça, não do kit inteiro.
      expect(res.body.data.resumo).toBe(`${res.body.data.item_kit_nome} foi para indisponível por avaria.`);
      expect((await statusFerramenta(kitId)).status).toBe('disponivel');

      const ocorrencia = await query('SELECT 1 FROM ocorrencias WHERE emprestimo_id = $1 AND item_kit_id = $2', [
        emprestimoId,
        itemId,
      ]);
      expect(ocorrencia.rowCount).toBe(1);
    });
  });

  describe('ferramenta e kit indisponíveis (Regra 2)', () => {
    const tornarIndisponivel = (id: number) =>
      query("UPDATE ferramentas SET status = 'indisponivel', motivo_indisponivel = 'avaria' WHERE id = $1", [id]);

    // Cada caso usa o seu próprio kit: emprestar o kit inteiro de um kit
    // compartilhado bloquearia as peças por outro motivo e mascararia o teste.
    const criarKitIndisponivel = async (nome: string) => {
      const kitId = await criarFerramenta(nome, true);
      const itemId = (
        await query<{ id: number }>("INSERT INTO itens_kit (ferramenta_id, nome) VALUES ($1, 'peça') RETURNING id", [kitId])
      ).rows[0].id;
      await tornarIndisponivel(kitId);
      return { kitId, itemId };
    };

    const estado = async (id: number) =>
      (await query<{ status: string; motivo_indisponivel: string | null }>(
        'SELECT status, motivo_indisponivel FROM ferramentas WHERE id = $1',
        [id]
      )).rows[0];

    it('recusa ferramenta simples indisponível (409)', async () => {
      const ferramentaId = await criarFerramenta('SimplesIndisponivel');
      await tornarIndisponivel(ferramentaId);

      const res = await post(corpo(ferramentaId));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('FERRAMENTA_INDISPONIVEL');
    });

    it('recusa o kit inteiro indisponível e mantém status e motivo', async () => {
      const { kitId } = await criarKitIndisponivel('KitIndisponivelInteiro');

      const res = await post(corpo(kitId));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('FERRAMENTA_INDISPONIVEL');
      expect(await estado(kitId)).toEqual({ status: 'indisponivel', motivo_indisponivel: 'avaria' });
    });

    it('recusa peça avulsa de kit indisponível e não cria empréstimo', async () => {
      const { kitId, itemId } = await criarKitIndisponivel('KitIndisponivelPeca');

      const res = await post(corpo(kitId, { itemKitId: itemId }));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('FERRAMENTA_INDISPONIVEL');
      const abertos = await query('SELECT 1 FROM emprestimos WHERE ferramenta_id = $1', [kitId]);
      expect(abertos.rowCount).toBe(0);
    });
  });

  describe('concorrência no kit', () => {
    it('espera a ferramenta ser liberada por outra transação e então respeita a exclusividade', async () => {
      const kitId = await criarFerramenta('KitConcorrencia', true);
      const itemId = (
        await query<{ id: number }>("INSERT INTO itens_kit (ferramenta_id, nome) VALUES ($1, 'peça') RETURNING id", [kitId])
      ).rows[0].id;

      // Outra transação segura a linha do kit. A retirada do kit inteiro precisa
      // esperar por ela; sem o lock, responderia na hora e a peça avulsa,
      // inserida em seguida, conviveria com o kit inteiro emprestado.
      const outra = await getClient();
      try {
        await outra.query('BEGIN');
        await outra.query('SELECT id FROM ferramentas WHERE id = $1 FOR UPDATE', [kitId]);

        let respondeu = false;
        const kitInteiro = post(corpo(kitId)).then((res) => {
          respondeu = true;
          return res;
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(respondeu).toBe(false);

        await outra.query(
          `INSERT INTO emprestimos (ferramenta_id, item_kit_id, colaborador_id, setor_destino_id, previsao_devolucao, usuario_retirada_id)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '2 days', $5)`,
          [kitId, itemId, colaboradorId, setorId, usuarioId]
        );
        await outra.query('COMMIT');

        const res = await kitInteiro;
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('FERRAMENTA_INDISPONIVEL');
      } finally {
        await outra.query('ROLLBACK').catch(() => undefined);
        outra.release();
      }
    });
  });

  describe('previsaoDevolucao sem offset (horário de Brasília)', () => {
    const parse = (valor: string) => criarEmprestimoSchema.shape.previsaoDevolucao.parse(valor).toISOString();

    it('interpreta data e hora sem offset como Brasília, qualquer que seja o fuso do servidor', () => {
      const fusoOriginal = process.env.TZ;
      try {
        for (const fuso of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo']) {
          process.env.TZ = fuso;
          expect(parse('2099-10-05T10:00')).toBe('2099-10-05T13:00:00.000Z');
          expect(parse('2099-10-05T10:00:30')).toBe('2099-10-05T13:00:30.000Z');
          expect(parse('2099-10-05 10:00')).toBe('2099-10-05T13:00:00.000Z');
        }
      } finally {
        if (fusoOriginal === undefined) delete process.env.TZ;
        else process.env.TZ = fusoOriginal;
      }
    });

    it('respeita offset explícito e mantém a data sem horário como fim do dia em Brasília', () => {
      expect(parse('2099-10-05T10:00:00Z')).toBe('2099-10-05T10:00:00.000Z');
      expect(parse('2099-10-05T10:00:00-03:00')).toBe('2099-10-05T13:00:00.000Z');
      expect(parse('2099-10-05T10:00:00+02:00')).toBe('2099-10-05T08:00:00.000Z');
      expect(parse('2099-10-05')).toBe('2099-10-06T02:59:59.000Z');
    });
  });

  describe('GET /v1/emprestimos/previsao-sugerida', () => {
    const get = (queryString: string, token: string | null = manutencaoToken) => {
      const req = request(app).get(`/v1/emprestimos/previsao-sugerida${queryString}`);
      if (token) req.set('Authorization', `Bearer ${token}`);
      return req;
    };

    // O token do beforeAll expiraria na data simulada; este é emitido depois de
    // setSystemTime.
    const tokenNaDataSimulada = () =>
      gerarToken({ id: usuarioId, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' });

    it('pula o fim de semana: retirada na sexta por 2 dias devolve na terça', async () => {
      // Sexta-feira 02/10/2026, meio-dia em Brasília. Só o Date é simulado, para
      // não travar o pool do pg.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-02T15:00:00.000Z'));
      try {
        const res = await get('?dias=2', tokenNaDataSimulada());

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ previsaoDevolucao: '2026-10-06', diasUteis: 2 });
      } finally {
        vi.useRealTimers();
      }
    });

    it('usa a data de Brasília depois das 21h (quinta 22h por 2 dias devolve na segunda)', async () => {
      // Quinta-feira 01/10/2026, 22h em Brasília = sexta 02/10 01h em UTC.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-02T01:00:00.000Z'));
      try {
        const res = await get('?dias=2', tokenNaDataSimulada());

        expect(res.status).toBe(200);
        expect(res.body.data.previsaoDevolucao).toBe('2026-10-05');
      } finally {
        vi.useRealTimers();
      }
    });

    it('retorna 400 sem dias ou com dias fora de 1 a 30', async () => {
      expect((await get('')).status).toBe(400);
      expect((await get('?dias=0')).status).toBe(400);
      expect((await get('?dias=31')).status).toBe(400);
      expect((await get('?dias=abc')).status).toBe(400);
    });

    it('retorna 401 sem token e 403 com papel consulta', async () => {
      expect((await get('?dias=2', null)).status).toBe(401);
      expect((await get('?dias=2', consultaToken)).status).toBe(403);
    });
  });
});
