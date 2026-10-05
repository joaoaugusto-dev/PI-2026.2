import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { logger } from '../middlewares/logger.js';

// GET /v1/consulta/ferramentas reaproveita o FerramentaController.listar já
// coberto por ferramentaService.test.ts — este arquivo cobre só o que é
// específico da rota: o isolamento de papel entre consulta e manutenção
// (Regra 8 do CLAUDE.md raiz). Nenhum dado é criado (não precisa reservar
// faixa de matrícula).
function gerarToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
}

describe('GET /v1/consulta/ferramentas (API-16)', () => {
  let manutencaoToken: string;
  let adminToken: string;
  let usuarioId: number;
  let consultaToken: string;

  beforeAll(async () => {
    // authenticate consulta o banco pra papel manutenção (checa se a conta
    // segue ativa a cada requisição) — precisa de um usuário real e ativo
    // pro 403 abaixo ser mesmo "papel errado" e não "usuário inativo".
    const resultado = await query<{ id: number }>(
      "SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo = true LIMIT 1"
    );
    if (resultado.rows.length === 0) {
      throw new Error(
        'Nenhum usuário manutenção ativo no banco de teste — rode o seed (npm run db:seed) antes de rodar os testes.'
      );
    }
    usuarioId = resultado.rows[0].id;

    manutencaoToken = gerarToken({ id: usuarioId, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' });
    adminToken = gerarToken({ id: usuarioId, nome: 'Admin Teste', papel: 'admin', matricula: '0001' });
    // authenticate só decodifica o JWT pra papel consulta (sem query no banco) —
    // não precisa existir colaborador real com essa matrícula/id.
    consultaToken = gerarToken({ id: 0, nome: 'Consulta Teste', papel: 'consulta', matricula: '9999' });
  });

  it('retorna 200 com token de consulta', async () => {
    const res = await request(app).get('/v1/consulta/ferramentas').set('Authorization', `Bearer ${consultaToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1 });
  });

  it('devolve só id, nome, categoria, status, localização e código — nada de colaborador, histórico ou valores', async () => {
    const res = await request(app)
      .get('/v1/consulta/ferramentas?limit=100')
      .set('Authorization', `Bearer ${consultaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect(Object.keys(item).sort()).toEqual(
        ['categoria', 'codigo_identificacao', 'id', 'localizacao', 'nome', 'status'].sort()
      );
      expect(typeof item.categoria).toBe('string');
    }
  });

  it('categoria vem do nome do grupo e o filtro por status continua valendo', async () => {
    const { rows } = await query<{ nome: string }>(
      `SELECT g.nome FROM ferramentas f JOIN grupos_ferramentas g ON g.id = f.grupo_id
       WHERE f.ativo = true AND f.status = 'disponivel' ORDER BY f.nome, f.id LIMIT 1`
    );
    if (rows.length === 0) return; // banco de teste sem ferramenta disponível: nada a comparar

    const res = await request(app)
      .get('/v1/consulta/ferramentas?status=disponivel&limit=1')
      .set('Authorization', `Bearer ${consultaToken}`);

    expect(res.body.data[0]).toMatchObject({ status: 'disponivel', categoria: rows[0].nome });
  });

  it('retorna 403 com token de manutenção (rota é exclusiva do papel consulta)', async () => {
    const res = await request(app).get('/v1/consulta/ferramentas').set('Authorization', `Bearer ${manutencaoToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/v1/consulta/ferramentas');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
  });

  it('retorna 403 com token de consulta em GET /v1/ferramentas (isolamento no sentido inverso)', async () => {
    const res = await request(app).get('/v1/ferramentas').set('Authorization', `Bearer ${consultaToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('retorna 403 com token de admin (a rota é só do papel consulta)', async () => {
    const res = await request(app).get('/v1/consulta/ferramentas').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('retorna 401 TOKEN_EXPIRED com token de consulta expirado', async () => {
    const expirado = jwt.sign({ id: 0, nome: 'Consulta Teste', papel: 'consulta', matricula: '9999' }, env.jwt.secret, {
      expiresIn: -10,
    });

    const res = await request(app).get('/v1/consulta/ferramentas').set('Authorization', `Bearer ${expirado}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('token emitido por /consulta/sessao vale 15 minutos, lista ferramentas e não abre rota da manutenção', async () => {
    const {
      rows: [colaborador],
    } = await query<{ matricula: string }>('SELECT matricula FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1');
    const sessao = await request(app).post('/v1/consulta/sessao').send({ identificador: colaborador.matricula });
    expect(sessao.status).toBe(200);
    const token = sessao.body.data.token as string;

    const payload = jwt.verify(token, env.jwt.secret) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(15 * 60);

    const consulta = await request(app).get('/v1/consulta/ferramentas').set('Authorization', `Bearer ${token}`);
    expect(consulta.status).toBe(200);

    for (const rota of ['/v1/ferramentas', '/v1/dashboard', '/v1/emprestimos', '/v1/notificacoes']) {
      const res = await request(app).get(rota).set('Authorization', `Bearer ${token}`);
      expect(res.status, rota).toBe(403);
    }
  });

  it('registra no log quem consultou e com quais filtros, sem gravar em tabela de negócio', async () => {
    const info = vi.spyOn(logger, 'info');

    await request(app).get('/v1/consulta/ferramentas?q=chave&status=disponivel').set('Authorization', `Bearer ${consultaToken}`);

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        evento: 'consulta_ferramentas',
        colaboradorId: 0,
        matricula: '9999',
        q: 'chave',
        status: 'disponivel',
      }),
      'Consulta pública de ferramentas'
    );
    info.mockRestore();
  });
});
