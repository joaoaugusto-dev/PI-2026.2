import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import app from '../app.js';
import { criarLimiter } from '../middlewares/rateLimit.js';
import { errorHandler } from '../middlewares/errorHandler.js';

// Arquivo próprio: o contador do limite é por processo/módulo, e este teste
// consome as 30 tentativas da rota real.
describe('Rate limit do quiosque (30 tentativas por minuto por IP)', () => {
  it('a 31ª tentativa em um minuto devolve 429 TOO_MANY_REQUESTS', async () => {
    const respostas: number[] = [];
    let ultima: request.Response | undefined;

    for (let i = 0; i < 31; i++) {
      ultima = await request(app).post('/v1/consulta/sessao').send({ identificador: 'x' });
      respostas.push(ultima.status);
    }

    expect(respostas.slice(0, 30).every((status) => status === 400)).toBe(true);
    expect(respostas[30]).toBe(429);
    expect(ultima!.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(ultima!.headers['ratelimit-policy']).toContain('30');
  });
});

describe('criarLimiter', () => {
  it('bloqueia acima do máximo e responde no envelope de erro', async () => {
    const mini = express();
    mini.get('/x', criarLimiter({ windowMs: 60_000, max: 2, message: 'devagar' }), (_req, res) => {
      res.json({ ok: true });
    });
    mini.use(errorHandler);

    expect((await request(mini).get('/x')).status).toBe(200);
    expect((await request(mini).get('/x')).status).toBe(200);
    const bloqueada = await request(mini).get('/x');

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error).toMatchObject({ code: 'TOO_MANY_REQUESTS', message: 'devagar' });
  });
});
