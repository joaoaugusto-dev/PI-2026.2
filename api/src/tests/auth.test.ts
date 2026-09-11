import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';

function gerarToken(payload: Record<string, unknown>, expiresIn: string | number = '1h') {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: expiresIn as any });
}

describe('GET /v1/auth/me', () => {
  it('retorna os dados do usuário logado quando o token é válido', async () => {
    const token = gerarToken({ id: 1, nome: 'Henrique', papel: 'almoxarife', email: 'henrique@soufer.com.br' });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.usuario).toMatchObject({ id: 1, nome: 'Henrique', papel: 'almoxarife' });
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
