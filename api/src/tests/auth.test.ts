import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

function gerarToken(payload: Record<string, unknown>, expiresIn: string | number = '1h') {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: expiresIn as any });
}

describe('GET /v1/auth/me', () => {
  it('retorna os dados do usuário logado quando o token é válido', async () => {
    const {
      rows: [usuario],
    } = await query<{ id: number; nome: string; matricula: string }>(
      `SELECT u.id, c.nome, c.matricula
       FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id
       WHERE u.ativo = true AND c.ativo = true LIMIT 1`
    );
    const token = gerarToken({ id: usuario.id, nome: usuario.nome, papel: 'manutencao', matricula: usuario.matricula });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.usuario).toMatchObject({ id: usuario.id, nome: usuario.nome, papel: 'manutencao', matricula: usuario.matricula });
    expect(res.body.data.usuario).not.toHaveProperty('email');
  });

  it('devolve nome e matrícula do banco mesmo com token antigo (emitido com e-mail, sem matrícula)', async () => {
    const {
      rows: [usuario],
    } = await query<{ id: number; nome: string; matricula: string }>(
      `SELECT u.id, c.nome, c.matricula
       FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id
       WHERE u.ativo = true AND c.ativo = true LIMIT 1`
    );
    const token = gerarToken({ id: usuario.id, nome: 'Nome Antigo', papel: 'manutencao', email: 'antigo@soufer.com.br' });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.usuario).toEqual({
      id: usuario.id,
      nome: usuario.nome,
      papel: 'manutencao',
      matricula: usuario.matricula,
    });
  });

  it('retorna 401 TOKEN_OUTDATED para token antigo com o papel `almoxarife` (renomeado para manutencao)', async () => {
    const token = gerarToken({ id: 1, nome: 'Almoxarife Antigo', papel: 'almoxarife', email: 'antigo@soufer.com.br' });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_OUTDATED');
  });

  it('retorna 401 quando o usuário foi desativado após o token ter sido emitido', async () => {
    const token = gerarToken({ id: 999999, nome: 'Fantasma', papel: 'manutencao' });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('USER_INACTIVE');
  });

  it('retorna 401 quando nenhum token é enviado', async () => {
    const res = await request(app).get('/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
  });

  it('retorna 401 quando o header não está no formato "Bearer <token>"', async () => {
    const res = await request(app).get('/v1/auth/me').set('Authorization', 'Token abc123');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MALFORMATTED');
  });

  it('retorna 401 quando o token é inválido', async () => {
    const res = await request(app).get('/v1/auth/me').set('Authorization', 'Bearer token-invalido');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('retorna 401 quando o token está expirado', async () => {
    const token = gerarToken({ id: 1, nome: 'Henrique', papel: 'manutencao' }, -10);

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('POST /v1/auth/login (matrícula + senha)', () => {
  const login = (corpo: Record<string, unknown>) => request(app).post('/v1/auth/login').send(corpo);

  it('autentica com matrícula e senha e devolve token e usuário sem e-mail', async () => {
    const res = await login({ matricula: '0001', senha: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.usuario).toMatchObject({ matricula: '0001', papel: 'manutencao' });
    expect(res.body.data.usuario).not.toHaveProperty('email');

    const payload = jwt.verify(res.body.data.token, env.jwt.secret) as Record<string, unknown>;
    expect(payload).toMatchObject({ matricula: '0001', papel: 'manutencao' });
    expect(payload).not.toHaveProperty('email');
  });

  it('o token do login é aceito em /v1/auth/me', async () => {
    const { body } = await login({ matricula: '0001', senha: '123456' });

    const res = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.usuario.matricula).toBe('0001');
  });

  it('retorna 401 INVALID_CREDENTIALS para senha errada', async () => {
    const res = await login({ matricula: '0001', senha: 'senha-errada' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Matrícula ou senha inválidos');
  });

  it('retorna 401 INVALID_CREDENTIALS para matrícula sem conta', async () => {
    const res = await login({ matricula: '9998', senha: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('retorna 401 USER_INACTIVE quando o colaborador dono da conta está inativo', async () => {
    // Colaborador e conta próprios: alterar as linhas do seed derrubaria, em
    // paralelo, os tokens dos outros arquivos de teste que usam o id 1 ou 2.
    const matricula = '9101';
    const senhaHash = await bcrypt.hash('123456', 4);
    const {
      rows: [colaborador],
    } = await query<{ id: number }>(
      `INSERT INTO colaboradores (nome, matricula, setor_id, ativo)
       VALUES ('ZZTESTE Colaborador Inativo', $1, (SELECT id FROM setores ORDER BY id LIMIT 1), false)
       RETURNING id`,
      [matricula]
    );
    try {
      await query("INSERT INTO usuarios (colaborador_id, senha_hash, papel, ativo) VALUES ($1, $2, 'manutencao', true)", [
        colaborador.id,
        senhaHash,
      ]);

      const res = await login({ matricula, senha: '123456' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('USER_INACTIVE');
    } finally {
      await query('DELETE FROM usuarios WHERE colaborador_id = $1', [colaborador.id]);
      await query('DELETE FROM colaboradores WHERE id = $1', [colaborador.id]);
    }
  });

  it.each([
    ['com letras', 'MAT1'],
    ['com 5 dígitos', '12345'],
    ['com 3 dígitos', '123'],
    ['zerada', '0000'],
    ['com espaços', ' 0001 '],
    ['vazia', ''],
    ['numérica (não texto)', 1],
  ])('retorna 400 para matrícula %s', async (_descricao, matricula: string | number) => {
    const res = await login({ matricula, senha: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'matricula' })]));
  });

  it('retorna 400 quando a matrícula não é enviada (e-mail não é mais aceito)', async () => {
    const res = await login({ email: 'manutencao@soufer.com.br', senha: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'matricula' })]));
  });
});
