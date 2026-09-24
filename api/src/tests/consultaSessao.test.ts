import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

const abrirSessao = (corpo: Record<string, unknown>) => request(app).post('/v1/consulta/sessao').send(corpo);

describe('POST /v1/consulta/sessao (quiosque: só matrícula, sem senha)', () => {
  it('abre a sessão de consulta com a matrícula de um colaborador ativo', async () => {
    const {
      rows: [colaborador],
    } = await query<{ nome: string; matricula: string }>(
      'SELECT nome, matricula FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1'
    );

    const res = await abrirSessao({ identificador: colaborador.matricula });

    expect(res.status).toBe(200);
    expect(res.body.data.colaborador).toMatchObject({ matricula: colaborador.matricula, papel: 'consulta' });
    const payload = jwt.verify(res.body.data.token, env.jwt.secret) as Record<string, unknown>;
    expect(payload).toMatchObject({ matricula: colaborador.matricula, papel: 'consulta' });
  });

  it('retorna 404 para matrícula válida sem colaborador', async () => {
    const res = await abrirSessao({ identificador: '9998' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COLABORADOR_NOT_FOUND');
  });

  it.each([
    ['com letras', 'MAT1'],
    ['com 5 dígitos', '12345'],
    ['com 3 dígitos', '123'],
    ['zerada', '0000'],
    ['com espaços', ' 0003 '],
    ['vazia', ''],
    ['numérica (não texto)', 3],
  ])('retorna 400 para matrícula %s', async (_descricao, identificador: string | number) => {
    const res = await abrirSessao({ identificador });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'identificador' })]));
  });
});
