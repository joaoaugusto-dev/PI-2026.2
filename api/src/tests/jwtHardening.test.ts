import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { assinarToken, AUDIENCE_CONSULTA, AUDIENCE_SESSAO } from '../utils/tokenJwt.js';

// API-19 (#78), D3 e D4: algoritmo fixo em HS256 e `aud` separando o token da sessão de balcão do
// token do quiosque. Os tokens abaixo são forjados de propósito, com o segredo certo quando o
// ataque simulado precisa dele, para provar que só a regra nova os barra.

const payload = (papel: string) => ({ id: 1, nome: 'Invasor Simulado', papel, matricula: '0001' });
const base64url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const usar = (rota: string, token: string) => request(app).get(rota).set('Authorization', `Bearer ${token}`);

describe('Algoritmo do JWT fixo em HS256 (D3)', () => {
  it('rejeita token com alg none, mesmo com payload válido e sem assinatura', async () => {
    const forjado = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
      ...payload('admin'),
      aud: AUDIENCE_SESSAO,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.`;

    const res = await usar('/v1/auth/me', forjado);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rejeita token assinado com outro algoritmo (HS512) usando o segredo certo e o aud certo', async () => {
    const outroAlgoritmo = jwt.sign(payload('admin'), env.jwt.secret, {
      algorithm: 'HS512',
      audience: AUDIENCE_SESSAO,
      expiresIn: '1h',
    });

    const res = await usar('/v1/auth/me', outroAlgoritmo);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rejeita token assinado com outro segredo', async () => {
    const outroSegredo = jwt.sign(payload('admin'), `${env.jwt.secret}-errado`, {
      algorithm: 'HS256',
      audience: AUDIENCE_SESSAO,
      expiresIn: '1h',
    });

    const res = await usar('/v1/auth/me', outroSegredo);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('aceita o token emitido pela API (HS256 com o aud do papel)', async () => {
    const res = await usar('/v1/auth/me', assinarToken(payload('consulta'), '15m'));

    expect(res.status).toBe(200);
    expect(res.body.data.usuario.papel).toBe('consulta');
  });
});

describe('Audience separa a sessão de balcão do quiosque (D4)', () => {
  const comAudience = (papel: string, audience?: string) =>
    jwt.sign(payload(papel), env.jwt.secret, { algorithm: 'HS256', ...(audience && { audience }), expiresIn: '1h' });

  it('token de consulta com aud de sessão não abre nem a rota do quiosque (401 TOKEN_INVALID)', async () => {
    const res = await usar('/v1/consulta/ferramentas', comAudience('consulta', AUDIENCE_SESSAO));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it.each(['manutencao', 'admin'])('token de %s com aud de consulta é barrado em rota da manutenção (401 TOKEN_INVALID)', async (papel) => {
    const res = await usar('/v1/ferramentas', comAudience(papel, AUDIENCE_CONSULTA));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('token sem aud (sessão de antes do hardening) pede novo login: 401 TOKEN_OUTDATED', async () => {
    for (const papel of ['manutencao', 'consulta']) {
      const res = await usar('/v1/auth/me', comAudience(papel));

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_OUTDATED');
    }
  });

  it('aud com valor desconhecido é inválido', async () => {
    const res = await usar('/v1/auth/me', comAudience('manutencao', 'outro-sistema'));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });
});

describe('Tokens emitidos pela API saem com algoritmo e aud corretos', () => {
  it('POST /v1/consulta/sessao emite HS256 com aud soufer-consulta e 15 minutos de validade', async () => {
    const {
      rows: [colaborador],
    } = await query<{ matricula: string }>('SELECT matricula FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1');

    const res = await request(app).post('/v1/consulta/sessao').send({ identificador: colaborador.matricula });

    expect(res.status).toBe(200);
    const { header, payload: corpo } = jwt.decode(res.body.data.token, { complete: true }) as any;
    expect(header.alg).toBe('HS256');
    expect(corpo.aud).toBe(AUDIENCE_CONSULTA);
    expect(corpo.exp - corpo.iat).toBe(15 * 60);
  });

  it('assinarToken usa aud de sessão para manutenção e admin', () => {
    for (const papel of ['manutencao', 'admin']) {
      const { header, payload: corpo } = jwt.decode(assinarToken(payload(papel), env.jwt.expiresIn), { complete: true }) as any;
      expect(header.alg).toBe('HS256');
      expect(corpo.aud).toBe(AUDIENCE_SESSAO);
    }
  });
});
