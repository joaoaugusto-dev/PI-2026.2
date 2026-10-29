import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { getClient } from '../config/database.js';
import { atrasosNaConexao, emSnapshot, kpisNaConexao, obter } from '../services/dashboardService.js';

const token = (papel: string) => jwt.sign({ id: 1, nome: 'T', papel, matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' });

describe('GET /v1/dashboard', () => {
  it('traz as quatro listas de pendências (total + itens) para manutenção e admin', async () => {
    for (const papel of ['manutencao', 'admin']) {
      const res = await request(app).get('/v1/dashboard').set('Authorization', `Bearer ${token(papel)}`);
      expect(res.status).toBe(200);
      expect(res.body.data.kpis).toEqual(
        expect.objectContaining({ cadastradas: expect.any(Number), atrasadas: expect.any(Number), ocorrencias: expect.any(Number) })
      );
      for (const chave of ['cobrar_hoje', 'atrasados', 'proximos_do_prazo', 'indisponiveis']) {
        expect(res.body.data[chave]).toEqual({ total: expect.any(Number), itens: expect.any(Array) });
        expect(res.body.data[chave].itens.length).toBeLessThanOrEqual(res.body.data[chave].total);
      }
    }
  });

  it('cada lista do resumo traz no máximo 4 linhas e a rota :lista pagina o resto (15 por página)', async () => {
    const auth = { Authorization: `Bearer ${token('manutencao')}` };
    const nomes = ['cobrar_hoje', 'atrasados', 'proximos_do_prazo', 'indisponiveis'];
    const resumo = (await request(app).get('/v1/dashboard').set(auth)).body.data;
    const paginas = await Promise.all(nomes.map((n) => request(app).get(`/v1/dashboard/${n}`).set(auth)));
    nomes.forEach((nome, i) => {
      // outros testes mexem em empréstimos ao mesmo tempo: só se compara dentro de cada resposta, em que
      // total e linhas saem do mesmo snapshot do banco
      expect(resumo[nome].itens.length).toBeLessThanOrEqual(Math.min(4, resumo[nome].total));
      const pagina = paginas[i];
      expect(pagina.status).toBe(200);
      expect(pagina.body.meta).toEqual(expect.objectContaining({ page: 1, limit: 15 }));
      expect(pagina.body.data.length).toBe(Math.min(15, pagina.body.meta.total));
    });
  }, 20000);

  it('page e limit malformados ou fora do intervalo são 400, não 500', async () => {
    const auth = { Authorization: `Bearer ${token('manutencao')}` };
    for (const ruim of ['page=abc', 'page=0', 'page=-1', 'page=99999999999', 'page=1e20', 'limit=abc', 'limit=0', 'limit=51']) {
      expect((await request(app).get(`/v1/dashboard/atrasados?${ruim}`).set(auth)).status, ruim).toBe(400);
    }
    expect((await request(app).get('/v1/dashboard/atrasados?page=2&limit=50').set(auth)).status).toBe(200);
  });

  it('lista desconhecida é 400, página além do fim volta vazia e consulta é 403', async () => {
    const auth = { Authorization: `Bearer ${token('admin')}` };
    expect((await request(app).get('/v1/dashboard/qualquer').set(auth)).status).toBe(400);
    const alem = await request(app).get('/v1/dashboard/atrasados?page=9999').set(auth);
    expect(alem.status).toBe(200);
    expect(alem.body.data).toEqual([]);
    expect((await request(app).get('/v1/dashboard/atrasados').set({ Authorization: `Bearer ${token('consulta')}` })).status).toBe(403);
  });

  it('retorna 401 sem token e 403 com papel consulta', async () => {
    expect((await request(app).get('/v1/dashboard')).status).toBe(401);
    expect((await request(app).get('/v1/dashboard').set('Authorization', `Bearer ${token('consulta')}`)).status).toBe(403);
  });
});

describe('GET /v1/dashboard/kpis', () => {
  it('devolve os seis contadores para manutenção e admin e não confunde "kpis" com uma lista', async () => {
    for (const papel of ['manutencao', 'admin']) {
      const res = await request(app).get('/v1/dashboard/kpis').set('Authorization', `Bearer ${token(papel)}`);
      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data).sort()).toEqual(
        ['atrasadas', 'cadastradas', 'disponiveis', 'em_uso', 'indisponiveis', 'ocorrencias']
      );
      for (const valor of Object.values(res.body.data)) expect(valor).toEqual(expect.any(Number));
    }
  });

  it('os seis números batem com uma contagem direta nas tabelas', async () => {
    // a rota (kpisNaConexao) e a contagem manual leem a mesma transação REPEATABLE READ, então o retrato do banco
    // é um só e a igualdade é exigida sempre, mesmo com outros arquivos de teste gravando ao lado
    const client = await getClient();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const contar = async (sql: string) => Number((await client.query(sql)).rows[0].n);
      const rota = await kpisNaConexao(client);
      // contagem manual: as mesmas definições, escritas direto nas tabelas
      expect(rota).toEqual({
        cadastradas: await contar('SELECT COUNT(*) AS n FROM ferramentas WHERE ativo'),
        disponiveis: await contar("SELECT COUNT(*) AS n FROM ferramentas WHERE ativo AND status = 'disponivel'"),
        em_uso: await contar("SELECT COUNT(*) AS n FROM ferramentas WHERE ativo AND status = 'em_uso'"),
        indisponiveis: await contar("SELECT COUNT(*) AS n FROM ferramentas WHERE ativo AND status = 'indisponivel'"),
        atrasadas: await contar(
          `SELECT COUNT(*) AS n FROM emprestimos WHERE data_devolucao IS NULL
           AND (previsao_devolucao AT TIME ZONE 'America/Sao_Paulo')::date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date`
        ),
        ocorrencias: await contar("SELECT COUNT(*) AS n FROM ocorrencias WHERE status = 'aberta'"),
      });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('dados criados pelo teste mexem em cada contador na medida certa (transação isolada, desfeita no fim)', async () => {
    // REPEATABLE READ: a leitura de antes e a de depois enxergam o mesmo retrato do banco mais o que este teste
    // inseriu, então outros arquivos de teste gravando ao lado não atrapalham; o ROLLBACK não deixa nada para trás
    const client = await getClient();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const antes = await kpisNaConexao(client);

      const um = async (sql: string) => (await client.query<{ id: number }>(sql)).rows[0].id;
      const grupoId = await um('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1');
      const colaboradorId = await um('SELECT id FROM colaboradores LIMIT 1');
      const setorId = await um('SELECT id FROM setores ORDER BY id LIMIT 1');
      const usuarioId = await um('SELECT id FROM usuarios LIMIT 1');
      // código explícito e alto: a trigger que gera o código não é atômica e corre com os outros arquivos de teste
      let codigo = 9990;
      const ferramenta = (status: string, ativo = true) =>
        um(`INSERT INTO ferramentas (nome, grupo_id, status, ativo, codigo_identificacao)
            VALUES ('ZZTESTE_API18_${status}', ${grupoId}, '${status}', ${ativo}, ${codigo++}) RETURNING id`);

      await ferramenta('disponivel');
      await ferramenta('disponivel', false); // inativa: não entra em nenhum contador
      await ferramenta('indisponivel');
      const comEmprestimo = await ferramenta('disponivel');
      // retirada com previsão 3 dias atrás: a trigger passa a ferramenta para em_uso e o empréstimo é atrasado
      await client.query(
        `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, previsao_devolucao)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '3 days')`,
        [comEmprestimo, colaboradorId, setorId, usuarioId]
      );
      await client.query(
        `INSERT INTO ocorrencias (ferramenta_id, colaborador_id, tipo, descricao, registrada_por)
         VALUES ($1, $2, 'avaria', 'ocorrencia de teste', $3)`,
        [comEmprestimo, colaboradorId, usuarioId]
      );

      const depois = await kpisNaConexao(client);
      expect({
        cadastradas: depois.cadastradas - antes.cadastradas,
        disponiveis: depois.disponiveis - antes.disponiveis,
        em_uso: depois.em_uso - antes.em_uso,
        indisponiveis: depois.indisponiveis - antes.indisponiveis,
        atrasadas: depois.atrasadas - antes.atrasadas,
        ocorrencias: depois.ocorrencias - antes.ocorrencias,
      }).toEqual({ cadastradas: 3, disponiveis: 1, em_uso: 1, indisponiveis: 1, atrasadas: 1, ocorrencias: 1 });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  }, 20000);

  it('retorna 401 sem token e 403 com papel consulta', async () => {
    expect((await request(app).get('/v1/dashboard/kpis')).status).toBe(401);
    expect((await request(app).get('/v1/dashboard/kpis').set('Authorization', `Bearer ${token('consulta')}`)).status).toBe(403);
  });
});

describe('GET /v1/dashboard/atrasos', () => {
  it('traz um item por setor com atrasados, para manutenção e admin, e "atrasos" não é uma lista', async () => {
    for (const papel of ['manutencao', 'admin']) {
      const res = await request(app).get('/v1/dashboard/atrasos').set('Authorization', `Bearer ${token(papel)}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.any(Array));
      for (const item of res.body.data) {
        expect(item).toEqual({
          setor_id: expect.any(Number),
          setor_nome: expect.any(String),
          atrasados: expect.any(Number),
          maior_atraso_dias: expect.any(Number),
        });
        expect(item.atrasados).toBeGreaterThan(0);
        expect(item.maior_atraso_dias).toBeGreaterThan(0);
      }
    }
  });

  it('a soma dos setores é o kpis.atrasadas (mesmo snapshot)', async () => {
    const { soma, atrasadas } = await emSnapshot(async (client) => ({
      soma: (await atrasosNaConexao(client)).reduce((total, s) => total + s.atrasados, 0),
      atrasadas: (await kpisNaConexao(client)).atrasadas,
    }));
    expect(soma).toBe(atrasadas);
  });

  it('agrupa por setor de destino, conta cada atraso e acha o maior (transação isolada, desfeita no fim)', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const antes = await atrasosNaConexao(client);

      const um = async (sql: string) => (await client.query<{ id: number }>(sql)).rows[0].id;
      const grupoId = await um('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1');
      const colaboradorId = await um('SELECT id FROM colaboradores LIMIT 1');
      const usuarioId = await um('SELECT id FROM usuarios LIMIT 1');
      const setorId = (await um("INSERT INTO setores (nome) VALUES ('ZZTESTE_API18_setor') RETURNING id"));
      // código explícito e alto: a trigger que gera o código não é atômica e corre com os outros arquivos de teste
      let codigo = 9980;
      const retirada = async (diasAtras: number) => {
        const f = await um(
          `INSERT INTO ferramentas (nome, grupo_id, codigo_identificacao) VALUES ('ZZTESTE_API18_atraso', ${grupoId}, ${codigo++}) RETURNING id`
        );
        await client.query(
          `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, previsao_devolucao)
           VALUES ($1, $2, $3, $4, NOW() - $5 * INTERVAL '1 day')`,
          [f, colaboradorId, setorId, usuarioId, diasAtras]
        );
      };
      await retirada(3);
      await retirada(10);
      await retirada(-2); // previsão daqui a 2 dias: não é atraso

      const depois = await atrasosNaConexao(client);
      expect(depois.find((s) => s.setor_id === setorId)).toEqual({
        setor_id: setorId,
        setor_nome: 'ZZTESTE_API18_setor',
        atrasados: 2,
        maior_atraso_dias: 10,
      });
      // os demais setores ficam como estavam
      expect(depois.filter((s) => s.setor_id !== setorId)).toEqual(antes);
      // ordem: o setor com mais atrasos primeiro
      const contagens = depois.map((s) => s.atrasados);
      expect(contagens).toEqual([...contagens].sort((a, b) => b - a));
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  }, 20000);

  it('retorna 401 sem token e 403 com papel consulta', async () => {
    expect((await request(app).get('/v1/dashboard/atrasos')).status).toBe(401);
    expect((await request(app).get('/v1/dashboard/atrasos').set('Authorization', `Bearer ${token('consulta')}`)).status).toBe(403);
  });
});

describe('snapshot do dashboard', () => {
  it('contador de atrasadas e cartão de atrasados mostram o mesmo número (mesmo snapshot, mesma definição)', async () => {
    const painel = await obter();
    expect(painel.kpis.atrasadas).toBe(painel.atrasados.total);
  });

  it('devolve a conexão ao pool mesmo quando a consulta falha (25 falhas seguidas, com o pool em 20)', async () => {
    for (let i = 0; i < 25; i++) {
      await expect(emSnapshot((client) => client.query('SELECT * FROM tabela_que_nao_existe'))).rejects.toThrow();
    }
    // se alguma conexão tivesse vazado, o pool já teria esgotado e esta chamada estouraria o timeout
    await expect(emSnapshot((client) => client.query('SELECT 1 AS ok'))).resolves.toBeTruthy();
  }, 20000);

  it('um painel inteiro ocupa uma conexão: 25 painéis ao mesmo tempo (pool de 20) não esgotam o pool', async () => {
    const paineis = await Promise.all(Array.from({ length: 25 }, () => obter()));
    expect(paineis).toHaveLength(25);
  }, 30000);
});
