import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Mocka a consulta ao banco usada pela revalidação de `ativo` em
// authenticate() — os testes de integração de auth.test.ts usam o banco
// real, este arquivo isola só o comportamento de erro de infraestrutura.
vi.mock('../config/database.js', () => ({
  query: vi.fn(),
}));

const { query } = await import('../config/database.js');
const { authenticate } = await import('../middlewares/auth.js');

function criarReqComToken(payload: Record<string, unknown>) {
  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
  return { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
}

describe('authenticate — erro de infraestrutura na revalidação de ativo', () => {
  it('propaga o erro cru para o errorHandler (500) em vez de responder 401 TOKEN_INVALID', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('Falha inesperada no banco de dados'));

    const req = criarReqComToken({ id: 1, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' });
    const next = vi.fn() as NextFunction;

    await authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const erroRecebido = (next as any).mock.calls[0][0];
    // O erro passado para next() é o mesmo erro cru do banco, não um
    // UnauthorizedError — assim o errorHandler devolve 500, não 401.
    expect(erroRecebido).toBeInstanceOf(Error);
    expect(erroRecebido.message).toBe('Falha inesperada no banco de dados');
    expect(erroRecebido.constructor.name).not.toBe('UnauthorizedError');
  });

  it('continua devolvendo TOKEN_EXPIRED normalmente quando o problema é mesmo o token', async () => {
    const tokenExpirado = jwt.sign(
      { id: 1, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' },
      env.jwt.secret,
      { expiresIn: -1 }
    );
    const req = { headers: { authorization: `Bearer ${tokenExpirado}` } } as unknown as Request;
    const next = vi.fn() as NextFunction;

    await authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    // A consulta ao banco nunca chega a rodar: o token já é rejeitado antes.
    expect(query).not.toHaveBeenCalled();
  });
});
