import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';

// o diretório de uploads é lido na importação: aponta para uma pasta temporária antes de tudo
const pasta = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? '/tmp'}/soufer-uploads-teste-${process.pid}`;
  process.env.UPLOADS_DIR = dir;
  return dir;
});

import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// PNG 1x1 válido
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
const PREFIXO = 'ZZTESTE_API_FOTO_';
const token = (papel: string) => jwt.sign({ id: 1, papel }, env.jwt.secret, { expiresIn: '1h' });

describe('PUT /v1/ferramentas/:id/foto', () => {
  let id: number;
  const put = (alvo: number | string, corpo: Buffer | string | undefined, tipo = 'image/png', papel: string | null = 'admin') => {
    const req = request(app).put(`/v1/ferramentas/${alvo}/foto`).set('Content-Type', tipo);
    if (papel) req.set('Authorization', `Bearer ${token(papel)}`);
    return req.send(corpo);
  };

  beforeAll(async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    id = (await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${PREFIXO}x`, grupoId])).rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('é só do admin (manutenção recebe 403)', async () => {
    expect((await put(id, PNG, 'image/png', 'manutencao')).status).toBe(403);
  });

  it('grava a foto, serve em /v1/uploads com CORP cross-origin e apaga a anterior ao trocar', async () => {
    const r1 = await put(id, PNG);
    expect(r1.status).toBe(200);
    const url1: string = r1.body.data.foto_url;
    expect(url1).toMatch(/^\/uploads\/\d+-[\w-]+\.webp$/);

    const arquivo = await request(app).get(`/v1${url1}`);
    expect(arquivo.status).toBe(200);
    expect(arquivo.headers['cross-origin-resource-policy']).toBe('cross-origin');

    const r2 = await put(id, PNG);
    expect(r2.body.data.foto_url).not.toBe(url1);
    expect(fs.existsSync(path.join(pasta, path.basename(url1)))).toBe(false);
    expect(fs.existsSync(path.join(pasta, path.basename(r2.body.data.foto_url)))).toBe(true);
  });

  it('400 quando o conteúdo não é imagem ou não há corpo', async () => {
    expect((await put(id, 'isto não é uma imagem de verdade, só texto')).status).toBe(400);
    expect((await put(id, undefined)).status).toBe(400);
    expect((await put(id, 'x', 'text/plain')).status).toBe(400);
  });

  it('413 acima de 5 MB', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 1)]);
    expect((await put(id, grande)).status).toBe(413);
  });

  it('401 sem token, 403 para consulta, 404 para ferramenta inexistente, 400 para id inválido', async () => {
    expect((await put(id, PNG, 'image/png', null)).status).toBe(401);
    expect((await put(id, PNG, 'image/png', 'consulta')).status).toBe(403);
    expect((await put(2147483647, PNG)).status).toBe(404);
    expect((await put('abc', PNG)).status).toBe(400);
  });
});

describe('processamento da foto', () => {
  it('reduz para 1280 px, converte para webp e 400 para imagem corrompida', async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    const id = (await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${PREFIXO}proc`, grupoId])).rows[0].id;
    const h = { Authorization: `Bearer ${token('admin')}` };
    try {
      const grande = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#c33' } }).jpeg().toBuffer();
      const r = await request(app).put(`/v1/ferramentas/${id}/foto`).set(h).set('Content-Type', 'image/jpeg').send(grande);
      expect(r.status).toBe(200);
      const meta = await sharp(path.join(pasta, path.basename(r.body.data.foto_url))).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['webp', 1280, 853]);

      const truncada = grande.subarray(0, 40); // cabeçalho JPEG válido, resto cortado
      expect((await request(app).put(`/v1/ferramentas/${id}/foto`).set(h).set('Content-Type', 'image/jpeg').send(truncada)).status).toBe(400);
    } finally {
      await query('DELETE FROM ferramentas WHERE id = $1', [id]);
    }
  });
});

describe('DELETE /v1/ferramentas/:id/foto e baixa', () => {
  let id: number;
  const auth = { Authorization: `Bearer ${token('admin')}` };
  const enviar = async () => {
    const r = await request(app).put(`/v1/ferramentas/${id}/foto`).set(auth).set('Content-Type', 'image/png').send(PNG);
    return path.join(pasta, path.basename(r.body.data.foto_url));
  };

  beforeAll(async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    id = (await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${PREFIXO}del`, grupoId])).rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  it('remove a foto: arquivo apagado e foto_url nulo', async () => {
    const arquivo = await enviar();
    expect(fs.existsSync(arquivo)).toBe(true);
    const r = await request(app).delete(`/v1/ferramentas/${id}/foto`).set(auth);
    expect(r.status).toBe(200);
    expect(r.body.data.foto_url).toBeNull();
    expect(fs.existsSync(arquivo)).toBe(false);
  });

  it('401 sem token, 403 para manutenção e 404 para ferramenta inexistente', async () => {
    expect((await request(app).delete(`/v1/ferramentas/${id}/foto`)).status).toBe(401);
    expect((await request(app).delete(`/v1/ferramentas/${id}/foto`).set('Authorization', `Bearer ${token('manutencao')}`)).status).toBe(403);
    expect((await request(app).delete('/v1/ferramentas/2147483647/foto').set(auth)).status).toBe(404);
  });

  it('baixar a ferramenta apaga o arquivo da foto', async () => {
    const arquivo = await enviar();
    expect((await request(app).delete(`/v1/ferramentas/${id}`).set(auth)).status).toBe(200);
    expect(fs.existsSync(arquivo)).toBe(false);
  });
});
