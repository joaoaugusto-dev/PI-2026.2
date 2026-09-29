import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// Testes de rota (Vitest + Supertest) da API-13 (issue #49): acompanhamento e
// fechamento das tratativas de avaria/perda. Cada caso cria a sua própria
// ferramenta e ocorrência (inseridas direto no banco — GET/PATCH não criam
// ocorrência, só a devolução com avaria/perda faz isso, já coberto pela
// API-12), com o prefixo abaixo, para não depender do estado do seed nem de
// outros arquivos de teste; o afterAll apaga tudo pelo prefixo.
const PREFIXO = 'ZZTESTE_API13_';

function gerarToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
}

async function criarFerramenta(nome: string): Promise<number> {
  const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
  const result = await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [
    `${PREFIXO}${nome}`,
    grupoId,
  ]);
  return result.rows[0].id;
}

describe('Rotas de Ocorrências (API-13)', () => {
  let usuarioId: number;
  let manutencaoToken: string;
  let consultaToken: string;
  let colaboradorId: number;
  let outroColaboradorId: number;

  const get = (queryString: string, token: string | null = manutencaoToken) => {
    const req = request(app).get(`/v1/ocorrencias${queryString}`);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  const patch = (id: number, body: Record<string, unknown>, token: string | null = manutencaoToken) => {
    const req = request(app).patch(`/v1/ocorrencias/${id}`);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  };

  // GET/PATCH não criam ocorrência (Regra 3: quem abre é o trigger na
  // devolução, já testado na API-12) — aqui insere direto no banco para
  // testar só o acompanhamento e o fechamento da tratativa.
  const criarOcorrencia = async (
    nome: string,
    opcoes: { status?: string; tipo?: string; colaboradorId?: number } = {}
  ) => {
    const ferramentaId = await criarFerramenta(nome);
    const result = await query<{ id: number }>(
      `INSERT INTO ocorrencias (ferramenta_id, colaborador_id, tipo, descricao, status, registrada_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        ferramentaId,
        opcoes.colaboradorId ?? colaboradorId,
        opcoes.tipo ?? 'AVARIA',
        `${PREFIXO}descricao`,
        opcoes.status ?? 'aberta',
        usuarioId,
      ]
    );
    return { id: result.rows[0].id, ferramentaId };
  };

  beforeAll(async () => {
    usuarioId = (
      await query<{ id: number }>("SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo = true ORDER BY id LIMIT 1")
    ).rows[0].id;
    const colaboradores = await query<{ id: number }>('SELECT id FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 2');
    colaboradorId = colaboradores.rows[0].id;
    outroColaboradorId = colaboradores.rows[1].id;

    manutencaoToken = gerarToken({ id: usuarioId, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' });
    consultaToken = gerarToken({ id: usuarioId, nome: 'Consulta Teste', papel: 'consulta', matricula: '9309' });
  });

  afterAll(async () => {
    const ferramentas = `SELECT id FROM ferramentas WHERE nome LIKE $1`;
    await query(`DELETE FROM ocorrencias WHERE ferramenta_id IN (${ferramentas})`, [`${PREFIXO}%`]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
  });

  describe('GET /v1/ocorrencias', () => {
    it('lista sem filtro (200) trazendo a ocorrência recém-criada com os nomes resolvidos', async () => {
      const { id, ferramentaId } = await criarOcorrencia('ListaSemFiltro');

      const res = await get('');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('meta');
      const item = res.body.data.find((o: any) => o.id === id);
      expect(item).toMatchObject({
        ferramenta_id: ferramentaId,
        colaborador_id: colaboradorId,
        tipo: 'AVARIA',
        status: 'aberta',
      });
      expect(item.ferramenta_nome).toBe(`${PREFIXO}ListaSemFiltro`);
    });

    it('filtra por status', async () => {
      const aberta = await criarOcorrencia('FiltroStatusAberta', { status: 'aberta' });
      const emReparo = await criarOcorrencia('FiltroStatusEmReparo', { status: 'em_reparo' });

      const res = await get('?status=em_reparo');

      expect(res.status).toBe(200);
      const ids = res.body.data.map((o: any) => o.id);
      expect(ids).toContain(emReparo.id);
      expect(ids).not.toContain(aberta.id);
    });

    it('filtra por colaboradorId', async () => {
      const doColaborador = await criarOcorrencia('FiltroColaboradorA', { colaboradorId });
      const doOutro = await criarOcorrencia('FiltroColaboradorB', { colaboradorId: outroColaboradorId });

      const res = await get(`?colaboradorId=${outroColaboradorId}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((o: any) => o.id);
      expect(ids).toContain(doOutro.id);
      expect(ids).not.toContain(doColaborador.id);
    });

    it('filtra por tipo', async () => {
      const avaria = await criarOcorrencia('FiltroTipoAvaria', { tipo: 'AVARIA' });
      const perda = await criarOcorrencia('FiltroTipoPerda', { tipo: 'PERDA' });

      const res = await get('?tipo=PERDA');

      expect(res.status).toBe(200);
      const ids = res.body.data.map((o: any) => o.id);
      expect(ids).toContain(perda.id);
      expect(ids).not.toContain(avaria.id);
    });

    it('normaliza tipo para maiúsculo no filtro (aceita minúsculo)', async () => {
      const perda = await criarOcorrencia('FiltroTipoMinusculo', { tipo: 'PERDA' });

      const res = await get('?tipo=perda');

      expect(res.status).toBe(200);
      expect(res.body.data.map((o: any) => o.id)).toContain(perda.id);
    });

    it('retorna 400 com status ou tipo inválidos', async () => {
      const status = await get('?status=cancelada');
      const tipo = await get('?tipo=ROUBO');

      expect(status.status).toBe(400);
      expect(status.body.error.code).toBe('VALIDATION_ERROR');
      expect(tipo.status).toBe(400);
    });

    it('retorna 401 sem token e 403 com papel consulta', async () => {
      expect((await get('', null)).status).toBe(401);
      expect((await get('', consultaToken)).status).toBe(403);
    });
  });

  describe('PATCH /v1/ocorrencias/:id', () => {
    it('faz o ciclo aberta → em_reparo → resolvida, gravando resolvida_por e data_resolucao do JWT', async () => {
      const { id } = await criarOcorrencia('CicloCompleto');

      const paraEmReparo = await patch(id, { status: 'em_reparo' });
      expect(paraEmReparo.status).toBe(200);
      expect(paraEmReparo.body.data.status).toBe('em_reparo');
      expect(paraEmReparo.body.data.resolvida_por).toBeNull();

      const paraResolvida = await patch(id, { status: 'resolvida', custoEstimado: 150.5, observacoesResolucao: 'trocada a peça' });
      expect(paraResolvida.status).toBe(200);
      expect(paraResolvida.body.data).toMatchObject({
        status: 'resolvida',
        custo_estimado: '150.50',
        observacoes_resolucao: 'trocada a peça',
        resolvida_por: usuarioId,
      });
      expect(paraResolvida.body.data.data_resolucao).not.toBeNull();
    });

    it('aceita transição para cobrada e depois baixada (estados fora do ciclo de 3 citado na issue)', async () => {
      const { id } = await criarOcorrencia('CicloCobradaBaixada', { status: 'em_reparo' });

      const paraCobrada = await patch(id, { status: 'cobrada' });
      expect(paraCobrada.status).toBe(200);
      expect(paraCobrada.body.data.status).toBe('cobrada');

      const paraBaixada = await patch(id, { status: 'baixada' });
      expect(paraBaixada.status).toBe(200);
      expect(paraBaixada.body.data.status).toBe('baixada');
    });

    it('recusa retroceder o status (409 OCORRENCIA_TRANSICAO_INVALIDA)', async () => {
      const { id } = await criarOcorrencia('Retrocesso', { status: 'resolvida' });

      const res = await patch(id, { status: 'em_reparo' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OCORRENCIA_TRANSICAO_INVALIDA');
    });

    it('não sobrescreve resolvida_por/data_resolucao ao reenviar status resolvida', async () => {
      const { id } = await criarOcorrencia('ReenvioResolvida', { status: 'resolvida' });
      const antes = await query<{ resolvida_por: number | null; data_resolucao: string | null }>(
        'SELECT resolvida_por, data_resolucao FROM ocorrencias WHERE id = $1',
        [id]
      );
      expect(antes.rows[0]).toEqual({ resolvida_por: null, data_resolucao: null });

      const res = await patch(id, { status: 'resolvida', custoEstimado: 42 });

      expect(res.status).toBe(200);
      expect(res.body.data.resolvida_por).toBeNull();
      expect(res.body.data.data_resolucao).toBeNull();
      expect(res.body.data.custo_estimado).toBe('42.00');
    });

    it('atualiza só custoEstimado ou só observacoesResolucao sem mudar o status', async () => {
      const { id } = await criarOcorrencia('SoCusto', { status: 'em_reparo' });

      const res = await patch(id, { custoEstimado: 80 });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('em_reparo');
      expect(res.body.data.custo_estimado).toBe('80.00');
    });

    it('retorna 400 com corpo vazio', async () => {
      const { id } = await criarOcorrencia('CorpoVazio');

      const res = await patch(id, {});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 400 com custoEstimado vazio em vez de aceitar como zero', async () => {
      const { id } = await criarOcorrencia('CustoVazio');

      const res = await patch(id, { custoEstimado: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0]).toMatchObject({ field: 'custoEstimado' });
    });

    it('retorna 404 OCORRENCIA_NOT_FOUND para ocorrência inexistente', async () => {
      const res = await patch(99999999, { status: 'em_reparo' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('OCORRENCIA_NOT_FOUND');
    });

    it('retorna 401 sem token e 403 com papel consulta', async () => {
      const { id } = await criarOcorrencia('SemPermissao');

      const semToken = await patch(id, { status: 'em_reparo' }, null);
      const consulta = await patch(id, { status: 'em_reparo' }, consultaToken);

      expect(semToken.status).toBe(401);
      expect(consulta.status).toBe(403);
    });

    it('ignora resolvidaPor enviado no corpo (Regra 6)', async () => {
      const { id } = await criarOcorrencia('CorpoSpoofResolvidaPor', { status: 'em_reparo' });

      const res = await patch(id, { status: 'resolvida', resolvidaPor: 999999, resolvida_por: 999999 });

      expect(res.status).toBe(200);
      expect(res.body.data.resolvida_por).toBe(usuarioId);
    });
  });
});
