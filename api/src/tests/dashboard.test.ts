import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';

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

  it('retorna 401 sem token e 403 com papel consulta', async () => {
    expect((await request(app).get('/v1/dashboard')).status).toBe(401);
    expect((await request(app).get('/v1/dashboard').set('Authorization', `Bearer ${token('consulta')}`)).status).toBe(403);
  });
});
