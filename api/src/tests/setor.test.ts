import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

const PREFIXO = 'ZZTESTE_SETOR_';

function gerarToken(papel = 'almoxarife') {
  return jwt.sign(
    { id: 1, nome: 'Test User', papel, email: 'test@soufer.com.br' },
    env.jwt.secret,
    { expiresIn: '1h' }
  );
}

describe('CRUD Setores (/v1/setores)', () => {
  const token = gerarToken('almoxarife');
  let setor1Id: number;
  let setor2Id: number;

  beforeAll(async () => {
    const res1 = await query<{ id: number }>(
      `INSERT INTO setores (nome, ativo) VALUES ($1, true) RETURNING id`,
      [`${PREFIXO}Usinagem`]
    );
    setor1Id = res1.rows[0].id;

    const res2 = await query<{ id: number }>(
      `INSERT INTO setores (nome, ativo) VALUES ($1, true) RETURNING id`,
      [`${PREFIXO}Caldeiraria`]
    );
    setor2Id = res2.rows[0].id;
  });

  afterAll(async () => {
    await query(`DELETE FROM setores WHERE nome LIKE $1`, [`${PREFIXO}%`]);
  });

  describe('GET /v1/setores', () => {
    it('requer autenticação (retorna 401 sem token)', async () => {
      const res = await request(app).get('/v1/setores');
      expect(res.status).toBe(401);
    });

    it('lista setores ativos com paginação e formato padrão', async () => {
      const res = await request(app)
        .get('/v1/setores')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((s: any) => s.id === setor1Id)).toBe(true);
    });

    it('filtra setores por busca textual q', async () => {
      const res = await request(app)
        .get(`/v1/setores?q=${PREFIXO}Usinagem`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(setor1Id);
    });
  });

  describe('GET /v1/setores/:id', () => {
    it('retorna os detalhes do setor existente', async () => {
      const res = await request(app)
        .get(`/v1/setores/${setor1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(setor1Id);
      expect(res.body.data.nome).toBe(`${PREFIXO}Usinagem`);
      expect(res.body.data.ativo).toBe(true);
    });

    it('retorna 404 quando o setor não existe', async () => {
      const res = await request(app)
        .get('/v1/setores/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('retorna 400 quando o ID não é numérico', async () => {
      const res = await request(app)
        .get('/v1/setores/abc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/setores', () => {
    it('cria um novo setor com sucesso', async () => {
      const res = await request(app)
        .post('/v1/setores')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Pintura` });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.nome).toBe(`${PREFIXO}Pintura`);
      expect(res.body.data.ativo).toBe(true);
    });

    it('rejeita criação com nome vazio (400)', async () => {
      const res = await request(app)
        .post('/v1/setores')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 409 quando o nome do setor já existe', async () => {
      const res = await request(app)
        .post('/v1/setores')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Usinagem` });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('PUT / PATCH /v1/setores/:id', () => {
    it('atualiza o nome de um setor via PUT', async () => {
      const res = await request(app)
        .put(`/v1/setores/${setor2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Caldeiraria Pesada` });

      expect(res.status).toBe(200);
      expect(res.body.data.nome).toBe(`${PREFIXO}Caldeiraria Pesada`);
    });

    it('atualiza o setor via PATCH', async () => {
      const res = await request(app)
        .patch(`/v1/setores/${setor2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Caldeiraria Leve` });

      expect(res.status).toBe(200);
      expect(res.body.data.nome).toBe(`${PREFIXO}Caldeiraria Leve`);
    });

    it('retorna 409 ao tentar atualizar para um nome que já pertence a outro setor', async () => {
      const res = await request(app)
        .put(`/v1/setores/${setor2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Usinagem` });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('retorna 404 ao tentar atualizar setor inexistente', async () => {
      const res = await request(app)
        .put('/v1/setores/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Inexistente` });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/setores/:id (Exclusão Lógica)', () => {
    it('desativa o setor (ativo = false) sem deletar do banco', async () => {
      const res = await request(app)
        .delete(`/v1/setores/${setor1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(setor1Id);
      expect(res.body.data.ativo).toBe(false);

      // Verifica no banco de dados que o registro ainda existe
      const dbCheck = await query<{ ativo: boolean }>('SELECT ativo FROM setores WHERE id = $1', [setor1Id]);
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].ativo).toBe(false);
    });

    it('retorna 404 ao tentar desativar setor inexistente', async () => {
      const res = await request(app)
        .delete('/v1/setores/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
