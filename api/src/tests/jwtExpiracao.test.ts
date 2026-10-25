import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// API-19 (#78), passo 1: revisão do tempo de expiração. A decisão do projeto é sessão de balcão
// (manutenção/admin) de 7 dias, persistida no front, e sessão de quiosque (consulta) de 15 minutos.
// Os testes leem o `exp` dos tokens que a API de fato emite, não só a configuração.

const SETE_DIAS = 7 * 24 * 60 * 60;
const QUINZE_MINUTOS = 15 * 60;

const duracao = (token: string) => {
  const { exp, iat } = jwt.decode(token) as { exp: number; iat: number };
  return exp - iat;
};

describe('Expiração dos tokens (configuração)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('sem JWT_EXPIRES_IN e JWT_CONSULTA_EXPIRES_IN no ambiente, os padrões são 7d e 15m', async () => {
    vi.resetModules();
    vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_EXPIRES_IN', undefined as unknown as string);
    vi.stubEnv('JWT_CONSULTA_EXPIRES_IN', undefined as unknown as string);

    const { env: padrao } = await import('../config/env.js');
    vi.doUnmock('dotenv');

    expect(padrao.jwt.expiresIn).toBe('7d');
    expect(padrao.jwt.consultaExpiresIn).toBe('15m');
  });

  it('o ambiente que roda a suíte (api/.env) usa os mesmos 7d e 15m da decisão do projeto', () => {
    expect(env.jwt.expiresIn).toBe('7d');
    expect(env.jwt.consultaExpiresIn).toBe('15m');
  });
});

describe('Expiração dos tokens emitidos pela API', () => {
  it('POST /v1/auth/login emite token de 7 dias para manutenção', async () => {
    const res = await request(app).post('/v1/auth/login').send({ matricula: '0001', senha: '123456' });

    expect(res.status).toBe(200);
    expect(duracao(res.body.data.token)).toBe(SETE_DIAS);
  });

  it('POST /v1/consulta/sessao emite token de 15 minutos e informa o mesmo prazo', async () => {
    const {
      rows: [colaborador],
    } = await query<{ matricula: string }>('SELECT matricula FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1');

    const res = await request(app).post('/v1/consulta/sessao').send({ identificador: colaborador.matricula });

    expect(res.status).toBe(200);
    expect(duracao(res.body.data.token)).toBe(QUINZE_MINUTOS);
    expect(res.body.data.expiraEm).toBe('15m');
  });

  it('o token do quiosque vale bem menos que o da sessão de balcão (nunca o contrário)', async () => {
    const login = await request(app).post('/v1/auth/login').send({ matricula: '0001', senha: '123456' });
    const {
      rows: [colaborador],
    } = await query<{ matricula: string }>('SELECT matricula FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1');
    const consulta = await request(app).post('/v1/consulta/sessao').send({ identificador: colaborador.matricula });

    expect(duracao(consulta.body.data.token)).toBeLessThan(duracao(login.body.data.token));
    expect(duracao(consulta.body.data.token)).toBeLessThanOrEqual(QUINZE_MINUTOS);
  });
});
