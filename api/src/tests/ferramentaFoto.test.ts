import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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
    expect(url1).toMatch(/^\/uploads\/\d+-[\w-]+\.png$/);

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
