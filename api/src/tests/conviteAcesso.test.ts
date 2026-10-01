import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

// O limite de 10/min por IP (conviteLimiter) travaria este arquivo, que faz dezenas de
// chamadas públicas; aqui ele vira passagem direta (o limiter em si é o mesmo do login).
vi.mock('../middlewares/rateLimit.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../middlewares/rateLimit.js')>()),
  conviteLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Convites de acesso: o admin gera o link, a pessoa define a senha e já entra logada.
// Matrículas 94xx e o prefixo de nome isolam o que o arquivo cria; tudo sai no afterAll.
const NOME = 'ZZTESTE_CONVITE';
const M_ADMIN = '9401';
const M_ALVO = '9402';
const M_INATIVO = '9403';
const M_RESET = '9404';
const M_BLOQ = '9405';
const TODAS = [M_ADMIN, M_ALVO, M_INATIVO, M_RESET, M_BLOQ];

describe('Convites de acesso', () => {
  let adminToken: string;
  let manutencaoToken: string;
  let alvoId: number;
  let inativoId: number;
  let resetId: number;
  let bloqId: number;

  const gerar = (id: number, token: string | null = adminToken) => {
    const req = request(app).post(`/v1/colaboradores/${id}/convite`);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };
  const abrir = (t: string) => request(app).get(`/v1/auth/convites/${t}`);
  const aceitar = (t: string, senha: string) => request(app).post(`/v1/auth/convites/${t}/senha`).send({ senha });

  beforeAll(async () => {
    const setorId = (await query<{ id: number }>('SELECT id FROM setores ORDER BY id LIMIT 1')).rows[0].id;
    const criar = async (matricula: string, ativo = true) =>
      (
        await query<{ id: number }>(
          'INSERT INTO colaboradores (nome, matricula, setor_id, ativo) VALUES ($1, $2, $3, $4) RETURNING id',
          [`${NOME}_${matricula}`, matricula, setorId, ativo]
        )
      ).rows[0].id;
    const adminColab = await criar(M_ADMIN);
    alvoId = await criar(M_ALVO);
    inativoId = await criar(M_INATIVO, false);
    resetId = await criar(M_RESET);
    bloqId = await criar(M_BLOQ);
    const adminUsuario = (
      await query<{ id: number }>("INSERT INTO usuarios (colaborador_id, senha_hash, papel) VALUES ($1, 'x', 'admin') RETURNING id", [adminColab])
    ).rows[0].id;
    adminToken = jwt.sign({ id: adminUsuario, papel: 'admin', matricula: M_ADMIN, nome: NOME }, env.jwt.secret, { expiresIn: '1h' });
    manutencaoToken = jwt.sign({ id: adminUsuario, papel: 'manutencao', matricula: M_ADMIN, nome: NOME }, env.jwt.secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await query("DELETE FROM auditoria WHERE tabela = 'colaboradores' AND operacao IN ('convite_criado', 'senha_definida') AND registro_id IN (SELECT id FROM colaboradores WHERE matricula = ANY($1))", [TODAS]);
    // usuarios.colaborador_id é RESTRICT: apaga as contas antes (os convites saem em cascata com o colaborador)
    await query('DELETE FROM usuarios WHERE colaborador_id IN (SELECT id FROM colaboradores WHERE matricula = ANY($1))', [TODAS]);
    await query('DELETE FROM colaboradores WHERE matricula = ANY($1)', [TODAS]);
  });

  it('só admin gera convite; colaborador inexistente ou inativo é 404', async () => {
    expect((await gerar(alvoId, null)).status).toBe(401);
    expect((await gerar(alvoId, manutencaoToken)).status).toBe(403);
    expect((await gerar(2147483647)).status).toBe(404);
    expect((await gerar(inativoId)).status).toBe(404);
  });

  it('fluxo completo: gera, abre, define a senha, já recebe a sessão e entra com a senha nova', async () => {
    const criado = await gerar(alvoId);
    expect(criado.status).toBe(201);
    const token: string = criado.body.data.token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // o banco guarda só o hash, nunca o token em claro
    const guardado = await query('SELECT 1 FROM convites_acesso WHERE token_hash = $1', [token]);
    expect(guardado.rows).toHaveLength(0);

    const aberto = await abrir(token);
    expect(aberto.status).toBe(200);
    expect(aberto.body.data).toEqual({ nome: `${NOME}_${M_ALVO}`, matricula: M_ALVO });

    const aceito = await aceitar(token, '482913');
    expect(aceito.status).toBe(200);
    expect(aceito.body.data.usuario).toMatchObject({ matricula: M_ALVO, papel: 'manutencao' });
    const sessao = await request(app).get('/v1/auth/me').set('Authorization', `Bearer ${aceito.body.data.token}`);
    expect(sessao.status).toBe(200);

    const login = await request(app).post('/v1/auth/login').send({ matricula: M_ALVO, senha: '482913' });
    expect(login.status).toBe(200);

    // link de uso único
    expect((await abrir(token)).status).toBe(404);
    expect((await aceitar(token, '111111')).status).toBe(404);
  });

  it('novo convite invalida o anterior ainda não usado', async () => {
    const primeiro = (await gerar(resetId)).body.data.token;
    const segundo = (await gerar(resetId)).body.data.token;
    expect((await abrir(primeiro)).status).toBe(404);
    expect((await abrir(segundo)).status).toBe(200);
  });

  it('serve para trocar a senha de quem já tem conta', async () => {
    const t1 = (await gerar(resetId)).body.data.token;
    await aceitar(t1, '111111');
    const t2 = (await gerar(resetId)).body.data.token;
    expect((await aceitar(t2, '222222')).status).toBe(200);
    expect((await request(app).post('/v1/auth/login').send({ matricula: M_RESET, senha: '111111' })).status).toBe(401);
    expect((await request(app).post('/v1/auth/login').send({ matricula: M_RESET, senha: '222222' })).status).toBe(200);
  });

  it('link expirado, forjado ou malformado é 404/400 sem revelar o motivo', async () => {
    const token = (await gerar(alvoId)).body.data.token;
    await query("UPDATE convites_acesso SET expira_em = NOW() - interval '1 minute' WHERE colaborador_id = $1", [alvoId]);
    expect((await abrir(token)).status).toBe(404);
    expect((await aceitar(token, '123456')).status).toBe(404);
    expect((await abrir('A'.repeat(43))).status).toBe(404);
    expect((await abrir('curto')).status).toBe(400);
  });

  it('400 para senha fora do padrão de 6 dígitos (e o convite continua valendo)', async () => {
    const token = (await gerar(alvoId)).body.data.token;
    for (const ruim of ['12345', '1234567', 'abcdef', '12 456']) {
      expect((await aceitar(token, ruim)).status).toBe(400);
    }
    expect((await abrir(token)).status).toBe(200);
  });

  it('bloqueia a conta após 5 senhas erradas e o link de acesso desbloqueia; ambos vão para a auditoria', async () => {
    const link = await gerar(bloqId);
    await aceitar(link.body.data.token, '123456');
    const login = (senha: string) => request(app).post('/v1/auth/login').send({ matricula: M_BLOQ, senha });
    for (let i = 0; i < 5; i++) expect((await login('000000')).status).toBe(401);
    const bloqueado = await login('123456'); // até a senha certa é recusada
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error.code).toBe('CONTA_BLOQUEADA');

    const novo = await gerar(bloqId);
    expect((await aceitar(novo.body.data.token, '654321')).status).toBe(200);
    expect((await login('654321')).status).toBe(200);

    const ops = await query<{ operacao: string }>(
      "SELECT operacao FROM auditoria WHERE tabela = 'colaboradores' AND registro_id = $1 AND operacao IN ('convite_criado', 'senha_definida')",
      [bloqId]
    );
    expect(ops.rows.map((r) => r.operacao).sort()).toEqual(['convite_criado', 'convite_criado', 'senha_definida', 'senha_definida']);
  });
});
