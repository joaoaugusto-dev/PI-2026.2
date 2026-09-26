import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// Testes de rota (Vitest + Supertest) da API-11 (issue #47): registro de
// retirada e sugestão de previsão de devolução. Cada caso usa a sua própria
// ferramenta, criada aqui com o prefixo abaixo, para não depender do estado do
// seed nem de outros arquivos de teste; o afterAll apaga tudo pelo prefixo.
const PREFIXO = 'ZZTESTE_API11_';

function gerarToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
}

async function criarFerramenta(nome: string, ehKit = false): Promise<number> {
  const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas LIMIT 1')).rows[0].id;
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
    usuarioId = (await query<{ id: number }>("SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo = true LIMIT 1"))
      .rows[0].id;
    setorId = (await query<{ id: number }>('SELECT id FROM setores WHERE ativo = true LIMIT 1')).rows[0].id;
    colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores WHERE ativo = true LIMIT 1')).rows[0].id;
    atividadeId = (await query<{ id: number }>('SELECT id FROM atividades WHERE ativo = true LIMIT 1')).rows[0].id;

    manutencaoToken = gerarToken({ id: usuarioId, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' });
    // authenticate só decodifica o JWT — mesmo padrão do authorize.test.ts.
    consultaToken = gerarToken({ id: usuarioId, nome: 'Consulta Teste', papel: 'consulta', matricula: '9309' });

    previsaoDevolucao = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  });

  afterAll(async () => {
    const ferramentas = `SELECT id FROM ferramentas WHERE nome LIKE $1`;
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
