import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { getClient, query } from '../config/database.js';

// Código de patrimônio na busca: zeros à esquerda e o prefixo SF das etiquetas antigas não importam.
const PREFIXO = 'ZZTESTE_CODIGO_';
const token = jwt.sign({ id: 1, nome: 'T', papel: 'manutencao', matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' });
const get = (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`);

describe('busca de ferramenta por código', () => {
  let id: number;
  let codigo: number;
  let seis: string;

  beforeAll(async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    const r = await query<{ id: number; codigo_identificacao: number }>(
      'INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id, codigo_identificacao',
      [`${PREFIXO}Furadeira`, grupoId]
    );
    ({ id, codigo_identificacao: codigo } = r.rows[0]);
    seis = String(codigo).padStart(6, '0');
  });

  afterAll(async () => {
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
  });

  it('por-codigo aceita o número, com zeros à esquerda e com o prefixo SF', async () => {
    for (const forma of [String(codigo), seis, `SF${seis}`, `sf${seis}`]) {
      const res = await get(`/v1/ferramentas/por-codigo/${forma}`);
      expect(res.status, forma).toBe(200);
      expect(res.body.data.id).toBe(id);
    }
  });

  it('por-codigo recusa texto em branco, fora da faixa e não numérico com 400', async () => {
    for (const ruim of ['%20', '0', '10000', '99999', 'abc']) {
      expect((await get(`/v1/ferramentas/por-codigo/${ruim}`)).status, ruim).toBe(400);
    }
    const branco = await get('/v1/ferramentas/por-codigo/%20');
    expect(branco.body.error.details[0].message).toBe('Código deve ser um número');
  });

  it('a listagem (q) acha pelo código em qualquer das formas', async () => {
    for (const forma of [String(codigo), seis, `SF${seis}`]) {
      const res = await get(`/v1/ferramentas?q=${forma}&limit=100`);
      expect(res.status, forma).toBe(200);
      expect(res.body.data.some((f: { id: number }) => f.id === id), forma).toBe(true);
    }
  });

  it('número com 5 ou mais dígitos não é código: vira só busca por texto, sem erro', async () => {
    const res = await get('/v1/ferramentas?q=12345&limit=100');
    expect(res.status).toBe(200);
    expect(res.body.data.some((f: { id: number }) => f.id === id)).toBe(false);
  });
});

// Carga em lote (POST /v1/importacoes roda tudo numa transação): cada linha precisa de um código próprio.
// O ganho de desempenho da 0011 só aparece com a estatística de banco recém-criado, que a suíte não
// reproduz; a medição antes x depois está em docs/testes/ (auditoria de prontidão).
describe('geração do código na carga em lote', () => {
  it('300 ferramentas numa transação ganham códigos distintos', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const grupoId = (await client.query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
      const r = await client.query<{ codigo_identificacao: number }>(
        `INSERT INTO ferramentas (nome, grupo_id)
         SELECT '${PREFIXO}lote ' || g, $1 FROM generate_series(1, 300) g
         RETURNING codigo_identificacao`,
        [grupoId]
      );
      expect(new Set(r.rows.map((x) => x.codigo_identificacao)).size).toBe(300);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});

// Cadastros simultâneos (duas pessoas cadastrando ao mesmo tempo, cada requisição na sua conexão): o advisory
// lock de fn_gera_codigo_identificacao (migration 0005) tem de serializar a escolha do menor código livre.
// Sem ele, duas inserções escolhem o mesmo número e uma falha em uq_ferramenta_codigo_ativo (issue #170).
describe('geração do código com cadastros simultâneos', () => {
  afterAll(async () => {
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}simultanea%`]);
  });

  it('12 inserções em paralelo, cada uma na sua conexão, recebem códigos distintos e nenhuma falha', async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    const inserir = (n: number) =>
      query<{ codigo_identificacao: number }>(
        'INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING codigo_identificacao',
        [`${PREFIXO}simultanea ${n}`, grupoId]
      );

    const resultados = await Promise.allSettled(Array.from({ length: 12 }, (_, n) => inserir(n)));

    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(0);
    const codigos = resultados.map((r) => (r as PromiseFulfilledResult<{ rows: { codigo_identificacao: number }[] }>).value.rows[0].codigo_identificacao);
    expect(new Set(codigos).size).toBe(12);
  });
});
