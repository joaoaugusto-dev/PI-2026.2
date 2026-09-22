import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// Testes de rota (Vitest + Supertest) da API-09 (issue #45): identificação,
// cadastro rápido, edição, inativação e listagem de colaboradores. Prefixo
// isola os dados criados por este arquivo dos dados de seed (mesmo motivo do
// ferramentaService.test.ts), tudo removido no afterAll.
const PREFIXO = 'ZZTESTE_API09_';

function gerarToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
}

describe('Rotas de Colaboradores (API-09)', () => {
  let setorId: number;
  let usuarioId: number;
  let almoxarifeToken: string;
  let consultaToken: string;

  let colaboradorMatriculaId: number;
  let colaboradorNomeId: number;
  let colaboradorParaEditarId: number;
  let colaboradorParaInativarId: number;

  const matriculaExata = `${PREFIXO}MAT01`;
  const matriculaDuplicada = `${PREFIXO}MAT02`;

  beforeAll(async () => {
    setorId = (await query<{ id: number }>('SELECT id FROM setores LIMIT 1')).rows[0].id;
    usuarioId = (await query<{ id: number }>("SELECT id FROM usuarios WHERE papel = 'almoxarife' LIMIT 1")).rows[0]
      .id;

    almoxarifeToken = gerarToken({ id: usuarioId, nome: 'Almoxarife Teste', papel: 'almoxarife' });
    // authenticate só decodifica o JWT — não precisa existir colaborador real
    // com essa matrícula para testar autorização (mesmo padrão do authorize.test.ts).
    consultaToken = gerarToken({ id: usuarioId, nome: 'Consulta Teste', papel: 'consulta', matricula: 'MAT001' });

    const porMatricula = await query<{ id: number }>(
      `INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3) RETURNING id`,
      [`${PREFIXO}Colaborador Um`, matriculaExata, setorId]
    );
    colaboradorMatriculaId = porMatricula.rows[0].id;

    // Critério de aceite da issue #45: buscar "joao augusto" acha "João
    // Augusto" mesmo sem acento. matricula própria (não a do teste acima)
    // para não colidir com a busca por matrícula exata.
    const porNome = await query<{ id: number }>(
      `INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3) RETURNING id`,
      ['João Augusto', `${PREFIXO}MAT03`, setorId]
    );
    colaboradorNomeId = porNome.rows[0].id;

    const paraEditar = await query<{ id: number }>(
      `INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3) RETURNING id`,
      [`${PREFIXO}Colaborador Para Editar`, `${PREFIXO}MAT04`, setorId]
    );
    colaboradorParaEditarId = paraEditar.rows[0].id;

    const paraInativar = await query<{ id: number }>(
      `INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3) RETURNING id`,
      [`${PREFIXO}Colaborador Para Inativar`, `${PREFIXO}MAT05`, setorId]
    );
    colaboradorParaInativarId = paraInativar.rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM colaboradores WHERE matricula LIKE $1', [`${PREFIXO}%`]);
  });

  describe('GET /v1/colaboradores/identificar', () => {
    it('encontra por matrícula exata', async () => {
      const res = await request(app)
        .get(`/v1/colaboradores/identificar?termo=${matriculaExata}`)
        .set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(colaboradorMatriculaId);
    });

    it('encontra por nome, tolerante a acento (critério de aceite: "joao augusto" acha "João Augusto")', async () => {
      const res = await request(app)
        .get('/v1/colaboradores/identificar?termo=joao augusto')
        .set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(colaboradorNomeId);
      expect(res.body.data.nome).toBe('João Augusto');
    });

    it('retorna 404 quando não encontra nenhum colaborador para o termo', async () => {
      const res = await request(app)
        .get('/v1/colaboradores/identificar?termo=ZZINEXISTENTE9999XYZ')
        .set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COLABORADOR_NOT_FOUND');
    });

    it('retorna 400 quando o termo não é informado', async () => {
      const res = await request(app).get('/v1/colaboradores/identificar').set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 401 quando nenhum token é enviado', async () => {
      const res = await request(app).get(`/v1/colaboradores/identificar?termo=${matriculaExata}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
    });

    it('retorna 403 para o perfil consulta (rota é exclusiva do almoxarife)', async () => {
      const res = await request(app)
        .get(`/v1/colaboradores/identificar?termo=${matriculaExata}`)
        .set('Authorization', `Bearer ${consultaToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('POST /v1/colaboradores', () => {
    it('cadastra um colaborador com criado_por vindo do JWT, ignorando o corpo da requisição', async () => {
      const res = await request(app)
        .post('/v1/colaboradores')
        .set('Authorization', `Bearer ${almoxarifeToken}`)
        .send({
          nome: `${PREFIXO}Cadastro Rapido`,
          matricula: `${PREFIXO}MAT06`,
          setorId,
          criadoPor: 999999, // tentativa de forjar o autor — schema descarta chaves desconhecidas
          criado_por: 999999,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.nome).toBe(`${PREFIXO}Cadastro Rapido`);
      expect(res.body.data.matricula).toBe(`${PREFIXO}MAT06`);
      expect(res.body.data.criado_por).toBe(usuarioId);
      expect(res.body.data.ativo).toBe(true);
    });

    it('retorna 409 para matrícula duplicada', async () => {
      await request(app)
        .post('/v1/colaboradores')
        .set('Authorization', `Bearer ${almoxarifeToken}`)
        .send({ nome: `${PREFIXO}Primeiro`, matricula: matriculaDuplicada, setorId });

      const res = await request(app)
        .post('/v1/colaboradores')
        .set('Authorization', `Bearer ${almoxarifeToken}`)
        .send({ nome: `${PREFIXO}Segundo`, matricula: matriculaDuplicada, setorId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('retorna 400 quando falta campo obrigatório', async () => {
      const res = await request(app)
        .post('/v1/colaboradores')
        .set('Authorization', `Bearer ${almoxarifeToken}`)
        .send({ matricula: `${PREFIXO}MAT07`, setorId });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 401 quando nenhum token é enviado', async () => {
      const res = await request(app)
        .post('/v1/colaboradores')
        .send({ nome: `${PREFIXO}Sem Token`, matricula: `${PREFIXO}MAT08`, setorId });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
    });
  });

  describe('GET /v1/colaboradores/:id', () => {
    it('busca um colaborador pelo ID', async () => {
      const res = await request(app)
        .get(`/v1/colaboradores/${colaboradorMatriculaId}`)
        .set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(colaboradorMatriculaId);
    });

    it('retorna 404 quando o ID não existe', async () => {
      const res = await request(app).get('/v1/colaboradores/999999999').set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COLABORADOR_NOT_FOUND');
    });
  });

  describe('PATCH /v1/colaboradores/:id', () => {
    it('atualiza somente os campos informados', async () => {
      const res = await request(app)
        .patch(`/v1/colaboradores/${colaboradorParaEditarId}`)
        .set('Authorization', `Bearer ${almoxarifeToken}`)
        .send({ nome: `${PREFIXO}Colaborador Editado` });

      expect(res.status).toBe(200);
      expect(res.body.data.nome).toBe(`${PREFIXO}Colaborador Editado`);
      expect(res.body.data.matricula).toBe(`${PREFIXO}MAT04`);
    });

    it('retorna 404 quando o colaborador não existe', async () => {
      const res = await request(app)
        .patch('/v1/colaboradores/999999999')
        .set('Authorization', `Bearer ${almoxarifeToken}`)
        .send({ nome: 'x' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COLABORADOR_NOT_FOUND');
    });

    it('retorna 400 quando nenhum campo é informado', async () => {
      const res = await request(app)
        .patch(`/v1/colaboradores/${colaboradorParaEditarId}`)
        .set('Authorization', `Bearer ${almoxarifeToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /v1/colaboradores/:id', () => {
    it('inativa (ativo = false) em vez de apagar, e some da consulta por ID em seguida', async () => {
      const res = await request(app)
        .delete(`/v1/colaboradores/${colaboradorParaInativarId}`)
        .set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ativo).toBe(false);

      const depois = await request(app)
        .get(`/v1/colaboradores/${colaboradorParaInativarId}`)
        .set('Authorization', `Bearer ${almoxarifeToken}`);
      expect(depois.status).toBe(404);
    });

    it('retorna 404 quando o colaborador não existe', async () => {
      const res = await request(app)
        .delete('/v1/colaboradores/999999999')
        .set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COLABORADOR_NOT_FOUND');
    });
  });

  describe('GET /v1/colaboradores', () => {
    it('lista com busca textual e paginação no envelope { data, meta }', async () => {
      const res = await request(app)
        .get(`/v1/colaboradores?q=${PREFIXO}&page=1&limit=2`)
        .set('Authorization', `Bearer ${almoxarifeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 2 });
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
    });

    it('retorna 401 quando nenhum token é enviado', async () => {
      const res = await request(app).get('/v1/colaboradores');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
    });
  });
});
