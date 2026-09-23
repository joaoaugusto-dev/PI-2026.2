import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { UnauthorizedError } from '../utils/errors.js';
import { UsuarioPayload } from '../types/express.js';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
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

    // Sessão do almoxarife dura 7 dias no token — revalida `ativo` a cada
    // requisição pra um usuário desativado no meio da janela perder acesso
    // na próxima chamada, não só no próximo login.
    if (decoded.papel === 'almoxarife') {
      const result = await query<{ ativo: boolean }>('SELECT ativo FROM usuarios WHERE id = $1', [decoded.id]);
      if (!result.rows[0]?.ativo) {
        return next(new UnauthorizedError('Usuário inativo. Contate o administrador.', 'USER_INACTIVE'));
      }
    }

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
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    return next(new UnauthorizedError('Token de autenticação inválido', 'TOKEN_INVALID'));
  }
}
