import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';

const token = (papel: string) => jwt.sign({ id: 1, papel }, env.jwt.secret, { expiresIn: '1h' });
const get = (qs = '', papel: string | null = 'manutencao') => {
  const req = request(app).get(`/v1/emprestimos${qs}`);
  if (papel) req.set('Authorization', `Bearer ${token(papel)}`);
  return req;
};

describe('GET /v1/emprestimos (histórico)', () => {
  it('exige token e perfil manutencao', async () => {
    expect((await get('', null)).status).toBe(401);
    expect((await get('', 'consulta')).status).toBe(403);
  });

  it('pagina com meta e ordena do mais recente para o mais antigo', async () => {
    const res = await get('?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
    const datas = res.body.data.map((e: { data_retirada: string }) => +new Date(e.data_retirada));
    expect(datas).toEqual([...datas].sort((a, b) => b - a));
  });

  it('filtra por situação e rejeita valor inválido', async () => {
    const res = await get('?situacao=devolvido&limit=100');
    expect(res.status).toBe(200);
    expect(res.body.data.every((e: { situacao: string }) => e.situacao === 'devolvido')).toBe(true);
    expect((await get('?situacao=xyz')).status).toBe(400);
  });
});

describe('GET /v1/emprestimos — busca por patrimônio', () => {
  it('aceita SF000045, 000045 e 45 como o mesmo patrimônio', async () => {
    const [a, b, c] = await Promise.all(['SF000045', '000045', '45'].map((q) => get(`?q=${q}&limit=100`)));
    // "45" também casa por texto (nome, matrícula) e "SF000045" não: o total geral varia com os dados do
    // banco. O que tem de ser igual nas três formas é o conjunto de empréstimos do patrimônio 45.
    const doPatrimonio = (res: { body: { data: any[] } }) =>
      res.body.data
        .filter((e: { ferramenta_codigo: string }) => e.ferramenta_codigo === '000045')
        .map((e: { id: number }) => e.id)
        .sort((x: number, y: number) => x - y);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(200);
    expect(doPatrimonio(b)).toEqual(doPatrimonio(a));
    expect(doPatrimonio(c)).toEqual(doPatrimonio(a));
  });
});
