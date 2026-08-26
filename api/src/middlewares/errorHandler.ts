import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from './logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // Se for erro operacional customizado da aplicação
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.details, err.statusCode);
  }

  // Tratamento de erros específicos do PostgreSQL (pg)
  if (err.code) {
    if (err.code === '23505') {
      return sendError(
        res,
        'DUPLICATE_ENTRY',
        'Registro duplicado ou operação em conflito com o estado atual.',
        [{ detail: err.detail, constraint: err.constraint }],
        409
      );
    }

    if (err.code === '23503') {
      return sendError(
        res,
        'FOREIGN_KEY_VIOLATION',
        'Referência a um registro inexistente no banco de dados.',
        [{ detail: err.detail, constraint: err.constraint }],
        400
      );
    }

    if (err.code === 'P0001') {
      return sendError(
        res,
        'BUSINESS_RULE_VIOLATION',
        err.message || 'Violação de regra de negócio do banco de dados.',
        [],
        409
      );
    }
  }

  // Erro não tratado (500)
  logger.error({ err, reqId: (req as any).id }, '[UNHANDLED_ERROR] Erro interno não tratado:');

  const isProduction = process.env.NODE_ENV === 'production';
  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    isProduction ? 'Ocorreu um erro interno no servidor.' : err.message,
    isProduction ? [] : [{ stack: err.stack }],
    500
  );
}
