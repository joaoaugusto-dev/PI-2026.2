import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// Código de patrimônio na busca: zeros à esquerda e o prefixo SF das etiquetas antigas não importam.
const PREFIXO = 'ZZTESTE_CODIGO_';
const token = jwt.sign({ id: 1, nome: 'T', papel: 'manutencao', matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' });
const get = (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`);

describe('busca de ferramenta por código', () => {
  let id: number;
  let codigo: number;
  let seis: string;

  beforeAll(async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas LIMIT 1')).rows[0].id;
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
