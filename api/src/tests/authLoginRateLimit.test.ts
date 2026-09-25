import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// Arquivo próprio: o contador do limite é por processo/módulo (mesmo motivo
// de consultaSessaoRateLimit.test.ts), e este teste consome as 10 tentativas
// da rota real. Matrícula bem formada e senha errada: o loginLimiter vem
// depois do validate() na rota (ver authRoutes.ts), então só chega ao
// limitador quem passa da validação de formato.
describe('Rate limit do login (10 tentativas por minuto por IP)', () => {
  it('a 11ª tentativa com matrícula bem formada em um minuto devolve 429 TOO_MANY_REQUESTS', async () => {
    const respostas: number[] = [];
    let ultima: request.Response | undefined;

    for (let i = 0; i < 11; i++) {
      ultima = await request(app).post('/v1/auth/login').send({ matricula: '0001', senha: 'senha-errada' });
      respostas.push(ultima.status);
    }

    expect(respostas.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(respostas[10]).toBe(429);
    expect(ultima!.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(ultima!.headers['ratelimit-policy']).toContain('10');
  });
});
