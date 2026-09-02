import { PaginationMeta } from './response.js';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPaginationParams(
  query: Record<string, any> = {},
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  let limit = parseInt(String(query.limit || defaultLimit), 10);

  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const parsedTotal = parseInt(String(total), 10);
  return {
    page,
    limit,
    total: parsedTotal,
    totalPages: Math.ceil(parsedTotal / limit) || 1,
  };
}
