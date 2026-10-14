import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { diasNoPeriodo, somarDias } from '../validators/kpiValidator.js';

// Testes de rota (Vitest + Supertest) dos KPIs de gestão (issue #208). Os dados de teste ficam em 2001, com
// uma categoria e ferramentas só deles (prefixo abaixo), para as contas não dependerem do que já existe no
// banco nem de outros arquivos de teste; o afterAll apaga tudo. Datas escritas com -03:00 (Brasília) de
// propósito: o caso de 31/03 às 23:30 cai em abril se o dia fosse contado em UTC.
const PREFIXO = 'ZZTESTE_KPI208_';
const MARCO = 'de=2001-03-01&ate=2001-03-31';

const token = (papel: string) => jwt.sign({ id: 1, nome: 'T', papel, matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' });
const get = (caminho: string, papel: string | null = 'manutencao') => {
  const req = request(app).get(`/v1/kpis/${caminho}`);
  if (papel) req.set('Authorization', `Bearer ${token(papel)}`);
  return req;
};

const ROTAS_COM_PERIODO = [
  'ferramentas-mais-retiradas',
  'categorias-mais-utilizadas',
  'tempo-medio-posse',
  'avarias-por-categoria',
  'perdas-por-categoria',
  'taxa-avaria',
  'evolucao',
];
const ROTAS_INSTANTANEAS = ['indisponiveis', 'emprestimos-abertos'];

describe('KPIs de gestão (#208)', () => {
  let categoriaId: number;
  let ferramentaA: number;
  let ferramentaB: number;
  let ferramentaC: number;
  let ferramentaD: number;
  let emprestimoAbertoId: number;
  const ferramentas: number[] = [];

  let colaboradorId: number;
  let setorId: number;
  let usuarioId: number;

  const criarFerramenta = async (nome: string) => {
    const r = await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [
      `${PREFIXO}${nome}`,
      categoriaId,
    ]);
    ferramentas.push(r.rows[0].id);
    return r.rows[0].id;
  };

  const emprestimo = async (ferramentaId: number, retirada: string, devolucao: string | null, condicao: string | null, previsao: string) =>
    (
      await query<{ id: number }>(
        `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, usuario_devolucao_id,
                                  data_retirada, previsao_devolucao, data_devolucao, condicao_devolucao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [ferramentaId, colaboradorId, setorId, usuarioId, devolucao ? usuarioId : null, retirada, previsao, devolucao, condicao]
      )
    ).rows[0].id;

  const ocorrencia = (ferramentaId: number, tipo: string, criadaEm: string) =>
    query(
      `INSERT INTO ocorrencias (ferramenta_id, colaborador_id, tipo, descricao, registrada_por, created_at)
       VALUES ($1, $2, $3, 'teste kpi', $4, $5)`,
      [ferramentaId, colaboradorId, tipo, usuarioId, criadaEm]
    );

  beforeAll(async () => {
    colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores ORDER BY id LIMIT 1')).rows[0].id;
    setorId = (await query<{ id: number }>('SELECT id FROM setores ORDER BY id LIMIT 1')).rows[0].id;
    usuarioId = (await query<{ id: number }>('SELECT id FROM usuarios ORDER BY id LIMIT 1')).rows[0].id;
    categoriaId = (await query<{ id: number }>('INSERT INTO grupos_ferramentas (nome) VALUES ($1) RETURNING id', [`${PREFIXO}Categoria`])).rows[0].id;
    ferramentaA = await criarFerramenta('A');
    ferramentaB = await criarFerramenta('B');
    ferramentaC = await criarFerramenta('C');
    ferramentaD = await criarFerramenta('D');

    // março/2001, em Brasília
    await emprestimo(ferramentaA, '2001-03-10T10:00:00-03:00', '2001-03-10T14:00:00-03:00', 'ok', '2001-03-11T00:00:00-03:00'); // 4h
    await emprestimo(ferramentaA, '2001-03-15T08:00:00-03:00', '2001-03-16T08:00:00-03:00', 'avaria', '2001-03-17T00:00:00-03:00'); // 24h
    await emprestimo(ferramentaA, '2001-03-25T09:00:00-03:00', '2001-03-25T11:00:00-03:00', 'ok', '2001-03-26T00:00:00-03:00'); // 2h
    await emprestimo(ferramentaB, '2001-03-20T09:00:00-03:00', '2001-03-20T10:00:00-03:00', 'ok', '2001-03-21T00:00:00-03:00'); // 1h
    // retirada em 31/03 às 23:30 e devolução já em 01/04: conta como retirada de março, mas a devolução é de abril
    await emprestimo(ferramentaB, '2001-03-31T23:30:00-03:00', '2001-04-01T00:30:00-03:00', 'ok', '2001-04-02T00:00:00-03:00');
    // fora da janela (fevereiro): só aparece no período anterior da evolução
    await emprestimo(ferramentaC, '2001-02-28T23:59:00-03:00', '2001-02-28T23:59:30-03:00', 'ok', '2001-03-01T00:00:00-03:00');
    // aberto desde 01/01/2001: o mais antigo de todos e atrasado (a previsão passou há muito tempo)
    emprestimoAbertoId = await emprestimo(ferramentaD, '2001-01-01T09:00:00-03:00', null, null, '2001-01-02T00:00:00-03:00');

    await ocorrencia(ferramentaA, 'AVARIA', '2001-03-16T08:00:00-03:00');
    await ocorrencia(ferramentaB, 'AVARIA', '2001-03-18T10:00:00-03:00');
    await ocorrencia(ferramentaB, 'PERDA', '2001-03-20T10:00:00-03:00');
    await ocorrencia(ferramentaA, 'AVARIA', '2001-04-02T10:00:00-03:00'); // fora da janela

    // D ainda está em uso pelo empréstimo aberto; C vira indisponível por perda para o KPI instantâneo
    await query("UPDATE ferramentas SET status = 'indisponivel', motivo_indisponivel = 'perda' WHERE id = $1", [ferramentaC]);
  });

  afterAll(async () => {
    await query('DELETE FROM ocorrencias WHERE ferramenta_id = ANY($1::int[])', [ferramentas]);
    await query('DELETE FROM emprestimos WHERE ferramenta_id = ANY($1::int[])', [ferramentas]);
    await query('DELETE FROM ferramentas WHERE id = ANY($1::int[])', [ferramentas]);
    await query('DELETE FROM grupos_ferramentas WHERE id = $1', [categoriaId]);
  });

  describe('acesso', () => {
    it('401 sem token e 403 para consulta, em todas as rotas', async () => {
      for (const rota of [...ROTAS_COM_PERIODO.map((r) => `${r}?${MARCO}`), ...ROTAS_INSTANTANEAS]) {
        expect((await get(rota, null)).status, `${rota} sem token`).toBe(401);
        expect((await get(rota, 'consulta')).status, `${rota} consulta`).toBe(403);
      }
    });

    it('manutenção e admin passam', async () => {
      for (const papel of ['manutencao', 'admin']) {
        for (const rota of [...ROTAS_COM_PERIODO.map((r) => `${r}?${MARCO}`), ...ROTAS_INSTANTANEAS]) {
          expect((await get(rota, papel)).status, `${rota} ${papel}`).toBe(200);
        }
      }
    });
  });

  describe('filtros de/ate', () => {
    it('400 sem de, sem ate ou sem nenhum dos dois, em toda rota de período', async () => {
      for (const rota of ROTAS_COM_PERIODO) {
        for (const qs of ['', 'de=2001-03-01', 'ate=2001-03-31']) {
          const res = await get(`${rota}?${qs}`);
          expect(res.status, `${rota}?${qs}`).toBe(400);
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
        }
      }
    });

    it('400 para formato errado, data inexistente, de depois de ate e janela acima de 366 dias', async () => {
      const ruins = [
        'de=01/03/2001&ate=31/03/2001',
        'de=2001-3-1&ate=2001-3-31',
        'de=2001-02-30&ate=2001-03-31',
        'de=2001-13-01&ate=2001-12-31',
        'de=2001-03-31&ate=2001-03-01',
        'de=2001-01-01&ate=2002-01-02', // 367 dias
        'de=abc&ate=xyz',
      ];
      for (const qs of ruins) {
        const res = await get(`ferramentas-mais-retiradas?${qs}`);
        expect(res.status, qs).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(res.body.error.details.length).toBeGreaterThan(0);
      }
    });

    it('aceita de = ate (um dia) e a janela de 366 dias', async () => {
      expect((await get('ferramentas-mais-retiradas?de=2001-03-10&ate=2001-03-10')).status).toBe(200);
      expect((await get('ferramentas-mais-retiradas?de=2000-01-01&ate=2000-12-31')).status).toBe(200); // 2000 foi bissexto: 366 dias
      expect(diasNoPeriodo('2000-01-01', '2000-12-31')).toBe(366);
    });

    it('limit, agrupar e granularidade fora do aceito são 400', async () => {
      for (const qs of ['limit=0', 'limit=51', 'limit=abc']) {
        expect((await get(`ferramentas-mais-retiradas?${MARCO}&${qs}`)).status, qs).toBe(400);
        expect((await get(`categorias-mais-utilizadas?${MARCO}&${qs}`)).status, qs).toBe(400);
      }
      expect((await get(`tempo-medio-posse?${MARCO}&agrupar=setor`)).status).toBe(400);
      expect((await get(`taxa-avaria?${MARCO}&agrupar=setor`)).status).toBe(400);
      expect((await get(`evolucao?${MARCO}&granularidade=ano`)).status).toBe(400);
      expect((await get('emprestimos-abertos?limit=0')).status).toBe(400);
      expect((await get('emprestimos-abertos?limit=51')).status).toBe(400);
    });

    it('somarDias e diasNoPeriodo contam dias de calendário, inclusive na virada de mês e ano', () => {
      expect(somarDias('2001-03-01', -1)).toBe('2001-02-28');
      expect(somarDias('2001-01-01', -1)).toBe('2000-12-31');
      expect(diasNoPeriodo('2001-03-01', '2001-03-31')).toBe(31);
      expect(diasNoPeriodo('2001-03-10', '2001-03-10')).toBe(1);
    });
  });

  describe('uso', () => {
    it('ferramentas mais retiradas: conta pelo dia de Brasília e ordena da mais para a menos retirada', async () => {
      const res = await get(`ferramentas-mais-retiradas?${MARCO}`);
      expect(res.status).toBe(200);
      expect(res.body.data.periodo).toEqual({ de: '2001-03-01', ate: '2001-03-31' });
      const itens = res.body.data.itens;
      expect(itens.map((i: { ferramenta_nome: string }) => i.ferramenta_nome)).toEqual([`${PREFIXO}A`, `${PREFIXO}B`]);
      expect(itens[0]).toMatchObject({ ferramenta_id: ferramentaA, categoria_nome: `${PREFIXO}Categoria`, total_retiradas: 3 });
      expect(itens[1]).toMatchObject({ ferramenta_id: ferramentaB, total_retiradas: 2 }); // inclui a retirada de 31/03 às 23:30
      expect(itens[0]).toHaveProperty('codigo_identificacao');
    });

    it('respeita o limit', async () => {
      const res = await get(`ferramentas-mais-retiradas?${MARCO}&limit=1`);
      expect(res.body.data.itens).toHaveLength(1);
      expect(res.body.data.itens[0].ferramenta_id).toBe(ferramentaA);
    });

    it('período sem dados devolve lista vazia, não erro', async () => {
      const res = await get('ferramentas-mais-retiradas?de=1990-01-01&ate=1990-01-31');
      expect(res.status).toBe(200);
      expect(res.body.data.itens).toEqual([]);
    });

    it('categorias mais utilizadas soma as retiradas da categoria', async () => {
      const res = await get(`categorias-mais-utilizadas?${MARCO}`);
      expect(res.status).toBe(200);
      expect(res.body.data.itens).toEqual([
        { categoria_id: categoriaId, categoria_nome: `${PREFIXO}Categoria`, total_retiradas: 5 },
      ]);
    });

    it('tempo médio de posse por categoria (padrão) e por ferramenta, só devoluções do período', async () => {
      const categoria = await get(`tempo-medio-posse?${MARCO}`);
      expect(categoria.body.data.agrupar).toBe('categoria');
      // devoluções de março: 4h, 24h, 2h e 1h (a devolução de 01/04 fica de fora)
      expect(categoria.body.data.itens).toEqual([
        { categoria_id: categoriaId, categoria_nome: `${PREFIXO}Categoria`, total_devolucoes: 4, horas_medias: 7.75, dias_medios: 0.32 },
      ]);
      const ferramenta = await get(`tempo-medio-posse?${MARCO}&agrupar=ferramenta`);
      expect(ferramenta.body.data.itens).toEqual([
        expect.objectContaining({ ferramenta_id: ferramentaA, total_devolucoes: 3, horas_medias: 10, dias_medios: 0.42 }),
        expect.objectContaining({ ferramenta_id: ferramentaB, total_devolucoes: 1, horas_medias: 1, dias_medios: 0.04 }),
      ]);
    });
  });

  describe('avarias, perdas e taxa', () => {
    it('avarias por categoria contam só o tipo AVARIA aberto dentro do período', async () => {
      const res = await get(`avarias-por-categoria?${MARCO}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2); // a de 02/04 fica de fora
      expect(res.body.data.itens).toEqual([{ categoria_id: categoriaId, categoria_nome: `${PREFIXO}Categoria`, total: 2 }]);
    });

    it('perdas por categoria contam só o tipo PERDA', async () => {
      const res = await get(`perdas-por-categoria?${MARCO}`);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.itens).toEqual([{ categoria_id: categoriaId, categoria_nome: `${PREFIXO}Categoria`, total: 1 }]);
    });

    it('período sem ocorrência devolve total 0 e lista vazia', async () => {
      const res = await get('avarias-por-categoria?de=1990-01-01&ate=1990-01-31');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ total: 0, itens: [] });
    });

    it('taxa de avaria: avarias ÷ devoluções do período, por categoria e por ferramenta', async () => {
      const categoria = await get(`taxa-avaria?${MARCO}`);
      expect(categoria.body.data.itens).toEqual([
        expect.objectContaining({ categoria_id: categoriaId, total_devolucoes: 4, total_avarias: 1, taxa_avaria: 0.25, percentual: 25 }),
      ]);
      const ferramenta = await get(`taxa-avaria?${MARCO}&agrupar=ferramenta`);
      expect(ferramenta.body.data.itens).toEqual([
        expect.objectContaining({ ferramenta_id: ferramentaA, total_devolucoes: 3, total_avarias: 1, taxa_avaria: 0.3333, percentual: 33.33 }),
        expect.objectContaining({ ferramenta_id: ferramentaB, total_devolucoes: 1, total_avarias: 0, taxa_avaria: 0, percentual: 0 }),
      ]);
    });

    it('min_devolucoes tira do ranking os grupos com poucas devoluções antes do limit', async () => {
      const res = await get(`taxa-avaria?${MARCO}&agrupar=ferramenta&min_devolucoes=2`);
      expect(res.status).toBe(200);
      expect(res.body.data.itens).toEqual([expect.objectContaining({ ferramenta_id: ferramentaA, total_devolucoes: 3 })]);
      // o filtro vale antes do limit: com limit 1 e mínimo 2 ainda vem a A, e não uma lista vazia por B ter ficado de fora
      const limitado = await get(`taxa-avaria?${MARCO}&agrupar=ferramenta&min_devolucoes=2&limit=1`);
      expect(limitado.body.data.itens).toHaveLength(1);
      expect((await get(`taxa-avaria?${MARCO}&min_devolucoes=5`)).body.data.itens).toEqual([]);
      for (const ruim of ['0', '-1', 'abc']) {
        expect((await get(`taxa-avaria?${MARCO}&min_devolucoes=${ruim}`)).status, ruim).toBe(400);
      }
    });

    it('período sem devolução não divide por zero', async () => {
      const res = await get('taxa-avaria?de=1990-01-01&ate=1990-01-31');
      expect(res.status).toBe(200);
      expect(res.body.data.itens).toEqual([]);
    });
  });

  describe('instantâneos', () => {
    it('indisponíveis agora: total, percentual do parque e motivo', async () => {
      const res = await get('indisponiveis');
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.total_indisponiveis).toBeGreaterThanOrEqual(1);
      expect(d.total_cadastradas).toBeGreaterThanOrEqual(d.total_indisponiveis);
      expect(d.percentual_do_parque).toBeCloseTo((d.total_indisponiveis / d.total_cadastradas) * 100, 1);
      const perda = d.por_motivo.find((m: { motivo: string }) => m.motivo === 'perda');
      expect(perda.total).toBeGreaterThanOrEqual(1);
      expect(d.por_motivo.reduce((s: number, m: { total: number }) => s + m.total, 0)).toBe(d.total_indisponiveis);
    });

    it('empréstimos abertos agora: o mais antigo vem primeiro, atrasado, e sem dados de colaborador', async () => {
      const res = await get('emprestimos-abertos?limit=3');
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.total).toBeGreaterThanOrEqual(1);
      expect(d.atrasados).toBeGreaterThanOrEqual(1);
      expect(d.mais_antigos.length).toBeLessThanOrEqual(3);
      expect(d.mais_antigos[0]).toMatchObject({ emprestimo_id: emprestimoAbertoId, ferramenta_id: ferramentaD, categoria_nome: `${PREFIXO}Categoria` });
      expect(d.mais_antigos[0].dias_aberto).toBeGreaterThan(9000);
      expect(JSON.stringify(d)).not.toMatch(/colaborador|matricula/);
    });
  });

  describe('evolução', () => {
    it('por dia: série completa com zeros, totais, período anterior e variação', async () => {
      const res = await get(`evolucao?${MARCO}`);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.granularidade).toBe('dia');
      expect(d.serie).toHaveLength(31);
      expect(d.serie[0]).toEqual({ inicio: '2001-03-01', retiradas: 0, devolucoes: 0, ocorrencias: 0 });
      expect(d.serie.find((s: { inicio: string }) => s.inicio === '2001-03-10')).toMatchObject({ retiradas: 1, devolucoes: 1 });
      expect(d.serie[30]).toEqual({ inicio: '2001-03-31', retiradas: 1, devolucoes: 0, ocorrencias: 0 });
      expect(d.totais.atual).toEqual({ retiradas: 5, devolucoes: 4, ocorrencias: 3 });
      expect(d.periodo_anterior).toEqual({ de: '2001-01-29', ate: '2001-02-28' });
      expect(d.totais.anterior).toEqual({ retiradas: 1, devolucoes: 1, ocorrencias: 0 });
      // anterior sem ocorrência: não existe percentual
      expect(d.variacao_percentual).toEqual({ retiradas: 400, devolucoes: 300, ocorrencias: null });
      // os totais batem com a soma da série
      const soma = (campo: string) => d.serie.reduce((s: number, x: Record<string, number>) => s + x[campo], 0);
      expect([soma('retiradas'), soma('devolucoes'), soma('ocorrencias')]).toEqual([5, 4, 3]);
    });

    it('por semana (começa na segunda) e por mês', async () => {
      const semana = await get(`evolucao?${MARCO}&granularidade=semana`);
      expect(semana.body.data.serie.map((s: { inicio: string; retiradas: number }) => [s.inicio, s.retiradas])).toEqual([
        ['2001-02-26', 0],
        ['2001-03-05', 1],
        ['2001-03-12', 1],
        ['2001-03-19', 2],
        ['2001-03-26', 1],
      ]);
      const mes = await get(`evolucao?${MARCO}&granularidade=mes`);
      expect(mes.body.data.serie).toEqual([{ inicio: '2001-03-01', retiradas: 5, devolucoes: 4, ocorrencias: 3 }]);
    });

    it('período sem movimento: série de zeros e variação null', async () => {
      const res = await get('evolucao?de=1990-01-01&ate=1990-01-05');
      expect(res.status).toBe(200);
      expect(res.body.data.serie).toHaveLength(5);
      expect(res.body.data.totais.atual).toEqual({ retiradas: 0, devolucoes: 0, ocorrencias: 0 });
      expect(res.body.data.variacao_percentual).toEqual({ retiradas: null, devolucoes: null, ocorrencias: null });
    });
  });
});

