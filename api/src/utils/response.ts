import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export function sendSuccess<T = any>(
  res: Response,
  data: T = {} as T,
  meta: PaginationMeta | null = null,
  statusCode = 200
): Response {
  const payload: { data: T; meta?: PaginationMeta } = { data };

  if (meta !== null) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code = 'INTERNAL_ERROR',
  message = 'Erro interno do servidor',
  details: any[] = [],
  statusCode = 500
): Response {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
}
