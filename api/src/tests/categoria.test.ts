import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

const PREFIXO = 'ZZTESTE_CAT_';

function gerarToken(usuarioId: number, papel = 'manutencao') {
  return jwt.sign(
    { id: usuarioId, nome: 'Test User', papel, matricula: '0001' },
    env.jwt.secret,
    { expiresIn: '1h' }
  );
}

describe('CRUD Categorias / Grupos de Ferramentas (/v1/categorias)', () => {
  let token: string;
  let cat1Id: number;
  let cat2Id: number;

  beforeAll(async () => {
    const usuario = await query<{ id: number }>(
      "SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo = true LIMIT 1"
    );
    token = gerarToken(usuario.rows[0].id);

    const res1 = await query<{ id: number }>(
      `INSERT INTO grupos_ferramentas (nome, ativo) VALUES ($1, true) RETURNING id`,
      [`${PREFIXO}Elétricas`]
    );
    cat1Id = res1.rows[0].id;

    const res2 = await query<{ id: number }>(
      `INSERT INTO grupos_ferramentas (nome, ativo) VALUES ($1, true) RETURNING id`,
      [`${PREFIXO}Manuais`]
    );
    cat2Id = res2.rows[0].id;
  });

  afterAll(async () => {
    await query(`DELETE FROM grupos_ferramentas WHERE nome LIKE $1`, [`${PREFIXO}%`]);
  });

  describe('GET /v1/categorias', () => {
    it('requer autenticação (retorna 401 sem token)', async () => {
      const res = await request(app).get('/v1/categorias');
      expect(res.status).toBe(401);
    });

    it('lista categorias ativas com paginação e formato padrão', async () => {
      const res = await request(app)
        .get('/v1/categorias')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c: any) => c.id === cat1Id)).toBe(true);
    });

    it('filtra categorias por busca textual q', async () => {
      const res = await request(app)
        .get(`/v1/categorias?q=${PREFIXO}Elétricas`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(cat1Id);
    });
  });

  describe('GET /v1/categorias/:id', () => {
    it('retorna os detalhes da categoria existente', async () => {
      const res = await request(app)
        .get(`/v1/categorias/${cat1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(cat1Id);
      expect(res.body.data.nome).toBe(`${PREFIXO}Elétricas`);
      expect(res.body.data.ativo).toBe(true);
    });

    it('retorna 404 quando a categoria não existe', async () => {
      const res = await request(app)
        .get('/v1/categorias/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /v1/categorias', () => {
    it('cria uma nova categoria com sucesso', async () => {
      const res = await request(app)
        .post('/v1/categorias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Pneumáticas` });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.nome).toBe(`${PREFIXO}Pneumáticas`);
      expect(res.body.data.ativo).toBe(true);
    });

    it('rejeita criação com nome vazio (400)', async () => {
      const res = await request(app)
        .post('/v1/categorias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 409 quando o nome da categoria já existe', async () => {
      const res = await request(app)
        .post('/v1/categorias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Elétricas` });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('retorna 409 para duplicidade case-insensitive (maiúsculas/minúsculas)', async () => {
      const res = await request(app)
        .post('/v1/categorias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}elétricas`.toLowerCase() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });
  });

  describe('PUT / PATCH /v1/categorias/:id', () => {
    it('atualiza o nome da categoria via PUT', async () => {
      const res = await request(app)
        .put(`/v1/categorias/${cat2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Manuais e Hidráulicas` });

      expect(res.status).toBe(200);
      expect(res.body.data.nome).toBe(`${PREFIXO}Manuais e Hidráulicas`);
    });

    it('atualiza a categoria via PATCH', async () => {
      const res = await request(app)
        .patch(`/v1/categorias/${cat2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Manuais em Geral` });

      expect(res.status).toBe(200);
      expect(res.body.data.nome).toBe(`${PREFIXO}Manuais em Geral`);
    });

    it('retorna 409 ao tentar atualizar para um nome já existente', async () => {
      const res = await request(app)
        .put(`/v1/categorias/${cat2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Elétricas` });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('retorna 404 ao tentar atualizar categoria inexistente', async () => {
      const res = await request(app)
        .put('/v1/categorias/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Inexistente` });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/categorias/:id (Exclusão Lógica)', () => {
    it('desativa a categoria (ativo = false) sem remover do banco', async () => {
      const res = await request(app)
        .delete(`/v1/categorias/${cat1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(cat1Id);
      expect(res.body.data.ativo).toBe(false);

      const dbCheck = await query<{ ativo: boolean }>('SELECT ativo FROM grupos_ferramentas WHERE id = $1', [cat1Id]);
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].ativo).toBe(false);
    });

    it('retorna 404 ao tentar desativar categoria inexistente', async () => {
      const res = await request(app)
        .delete('/v1/categorias/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
