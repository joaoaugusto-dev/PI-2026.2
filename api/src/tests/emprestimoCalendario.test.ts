import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

const token = (papel: string) => jwt.sign({ id: 1, papel }, env.jwt.secret, { expiresIn: '1h' });
const get = (qs: string, papel: string | null = 'manutencao') => {
  const req = request(app).get(`/v1/emprestimos/calendario${qs}`);
  if (papel) req.set('Authorization', `Bearer ${token(papel)}`);
  return req;
};

describe('GET /v1/emprestimos/calendario (API-17)', () => {
  it('exige token e perfil manutencao', async () => {
    expect((await get('?mes=2026-10', null)).status).toBe(401);
    expect((await get('?mes=2026-10', 'consulta')).status).toBe(403);
  });

  it('400 sem mes ou com mes fora do formato', async () => {
    expect((await get('')).status).toBe(400);
    expect((await get('?mes=2026-13')).status).toBe(400);
    expect((await get('?mes=10/2026')).status).toBe(400);
  });

  it('agrupa por dia as devoluções abertas do mês, em ordem, com o formato do front', async () => {
    const abertos = (
      await query<{ mes: string }>(
        `SELECT TO_CHAR(previsao_devolucao AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes
         FROM emprestimos WHERE data_devolucao IS NULL LIMIT 1`
      )
    ).rows;
    if (abertos.length === 0) return; // sem empréstimo aberto no banco de teste, nada a agrupar
    const res = await get(`?mes=${abertos[0].mes}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const dias: string[] = res.body.data.map((d: { dia: string }) => d.dia);
    expect(dias).toEqual([...dias].sort());
    expect(new Set(dias).size).toBe(dias.length);
    for (const dia of dias) expect(dia.startsWith(abertos[0].mes)).toBe(true);
    const item = res.body.data[0].emprestimos[0];
    expect(item).toMatchObject({ ramal: null });
    expect(item.ferramenta_codigo).toMatch(/^SF\d{6}$|^—$/);
  });

  it('mês sem devoluções devolve lista vazia', async () => {
    const res = await get('?mes=1999-01');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
