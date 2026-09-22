import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

const PREFIXO = 'ZZTESTE_OPC_';

function gerarToken(papel = 'almoxarife') {
  return jwt.sign(
    { id: 1, nome: 'Test User', papel, email: 'test@soufer.com.br' },
    env.jwt.secret,
    { expiresIn: '1h' }
  );
}

describe('GET /v1/opcoes (Opções combinadas)', () => {
  const token = gerarToken('almoxarife');
  let setorId: number;
  let catId: number;
  let ativId: number;

  beforeAll(async () => {
    const s = await query<{ id: number }>(
      `INSERT INTO setores (nome, ativo) VALUES ($1, true) RETURNING id`,
      [`${PREFIXO}SetorOpcao`]
    );
    setorId = s.rows[0].id;

    const c = await query<{ id: number }>(
      `INSERT INTO grupos_ferramentas (nome, ativo) VALUES ($1, true) RETURNING id`,
      [`${PREFIXO}CategoriaOpcao`]
    );
    catId = c.rows[0].id;

    const a = await query<{ id: number }>(
      `INSERT INTO atividades (nome, descricao, ativo) VALUES ($1, 'descricao de teste', true) RETURNING id`,
      [`${PREFIXO}AtividadeOpcao`]
    );
    ativId = a.rows[0].id;
  });

  afterAll(async () => {
    await query(`DELETE FROM setores WHERE id = $1`, [setorId]);
    await query(`DELETE FROM grupos_ferramentas WHERE id = $1`, [catId]);
    await query(`DELETE FROM atividades WHERE id = $1`, [ativId]);
  });

  it('requer autenticação (retorna 401 sem token)', async () => {
    const res = await request(app).get('/v1/opcoes');
    expect(res.status).toBe(401);
  });

  it('retorna setores, categorias e atividades ativas em um único payload estruturado', async () => {
    const res = await request(app)
      .get('/v1/opcoes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('setores');
    expect(res.body.data).toHaveProperty('categorias');
    expect(res.body.data).toHaveProperty('atividades');

    expect(Array.isArray(res.body.data.setores)).toBe(true);
    expect(Array.isArray(res.body.data.categorias)).toBe(true);
    expect(Array.isArray(res.body.data.atividades)).toBe(true);

    expect(res.body.data.setores.some((s: any) => s.id === setorId)).toBe(true);
    expect(res.body.data.categorias.some((c: any) => c.id === catId)).toBe(true);
    expect(res.body.data.atividades.some((a: any) => a.id === ativId)).toBe(true);
  });
});
