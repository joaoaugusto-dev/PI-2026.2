import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import app from '../app.js';
import { consultaMatriculaLimiter } from '../middlewares/rateLimit.js';
import { errorHandler } from '../middlewares/errorHandler.js';

// Arquivo próprio: o contador do limite é por processo/módulo (mesmo motivo
// de consultaSessaoRateLimit.test.ts). Matrículas bem formadas e inexistentes
// (404), para não depender do seed e não bloquear colaborador real.
const abrirSessao = (identificador: string) => request(app).post('/v1/consulta/sessao').send({ identificador });

describe('Rate limit do quiosque por matrícula (5 falhas por minuto)', () => {
  it('a 6ª tentativa da mesma matrícula em um minuto devolve 429 e outra matrícula segue livre', async () => {
    const respostas: number[] = [];
    let ultima: request.Response | undefined;

    for (let i = 0; i < 6; i++) {
      ultima = await abrirSessao('9997');
      respostas.push(ultima.status);
    }

    expect(respostas.slice(0, 5).every((status) => status === 404)).toBe(true);
    expect(respostas[5]).toBe(429);
    expect(ultima!.body.error.code).toBe('TOO_MANY_REQUESTS');

    expect((await abrirSessao('9996')).status).toBe(404);
  });

  it('tentativa com formato inválido não gasta o limite da matrícula', async () => {
    for (let i = 0; i < 7; i++) {
      expect((await abrirSessao('99')).status).toBe(400);
    }
    expect((await abrirSessao('9995')).status).toBe(404);
  });

  it('sem matrícula no corpo (rota sem validate()), conta por IP e não cria contador global', async () => {
    const mini = express();
    mini.use(express.json());
    mini.post('/x', consultaMatriculaLimiter, (_req, res) => {
      res.status(404).json({});
    });
    mini.use(errorHandler);

    const respostas: number[] = [];
    for (let i = 0; i < 6; i++) {
      respostas.push((await request(mini).post('/x').send({ identificador: 123 })).status);
    }

    expect(respostas.slice(0, 5).every((status) => status === 404)).toBe(true);
    expect(respostas[5]).toBe(429);
    // a chave de uma matrícula informada é outra: não cai no mesmo contador do IP
    expect((await request(mini).post('/x').send({ identificador: '9994' })).status).toBe(404);
  });
});
