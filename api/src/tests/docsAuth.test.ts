import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { UnauthorizedError } from '../utils/errors.js';

// função simples em vez de vi.fn: o spy do Vitest marcava a rejeição do mock como falha do teste
type Usuario = { id: number; nome: string; matricula: string; papel: string };
let resposta: Usuario | Error = new Error('não configurado');
const chamadas: string[][] = [];
vi.mock('../services/authService.js', () => ({
  AuthService: {
    login: async (matricula: string, senha: string) => {
      chamadas.push([matricula, senha]);
      if (resposta instanceof Error) throw resposta;
      return { token: 't', usuario: resposta };
    },
  },
}));

const { default: app } = await import('../app.js');

const basic = (m: string, s: string) => `Basic ${Buffer.from(`${m}:${s}`).toString('base64')}`;

describe('Swagger /docs restrito a admin', () => {
  beforeEach(() => {
    chamadas.length = 0;
  });

  it('sem credencial: 401 com WWW-Authenticate', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/^Basic/);
    expect(chamadas).toHaveLength(0);
  });

  it('senha errada: 401', async () => {
    resposta = new UnauthorizedError('Matrícula ou senha inválidos', 'INVALID_CREDENTIALS');
    const res = await request(app).get('/v1/docs/').set('Authorization', basic('0001', 'x'));
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/^Basic/);
  });

  it('manutencao: 403', async () => {
    resposta = { id: 2, nome: 'M', matricula: '0002', papel: 'manutencao' };
    const res = await request(app).get('/docs/').set('Authorization', basic('0002', 'ok'));
    expect(res.status).toBe(403);
  });

  it('admin: 200 com o Swagger UI', async () => {
    resposta = { id: 1, nome: 'A', matricula: '0001', papel: 'admin' };
    const res = await request(app).get('/docs/').set('Authorization', basic('0001', 'ok'));
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
    expect(chamadas[0]).toEqual(['0001', 'ok']);
  });
});
