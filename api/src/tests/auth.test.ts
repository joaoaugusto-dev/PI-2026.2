import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

function gerarToken(payload: Record<string, unknown>, expiresIn: string | number = '1h') {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: expiresIn as any });
}

describe('GET /v1/auth/me', () => {
  it('retorna os dados do usuário logado quando o token é válido', async () => {
    const {
      rows: [usuario],
    } = await query<{ id: number; nome: string }>("SELECT id, nome FROM usuarios WHERE ativo = true LIMIT 1");
    const token = gerarToken({ id: usuario.id, nome: usuario.nome, papel: 'almoxarife', email: 'henrique@soufer.com.br' });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.usuario).toMatchObject({ id: usuario.id, nome: usuario.nome, papel: 'almoxarife' });
  });

  it('retorna 401 quando o usuário foi desativado após o token ter sido emitido', async () => {
    const token = gerarToken({ id: 999999, nome: 'Fantasma', papel: 'almoxarife' });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('USER_INACTIVE');
  });

  it('retorna 401 quando nenhum token é enviado', async () => {
    const res = await request(app).get('/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
  });

  it('retorna 401 quando o header não está no formato "Bearer <token>"', async () => {
    const res = await request(app).get('/v1/auth/me').set('Authorization', 'Token abc123');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MALFORMATTED');
  });

  it('retorna 401 quando o token é inválido', async () => {
    const res = await request(app).get('/v1/auth/me').set('Authorization', 'Bearer token-invalido');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('retorna 401 quando o token está expirado', async () => {
    const token = gerarToken({ id: 1, nome: 'Henrique', papel: 'almoxarife' }, -10);

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});
