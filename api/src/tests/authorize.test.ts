import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { authorize } from '../middlewares/authorize.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

function criarReq(usuario?: { id: number; nome: string; papel: 'almoxarife' | 'consulta' }) {
  return { usuario } as unknown as Request;
}

describe('authorize', () => {
  it('chama next() sem erro quando o papel do usuário está na lista permitida', () => {
    const req = criarReq({ id: 1, nome: 'Henrique', papel: 'almoxarife' });
    const next = vi.fn();

    authorize('almoxarife')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('chama next() com ForbiddenError quando o papel não está na lista permitida', () => {
    const req = criarReq({ id: 2, nome: 'Colaborador', papel: 'consulta' });
    const next = vi.fn();

    authorize('almoxarife')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('chama next() com UnauthorizedError quando não há usuário autenticado', () => {
    const req = criarReq(undefined);
    const next = vi.fn();

    authorize('almoxarife')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
