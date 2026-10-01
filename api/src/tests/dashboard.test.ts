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

  it('cada lista do resumo traz no máximo 4 linhas e a rota :lista pagina o resto (15 por página)', async () => {
    const auth = { Authorization: `Bearer ${token('manutencao')}` };
    const nomes = ['cobrar_hoje', 'atrasados', 'proximos_do_prazo', 'indisponiveis'];
    const resumo = (await request(app).get('/v1/dashboard').set(auth)).body.data;
    const paginas = await Promise.all(nomes.map((n) => request(app).get(`/v1/dashboard/${n}`).set(auth)));
    nomes.forEach((nome, i) => {
      // outros testes mexem em empréstimos ao mesmo tempo: só se compara dentro de cada resposta, em que
      // total e linhas saem do mesmo snapshot do banco
      expect(resumo[nome].itens.length).toBeLessThanOrEqual(Math.min(4, resumo[nome].total));
      const pagina = paginas[i];
      expect(pagina.status).toBe(200);
      expect(pagina.body.meta).toEqual(expect.objectContaining({ page: 1, limit: 15 }));
      expect(pagina.body.data.length).toBe(Math.min(15, pagina.body.meta.total));
    });
  }, 20000);

  it('page e limit malformados ou fora do intervalo são 400, não 500', async () => {
    const auth = { Authorization: `Bearer ${token('manutencao')}` };
    for (const ruim of ['page=abc', 'page=0', 'page=-1', 'page=99999999999', 'page=1e20', 'limit=abc', 'limit=0', 'limit=51']) {
      expect((await request(app).get(`/v1/dashboard/atrasados?${ruim}`).set(auth)).status, ruim).toBe(400);
    }
    expect((await request(app).get('/v1/dashboard/atrasados?page=2&limit=50').set(auth)).status).toBe(200);
  });

  it('lista desconhecida é 400, página além do fim volta vazia e consulta é 403', async () => {
    const auth = { Authorization: `Bearer ${token('admin')}` };
    expect((await request(app).get('/v1/dashboard/qualquer').set(auth)).status).toBe(400);
    const alem = await request(app).get('/v1/dashboard/atrasados?page=9999').set(auth);
    expect(alem.status).toBe(200);
    expect(alem.body.data).toEqual([]);
    expect((await request(app).get('/v1/dashboard/atrasados').set({ Authorization: `Bearer ${token('consulta')}` })).status).toBe(403);
  });

  it('retorna 401 sem token e 403 com papel consulta', async () => {
    expect((await request(app).get('/v1/dashboard')).status).toBe(401);
    expect((await request(app).get('/v1/dashboard').set('Authorization', `Bearer ${token('consulta')}`)).status).toBe(403);
  });
});
