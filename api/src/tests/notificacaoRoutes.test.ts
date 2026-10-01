import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// Rotas de notificações (API-17). As notificações do teste são inseridas
// direto no banco com o prefixo abaixo e apagadas no afterAll.
const PREFIXO = 'ZZTESTE_API17_';

const gerarToken = (papel: string, id: number) =>
  jwt.sign({ id, nome: 'Teste', papel, matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' });

describe('Rotas de Notificações (API-17)', () => {
  let manutencaoToken: string;
  let consultaToken: string;
  let adminToken: string;
  let naoLidaId: number;
  let outroUsuarioId: number;
  let alheiaId: number;
  let naoLidasAntes: number[] = [];

  const get = (qs: string, token: string | null = manutencaoToken) => {
    const req = request(app).get(`/v1/notificacoes${qs}`);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };
  const patch = (id: number | string, token: string | null = manutencaoToken) => {
    const req = request(app).patch(`/v1/notificacoes/${id}/lida`);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };
  const inserir = async (usuarioId: number | null) =>
    (
      await query<{ id: number }>(
        "INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES ($1, 'sistema', $2, 'm', '/emprestimos') RETURNING id",
        [usuarioId, `${PREFIXO}titulo`]
      )
    ).rows[0].id;

  beforeAll(async () => {
    const usuarios = (await query<{ id: number }>('SELECT id FROM usuarios ORDER BY id LIMIT 2')).rows;
    manutencaoToken = gerarToken('manutencao', usuarios[0].id);
    consultaToken = gerarToken('consulta', usuarios[0].id);
    adminToken = gerarToken('admin', usuarios[0].id);
    outroUsuarioId = usuarios[1].id;
    // 'marcar todas' mexe nas notificações reais do banco; guarda quais estavam não lidas para restaurar
    naoLidasAntes = (await query<{ id: number }>('SELECT id FROM notificacoes WHERE lida = FALSE')).rows.map((n) => n.id);
    naoLidaId = await inserir(null);
    alheiaId = await inserir(outroUsuarioId);
  });

  afterAll(async () => {
    await query('DELETE FROM notificacoes WHERE titulo LIKE $1', [`${PREFIXO}%`]);
    await query('UPDATE notificacoes SET lida = FALSE WHERE id = ANY($1)', [naoLidasAntes]);
  });

  it('lista não lidas, com o contador em meta.total, sem as de outro usuário', async () => {
    const res = await get('?lida=false&limit=100');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((n: { id: number }) => n.id);
    expect(ids).toContain(naoLidaId);
    expect(ids).not.toContain(alheiaId);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('marca como lida e some do filtro lida=false', async () => {
    const res = await patch(naoLidaId);
    expect(res.status).toBe(200);
    expect(res.body.data.lida).toBe(true);
    const ids = (await get('?lida=false&limit=100')).body.data.map((n: { id: number }) => n.id);
    expect(ids).not.toContain(naoLidaId);
  });

  it('marca todas como lidas, menos as de outro usuário, e exige perfil manutencao', async () => {
    const extra = await inserir(null);
    const res = await request(app).patch('/v1/notificacoes/lida').set('Authorization', `Bearer ${manutencaoToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.atualizadas).toBeGreaterThanOrEqual(1);
    const lidas = await query<{ id: number; lida: boolean }>('SELECT id, lida FROM notificacoes WHERE id = ANY($1)', [[extra, alheiaId]]);
    expect(lidas.rows.find((n) => n.id === extra)?.lida).toBe(true);
    expect(lidas.rows.find((n) => n.id === alheiaId)?.lida).toBe(false);
    const proibido = await request(app).patch('/v1/notificacoes/lida').set('Authorization', `Bearer ${consultaToken}`);
    expect(proibido.status).toBe(403);
  });

  it('404 ao marcar notificação inexistente ou de outro usuário', async () => {
    expect((await patch(2147483647)).status).toBe(404);
    expect((await patch(alheiaId)).status).toBe(404);
  });

  it('400 para lida inválida e para id inválido', async () => {
    expect((await get('?lida=talvez')).status).toBe(400);
    expect((await patch('abc')).status).toBe(400);
  });

  it('admin também lista e marca como lida', async () => {
    const id = await inserir(null);
    expect((await get('?lida=false&limit=100', adminToken)).body.data.map((n: { id: number }) => n.id)).toContain(id);
    expect((await patch(id, adminToken)).status).toBe(200);
  });

  it('401 sem token e 403 para perfil consulta', async () => {
    expect((await get('', null)).status).toBe(401);
    expect((await get('', consultaToken)).status).toBe(403);
    expect((await patch(naoLidaId, consultaToken)).status).toBe(403);
  });
});
