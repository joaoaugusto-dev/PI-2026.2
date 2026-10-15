import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// o diretório é lido na importação: aponta para uma pasta temporária antes de tudo
const pasta = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? process.env.TEMP ?? process.env.TMP ?? '/tmp'}/soufer-avarias-teste-${process.pid}`;
  process.env.AVARIAS_DIR = dir;
  return dir;
});

import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
const PREFIXO = 'ZZTESTE_API_FOTO_OCOR_';
const token = (papel: string) => jwt.sign({ id: 1, papel }, env.jwt.secret, { expiresIn: '1h' });

describe('PUT /v1/ocorrencias/:id/foto', () => {
  let id: number;
  const put = (alvo: number | string, corpo: Buffer | string | undefined, tipo = 'image/png', papel = 'manutencao') =>
    request(app).put(`/v1/ocorrencias/${alvo}/foto`).set('Content-Type', tipo).set('Authorization', `Bearer ${token(papel)}`).send(corpo);

  beforeAll(async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    const ferramentaId = (await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${PREFIXO}x`, grupoId])).rows[0].id;
    const usuarioId = (await query<{ id: number }>("SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo = true ORDER BY id LIMIT 1")).rows[0].id;
    id = (
      await query<{ id: number }>(
        "INSERT INTO ocorrencias (ferramenta_id, tipo, descricao, registrada_por) VALUES ($1, 'AVARIA', 'x', $2) RETURNING id",
        [ferramentaId, usuarioId]
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM ocorrencias WHERE ferramenta_id IN (SELECT id FROM ferramentas WHERE nome LIKE $1)', [`${PREFIXO}%`]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('sem token recebe 401; consulta recebe 403', async () => {
    expect((await request(app).put(`/v1/ocorrencias/${id}/foto`).set('Content-Type', 'image/png').send(PNG)).status).toBe(401);
    expect((await put(id, PNG, 'image/png', 'consulta')).status).toBe(403);
  });

  it('recusa imagem acima de 5 MB (413)', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    expect((await put(id, grande)).status).toBe(413);
  });

  it('grava em pasta própria, serve em /v1/uploads/avarias e apaga a anterior ao trocar', async () => {
    const r1 = await put(id, PNG);
    expect(r1.status).toBe(200);
    const url1: string = r1.body.data.foto_url;
    expect(url1).toMatch(/^\/uploads\/avarias\/\d+-[\w-]+\.webp$/);
    expect((await request(app).get(`/v1${url1}`)).status).toBe(200);

    const r2 = await put(id, PNG);
    expect(r2.body.data.foto_url).not.toBe(url1);
    expect((await request(app).get(`/v1${url1}`)).status).toBe(404);
  });

  it('recusa corpo que não é imagem (400) e ocorrência inexistente (404)', async () => {
    expect((await put(id, Buffer.from('não sou imagem, mas tenho mais de doze bytes'), 'image/png')).status).toBe(400);
    expect((await put(2147483000, PNG)).status).toBe(404);
  });
});

describe('foto da ocorrência aberta pela devolução', () => {
  let usuarioId: number;
  let ferramentaId: number;
  let emprestimoId: number;
  const PREF = 'ZZTESTE_API_FOTO_DEV_';

  beforeAll(async () => {
    usuarioId = (await query<{ id: number }>("SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo = true ORDER BY id LIMIT 1")).rows[0].id;
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    const colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1')).rows[0].id;
    const setorId = (await query<{ id: number }>('SELECT id FROM setores WHERE ativo = true ORDER BY id LIMIT 1')).rows[0].id;
    ferramentaId = (await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${PREF}x`, grupoId])).rows[0].id;
    emprestimoId = (
      await query<{ id: number }>(
        `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, previsao_devolucao, usuario_retirada_id)
         VALUES ($1, $2, $3, NOW() + INTERVAL '2 days', $4) RETURNING id`,
        [ferramentaId, colaboradorId, setorId, usuarioId]
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM ocorrencias WHERE ferramenta_id = $1', [ferramentaId]);
    await query('DELETE FROM emprestimos WHERE ferramenta_id = $1', [ferramentaId]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREF}%`]);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  const comToken = (papel: string, id = usuarioId) => `Bearer ${jwt.sign({ id, papel }, env.jwt.secret, { expiresIn: '1h' })}`;

  it('a devolução com avaria devolve ocorrencia_id e a foto aparece em /v1/emprestimos', async () => {
    const dev = await request(app)
      .patch(`/v1/emprestimos/${emprestimoId}/devolucao`)
      .set('Authorization', comToken('manutencao'))
      .send({ condicaoDevolucao: 'avaria', observacaoDevolucao: 'cabo partido' });
    expect(dev.status).toBe(200);
    const ocorrenciaId: number = dev.body.data.ocorrencia_id;
    expect(ocorrenciaId).toEqual(expect.any(Number));

    const foto = await request(app)
      .put(`/v1/ocorrencias/${ocorrenciaId}/foto`)
      .set('Content-Type', 'image/png')
      .set('Authorization', comToken('manutencao'))
      .send(PNG);
    expect(foto.status).toBe(200);

    const lista = await request(app).get(`/v1/emprestimos?q=${PREF}x`).set('Authorization', comToken('manutencao'));
    expect(lista.body.data[0].foto_ocorrencia_url).toBe(foto.body.data.foto_url);
  });

  it('o perfil consulta não acessa histórico nem ocorrências (nenhum foto_url chega a ele)', async () => {
    for (const rota of ['/v1/emprestimos', '/v1/ocorrencias', `/v1/ferramentas/${ferramentaId}/historico`]) {
      expect((await request(app).get(rota).set('Authorization', comToken('consulta'))).status).toBe(403);
    }
  });
});
