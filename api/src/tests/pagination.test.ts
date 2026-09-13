import { describe, it, expect } from 'vitest';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import { sendSuccess } from '../utils/response.js';

describe('Helper de Paginação e Envelope de Sucesso', () => {
  describe('getPaginationParams', () => {
    it('retorna valores padrão quando a query está vazia', () => {
      const params = getPaginationParams({});
      expect(params).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
      });
    });

    it('calcula o offset correto para página 2 com limit 10', () => {
      const params = getPaginationParams({ page: '2', limit: '10' });
      expect(params).toEqual({
        page: 2,
        limit: 10,
        offset: 10,
      });
    });

    it('respeita o limite máximo de 100 itens por página', () => {
      const params = getPaginationParams({ limit: '200' }, 20, 100);
      expect(params.limit).toBe(100);
    });

    it('trata valores negativos ou inválidos definindo valores seguros', () => {
      const params = getPaginationParams({ page: '-5', limit: 'abc' });
      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
      expect(params.offset).toBe(0);
    });
  });

  describe('buildPaginationMeta', () => {
    it('calcula totalPages corretamente', () => {
      const meta = buildPaginationMeta(1, 20, 45);
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('retorna totalPages 1 quando não há registros', () => {
      const meta = buildPaginationMeta(1, 20, 0);
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      });
    });
  });
});
