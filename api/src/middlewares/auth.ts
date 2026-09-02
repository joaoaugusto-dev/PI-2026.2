import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { UsuarioPayload } from '../types/express.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new UnauthorizedError('Token de autenticação não fornecido', 'TOKEN_NOT_PROVIDED'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new UnauthorizedError('Formato de token inválido. Use "Bearer <token>"', 'TOKEN_MALFORMATTED'));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as UsuarioPayload;

    req.usuario = {
      id: decoded.id,
      nome: decoded.nome,
      papel: decoded.papel,
      email: decoded.email || null,
      matricula: decoded.matricula || null,
    };

    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token de autenticação expirado', 'TOKEN_EXPIRED'));
    }
    return next(new UnauthorizedError('Token de autenticação inválido', 'TOKEN_INVALID'));
  }
}