// Colaboradores e setores que mais retiram: só admin (expõem pessoas). Dados próprios em maio de 2002, com
// colaboradores e setores criados aqui, para o ranking e a ordem não dependerem do que já existe no banco.
describe('KPIs de colaboradores e setores (#208)', () => {
  const PREFIXO_P = 'ZZTESTE_KPI208P_';
  const MAIO = 'de=2002-05-01&ate=2002-05-31';
  let setorX: number;
  let setorY: number;
  let colabP: number;
  let colabQ: number;
  let matriculaP: string;
  let matriculaQ: string;
  let ferramenta: number;
  let grupo: number;

  beforeAll(async () => {
    const usuarioId = (await query<{ id: number }>('SELECT id FROM usuarios ORDER BY id LIMIT 1')).rows[0].id;
    grupo = (await query<{ id: number }>('INSERT INTO grupos_ferramentas (nome) VALUES ($1) RETURNING id', [`${PREFIXO_P}Categoria`])).rows[0].id;
    setorX = (await query<{ id: number }>('INSERT INTO setores (nome) VALUES ($1) RETURNING id', [`${PREFIXO_P}Setor X`])).rows[0].id;
    setorY = (await query<{ id: number }>('INSERT INTO setores (nome) VALUES ($1) RETURNING id', [`${PREFIXO_P}Setor Y`])).rows[0].id;
    // matrícula tem 4 dígitos: pega duas livres no fim da faixa para não colidir com colaborador real
    const livres = (
      await query<{ m: string }>(
        `SELECT lpad(n::text, 4, '0') AS m FROM generate_series(9999, 9000, -1) n
          WHERE NOT EXISTS (SELECT 1 FROM colaboradores WHERE matricula = lpad(n::text, 4, '0')) LIMIT 2`
      )
    ).rows.map((r) => r.m);
    [matriculaP, matriculaQ] = livres;
    colabP = (await query<{ id: number }>('INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3) RETURNING id', [`${PREFIXO_P}Pessoa P`, matriculaP, setorX])).rows[0].id;
    colabQ = (await query<{ id: number }>('INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3) RETURNING id', [`${PREFIXO_P}Pessoa Q`, matriculaQ, setorY])).rows[0].id;
    ferramenta = (await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${PREFIXO_P}Ferramenta`, grupo])).rows[0].id;

    const retirar = (colaborador: number, setor: number, dia: string) =>
      query(
        `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, usuario_devolucao_id,
                                  data_retirada, previsao_devolucao, data_devolucao, condicao_devolucao)
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, 'ok')`,
        [ferramenta, colaborador, setor, usuarioId, `2002-05-${dia}T09:00:00-03:00`, `2002-05-${dia}T23:00:00-03:00`, `2002-05-${dia}T10:00:00-03:00`]
      );
    await retirar(colabP, setorX, '02');
    await retirar(colabP, setorX, '03');
    await retirar(colabP, setorX, '04');
    await retirar(colabP, setorY, '05'); // P retira para o setor Y: conta para P e para Y
    await retirar(colabQ, setorY, '06');
  });

  afterAll(async () => {
    await query('DELETE FROM emprestimos WHERE ferramenta_id IN (SELECT id FROM ferramentas WHERE nome LIKE $1)', [`${PREFIXO_P}%`]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO_P}%`]);
    await query('DELETE FROM colaboradores WHERE nome LIKE $1', [`${PREFIXO_P}%`]);
    await query('DELETE FROM setores WHERE nome LIKE $1', [`${PREFIXO_P}%`]);
    await query('DELETE FROM grupos_ferramentas WHERE nome LIKE $1', [`${PREFIXO_P}%`]);
  });

  it('só admin: manutenção e consulta recebem 403 e sem token 401', async () => {
    for (const rota of ['colaboradores-que-mais-retiram', 'setores-que-mais-retiram']) {
      expect((await get(`${rota}?${MAIO}`, null)).status, rota).toBe(401);
      expect((await get(`${rota}?${MAIO}`, 'manutencao')).status, rota).toBe(403);
      expect((await get(`${rota}?${MAIO}`, 'consulta')).status, rota).toBe(403);
      expect((await get(`${rota}?${MAIO}`, 'admin')).status, rota).toBe(200);
    }
  });

  it('exigem de/ate e validam limit, como os demais KPIs de período', async () => {
    for (const rota of ['colaboradores-que-mais-retiram', 'setores-que-mais-retiram']) {
      expect((await get(`${rota}`, 'admin')).status, rota).toBe(400);
      expect((await get(`${rota}?de=2002-05-01`, 'admin')).status, rota).toBe(400);
      expect((await get(`${rota}?de=2002-05-31&ate=2002-05-01`, 'admin')).status, rota).toBe(400);
      expect((await get(`${rota}?${MAIO}&limit=51`, 'admin')).status, rota).toBe(400);
    }
  });

  it('colaboradores que mais retiram: ordem, contagem, matrícula e setor de cadastro', async () => {
    const res = await get(`colaboradores-que-mais-retiram?${MAIO}`, 'admin');
    expect(res.body.data.periodo).toEqual({ de: '2002-05-01', ate: '2002-05-31' });
    expect(res.body.data.itens).toEqual([
      { colaborador_id: colabP, colaborador_nome: `${PREFIXO_P}Pessoa P`, matricula: matriculaP, setor_nome: `${PREFIXO_P}Setor X`, total_retiradas: 4 },
      { colaborador_id: colabQ, colaborador_nome: `${PREFIXO_P}Pessoa Q`, matricula: matriculaQ, setor_nome: `${PREFIXO_P}Setor Y`, total_retiradas: 1 },
    ]);
    const limitado = await get(`colaboradores-que-mais-retiram?${MAIO}&limit=1`, 'admin');
    expect(limitado.body.data.itens).toHaveLength(1);
  });

  it('setores que mais retiram: conta pelo setor de destino da retirada, não pelo cadastro de quem retirou', async () => {
    const res = await get(`setores-que-mais-retiram?${MAIO}`, 'admin');
    expect(res.body.data.itens).toEqual([
      { setor_id: setorX, setor_nome: `${PREFIXO_P}Setor X`, total_retiradas: 3 },
      { setor_id: setorY, setor_nome: `${PREFIXO_P}Setor Y`, total_retiradas: 2 }, // inclui a retirada de P para o setor Y
    ]);
  });

  it('período sem retirada devolve lista vazia', async () => {
    for (const rota of ['colaboradores-que-mais-retiram', 'setores-que-mais-retiram']) {
      const res = await get(`${rota}?de=1990-01-01&ate=1990-01-31`, 'admin');
      expect(res.status).toBe(200);
      expect(res.body.data.itens).toEqual([]);
    }
  });
});
