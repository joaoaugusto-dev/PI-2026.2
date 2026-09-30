import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// GET /v1/consulta/ferramentas reaproveita o FerramentaController.listar já
// coberto por ferramentaService.test.ts — este arquivo cobre só o que é
// específico da rota: o isolamento de papel entre consulta e manutenção
// (Regra 8 do CLAUDE.md raiz). Nenhum dado é criado (não precisa reservar
// faixa de matrícula).
function gerarToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
}

describe('GET /v1/consulta/ferramentas (API-16)', () => {
  let manutencaoToken: string;
  let consultaToken: string;

  beforeAll(async () => {
    const usuarioId = (await query<{ id: number }>("SELECT id FROM usuarios WHERE papel = 'manutencao' LIMIT 1"))
      .rows[0].id;

    manutencaoToken = gerarToken({ id: usuarioId, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' });
    // authenticate só decodifica o JWT pra papel consulta (sem query no banco) —
    // não precisa existir colaborador real com essa matrícula/id.
    consultaToken = gerarToken({ id: 0, nome: 'Consulta Teste', papel: 'consulta', matricula: '9999' });
  });

  it('retorna 200 com token de consulta', async () => {
    const res = await request(app).get('/v1/consulta/ferramentas').set('Authorization', `Bearer ${consultaToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1 });
  });

  it('retorna 403 com token de manutenção (rota é exclusiva do papel consulta)', async () => {
    const res = await request(app).get('/v1/consulta/ferramentas').set('Authorization', `Bearer ${manutencaoToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/v1/consulta/ferramentas');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
  });

  it('retorna 403 com token de consulta em GET /v1/ferramentas (isolamento no sentido inverso)', async () => {
    const res = await request(app).get('/v1/ferramentas').set('Authorization', `Bearer ${consultaToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });
});
