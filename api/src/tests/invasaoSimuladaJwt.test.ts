import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';

// API-19 (#78), "pronto quando": os dois testes de invasão simulada falham como esperado, ou seja,
// o sistema bloqueia certo. A varredura completa está em segurancaRotas.test.ts; aqui ficam os
// dois cenários da issue com os nomes que ela usa.

const assinar = (papel: string, expiresIn: number | string) =>
  jwt.sign({ id: 1, nome: 'Invasor Simulado', papel, matricula: '0001' }, env.jwt.secret, { expiresIn: expiresIn as any });

describe('Invasão simulada 1: token de consulta tentando acessar rota da manutenção', () => {
  const tokenConsulta = assinar('consulta', '15m');

  it.each([
    ['GET', '/v1/ferramentas'],
    ['POST', '/v1/emprestimos'],
    ['GET', '/v1/auditoria'],
  ])('%s %s devolve 403 ACCESS_DENIED', async (metodo, url) => {
    const res = await (request(app) as any)[metodo.toLowerCase()](url).set('Authorization', `Bearer ${tokenConsulta}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });
});

describe('Invasão simulada 2: token vencido em rota da manutenção', () => {
  it.each(['manutencao', 'admin', 'consulta'])('token vencido de %s devolve 401 TOKEN_EXPIRED', async (papel) => {
    const res = await request(app).get('/v1/ferramentas').set('Authorization', `Bearer ${assinar(papel, -10)}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('o mesmo token, antes de vencer, não é barrado por expiração (o 401 vem mesmo do prazo)', async () => {
    const res = await request(app).get('/v1/ferramentas').set('Authorization', `Bearer ${assinar('consulta', '15m')}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).not.toBe('TOKEN_EXPIRED');
  });
});
