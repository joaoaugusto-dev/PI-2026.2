import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

const PREFIXO = 'ZZTESTE_ATIV_';

function gerarToken(papel = 'almoxarife') {
  return jwt.sign(
    { id: 1, nome: 'Test User', papel, email: 'test@soufer.com.br' },
    env.jwt.secret,
    { expiresIn: '1h' }
  );
}

describe('CRUD Atividades (/v1/atividades)', () => {
  const token = gerarToken('almoxarife');
  let ativ1Id: number;
  let ativ2Id: number;

  beforeAll(async () => {
    const res1 = await query<{ id: number }>(
      `INSERT INTO atividades (nome, descricao, ativo) VALUES ($1, $2, true) RETURNING id`,
      [`${PREFIXO}Manutenção de Motores`, 'Troca de escovas e rolamentos']
    );
    ativ1Id = res1.rows[0].id;

    const res2 = await query<{ id: number }>(
      `INSERT INTO atividades (nome, descricao, ativo) VALUES ($1, $2, true) RETURNING id`,
      [`${PREFIXO}Soldagem TIG`, 'Solda de precisão']
    );
    ativ2Id = res2.rows[0].id;
  });

  afterAll(async () => {
    await query(`DELETE FROM atividades WHERE nome LIKE $1`, [`${PREFIXO}%`]);
  });

  describe('GET /v1/atividades', () => {
    it('requer autenticação (retorna 401 sem token)', async () => {
      const res = await request(app).get('/v1/atividades');
      expect(res.status).toBe(401);
    });

    it('lista atividades ativas com paginação e formato padrão', async () => {
      const res = await request(app)
        .get('/v1/atividades')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((a: any) => a.id === ativ1Id)).toBe(true);
    });

    it('filtra atividades por busca textual q (nome ou descrição)', async () => {
      const res = await request(app)
        .get(`/v1/atividades?q=${PREFIXO}Soldagem`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(ativ2Id);
    });
  });

  describe('GET /v1/atividades/:id', () => {
    it('retorna os detalhes da atividade existente', async () => {
      const res = await request(app)
        .get(`/v1/atividades/${ativ1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ativ1Id);
      expect(res.body.data.nome).toBe(`${PREFIXO}Manutenção de Motores`);
      expect(res.body.data.descricao).toBe('Troca de escovas e rolamentos');
      expect(res.body.data.ativo).toBe(true);
    });

    it('retorna 404 quando a atividade não existe', async () => {
      const res = await request(app)
        .get('/v1/atividades/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /v1/atividades', () => {
    it('cria uma nova atividade com descrição opcional com sucesso', async () => {
      const res = await request(app)
        .post('/v1/atividades')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: `${PREFIXO}Corte a Laser`,
          descricao: 'Operação em chapas de aço inox',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.nome).toBe(`${PREFIXO}Corte a Laser`);
      expect(res.body.data.descricao).toBe('Operação em chapas de aço inox');
      expect(res.body.data.ativo).toBe(true);
    });

    it('cria atividade sem descrição com sucesso', async () => {
      const res = await request(app)
        .post('/v1/atividades')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Limpeza Técnica` });

      expect(res.status).toBe(201);
      expect(res.body.data.nome).toBe(`${PREFIXO}Limpeza Técnica`);
      expect(res.body.data.descricao).toBeNull();
    });

    it('rejeita criação com nome vazio (400)', async () => {
      const res = await request(app)
        .post('/v1/atividades')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 409 quando o nome da atividade já existe', async () => {
      const res = await request(app)
        .post('/v1/atividades')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Manutenção de Motores` });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('retorna 409 para duplicidade case-insensitive (maiúsculas/minúsculas)', async () => {
      const res = await request(app)
        .post('/v1/atividades')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}manutenção de motores`.toLowerCase() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });
  });

  describe('PUT / PATCH /v1/atividades/:id', () => {
    it('atualiza o nome e descrição da atividade via PUT', async () => {
      const res = await request(app)
        .put(`/v1/atividades/${ativ2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nome: `${PREFIXO}Soldagem TIG e MIG`,
          descricao: 'Solda de alta e média fusão',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.nome).toBe(`${PREFIXO}Soldagem TIG e MIG`);
      expect(res.body.data.descricao).toBe('Solda de alta e média fusão');
    });

    it('atualiza parcialmente via PATCH', async () => {
      const res = await request(app)
        .patch(`/v1/atividades/${ativ2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ descricao: 'Nova descrição rápida' });

      expect(res.status).toBe(200);
      expect(res.body.data.descricao).toBe('Nova descrição rápida');
      expect(res.body.data.nome).toBe(`${PREFIXO}Soldagem TIG e MIG`);
    });

    it('retorna 409 ao tentar atualizar para um nome que já existe', async () => {
      const res = await request(app)
        .put(`/v1/atividades/${ativ2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Manutenção de Motores` });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('retorna 404 ao tentar atualizar atividade inexistente', async () => {
      const res = await request(app)
        .put('/v1/atividades/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: `${PREFIXO}Inexistente` });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/atividades/:id (Exclusão Lógica)', () => {
    it('desativa a atividade (ativo = false) sem remover do banco', async () => {
      const res = await request(app)
        .delete(`/v1/atividades/${ativ1Id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ativ1Id);
      expect(res.body.data.ativo).toBe(false);

      const dbCheck = await query<{ ativo: boolean }>('SELECT ativo FROM atividades WHERE id = $1', [ativ1Id]);
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].ativo).toBe(false);
    });

    it('retorna 404 ao tentar desativar atividade inexistente', async () => {
      const res = await request(app)
        .delete('/v1/atividades/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
