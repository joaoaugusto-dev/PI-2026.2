import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

// Matrículas 92xx e nomes com prefixo isolam o que este arquivo cria do resto
// do banco (seed) — tudo é removido no afterAll.
const NOME = 'ZZTESTE_API149';
const M_ADMIN = '9201';
const M_MANUTENCAO = '9202';
const M_NOVO = '9203';
const M_INATIVO = '9204';
const M_COM_CONTA = '9205';
const M_APROVAR = '9206';
const M_NEGADO = '9207';
const M_LISTAGEM = '9208';
const M_LOGIN_PENDENTE = '9209';
const M_ESCALADA = '9210';
const TODAS = [
  M_ADMIN,
  M_MANUTENCAO,
  M_NOVO,
  M_INATIVO,
  M_COM_CONTA,
  M_APROVAR,
  M_NEGADO,
  M_LISTAGEM,
  M_LOGIN_PENDENTE,
  M_ESCALADA,
];
const SENHA = '123456';

function gerarToken(usuarioId: number, papel: string) {
  return jwt.sign({ id: usuarioId, nome: 'Test User', papel }, env.jwt.secret, { expiresIn: '1h' });
}

async function criarColaborador(matricula: string, ativo = true): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO colaboradores (nome, matricula, setor_id, ativo)
     VALUES ($1, $2, (SELECT id FROM setores ORDER BY id LIMIT 1), $3)
     RETURNING id`,
    [`${NOME} ${matricula}`, matricula, ativo]
  );
  return rows[0].id;
}

async function criarConta(matricula: string, papel: string, ativo: boolean): Promise<number> {
  const colaboradorId = await criarColaborador(matricula);
  const { rows } = await query<{ id: number }>(
    'INSERT INTO usuarios (colaborador_id, senha_hash, papel, ativo) VALUES ($1, $2, $3, $4) RETURNING id',
    [colaboradorId, await bcrypt.hash(SENHA, 4), papel, ativo]
  );
  return rows[0].id;
}

const registrar = (corpo: Record<string, unknown>) => request(app).post('/v1/auth/registro').send(corpo);

describe('Auto-cadastro da manutenção com aprovação por matrícula (API-149)', () => {
  let adminToken: string;
  let manutencaoToken: string;
  let manutencaoId: number;

  beforeAll(async () => {
    const adminId = await criarConta(M_ADMIN, 'admin', true);
    adminToken = gerarToken(adminId, 'admin');
    manutencaoId = await criarConta(M_MANUTENCAO, 'manutencao', true);
    manutencaoToken = gerarToken(manutencaoId, 'manutencao');

    await criarColaborador(M_NOVO);
    await criarColaborador(M_INATIVO, false);
    await criarConta(M_COM_CONTA, 'manutencao', true);
    await criarColaborador(M_LOGIN_PENDENTE);
    await criarColaborador(M_ESCALADA);
  });

  afterAll(async () => {
    await query(
      'DELETE FROM usuarios WHERE colaborador_id IN (SELECT id FROM colaboradores WHERE matricula = ANY($1))',
      [TODAS]
    );
    await query('DELETE FROM colaboradores WHERE matricula = ANY($1)', [TODAS]);
  });

  describe('POST /v1/auth/registro', () => {
    it('cria a conta inativa, com papel manutenção, nome do colaborador e sem token', async () => {
      const res = await registrar({ matricula: M_NOVO, senha: SENHA });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        nome: `${NOME} ${M_NOVO}`,
        matricula: M_NOVO,
        papel: 'manutencao',
        ativo: false,
      });
      expect(res.body.data).not.toHaveProperty('token');
      expect(res.body.data).not.toHaveProperty('senha_hash');
      expect(res.body.data).not.toHaveProperty('email');
    });

    it('ignora papel, ativo e nome enviados no corpo (sem escalada de privilégio)', async () => {
      const res = await registrar({ matricula: M_ESCALADA, senha: SENHA, papel: 'admin', ativo: true, nome: 'Outro Nome' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ nome: `${NOME} ${M_ESCALADA}`, papel: 'manutencao', ativo: false });
    });

    it('retorna 404 COLABORADOR_NOT_FOUND para matrícula sem colaborador', async () => {
      const res = await registrar({ matricula: '9998', senha: SENHA });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COLABORADOR_NOT_FOUND');
    });

    it('retorna 404 COLABORADOR_NOT_FOUND para colaborador inativo', async () => {
      const res = await registrar({ matricula: M_INATIVO, senha: SENHA });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COLABORADOR_NOT_FOUND');
    });

    it('retorna 409 MATRICULA_JA_CADASTRADA para matrícula que já tem conta', async () => {
      const res = await registrar({ matricula: M_COM_CONTA, senha: SENHA });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MATRICULA_JA_CADASTRADA');
    });

    it('retorna 400 para matrícula fora do padrão de 4 dígitos', async () => {
      const res = await registrar({ matricula: 'MAT1', senha: SENHA });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'matricula' })]));
    });

    it('retorna 400 para senha curta e para e-mail no lugar da matrícula', async () => {
      const curta = await registrar({ matricula: M_NOVO, senha: '123' });
      expect(curta.status).toBe(400);
      expect(curta.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'senha' })]));

      const email = await registrar({ email: 'x@soufer.com.br', senha: SENHA });
      expect(email.status).toBe(400);
      expect(email.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'matricula' })]));
    });

    it('conta recém-cadastrada não loga antes da aprovação (USER_INACTIVE)', async () => {
      await registrar({ matricula: M_LOGIN_PENDENTE, senha: SENHA });

      const res = await request(app).post('/v1/auth/login').send({ matricula: M_LOGIN_PENDENTE, senha: SENHA });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('USER_INACTIVE');
    });
  });

  describe('GET /v1/usuarios?ativo=false', () => {
    it('requer autenticação', async () => {
      const res = await request(app).get('/v1/usuarios?ativo=false');
      expect(res.status).toBe(401);
    });

    it('rejeita manutenção comum (apenas admin pode listar)', async () => {
      const res = await request(app).get('/v1/usuarios?ativo=false').set('Authorization', `Bearer ${manutencaoToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('admin lista os pendentes com nome e matrícula, sem e-mail nem hash de senha', async () => {
      const pendenteId = await criarConta(M_LISTAGEM, 'manutencao', false);

      const res = await request(app).get('/v1/usuarios?ativo=false').set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const pendente = res.body.data.find((u: any) => u.id === pendenteId);
      expect(pendente).toMatchObject({ nome: `${NOME} ${M_LISTAGEM}`, matricula: M_LISTAGEM, ativo: false });
      expect(res.body.data.every((u: any) => u.ativo === false)).toBe(true);
      expect(pendente).not.toHaveProperty('email');
      expect(pendente).not.toHaveProperty('senha_hash');
    });
  });

  describe('PATCH /v1/usuarios/:id/ativar', () => {
    it('rejeita manutenção comum (apenas admin pode aprovar)', async () => {
      const pendenteId = await criarConta(M_NEGADO, 'manutencao', false);

      const res = await request(app)
        .patch(`/v1/usuarios/${pendenteId}/ativar`)
        .set('Authorization', `Bearer ${manutencaoToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCESS_DENIED');
    });

    it('admin aprova o cadastro pendente e o login passa a funcionar', async () => {
      const pendenteId = await criarConta(M_APROVAR, 'manutencao', false);

      const ativar = await request(app)
        .patch(`/v1/usuarios/${pendenteId}/ativar`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(ativar.status).toBe(200);
      expect(ativar.body.data).toMatchObject({ id: pendenteId, matricula: M_APROVAR, ativo: true });

      const login = await request(app).post('/v1/auth/login').send({ matricula: M_APROVAR, senha: SENHA });
      expect(login.status).toBe(200);
      expect(login.body.data.token).toBeDefined();
    });

    it('retorna 404 para usuário inexistente', async () => {
      const res = await request(app).patch('/v1/usuarios/999999/ativar').set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('retorna 409 ao tentar aprovar um usuário já ativo', async () => {
      const res = await request(app)
        .patch(`/v1/usuarios/${manutencaoId}/ativar`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('USUARIO_JA_ATIVO');
    });
  });
});
