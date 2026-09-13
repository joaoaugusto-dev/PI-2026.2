import { Request, Response, NextFunction } from 'express';
import * as ferramentaService from '../services/ferramentaService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

export class FerramentaController {
  /**
   * GET /v1/ferramentas
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { q, status, categoria_id, grupo_id, setor_id, sort } = req.query as Record<string, any>;

      const { rows, total } = await ferramentaService.listar({
        offset,
        limit,
        q: q ? String(q) : undefined,
        status: status ? String(status) : undefined,
        grupoId: grupo_id ? Number(grupo_id) : undefined,
        categoriaId: categoria_id ? Number(categoria_id) : undefined,
        setorId: setor_id ? Number(setor_id) : undefined,
        sort: sort ? String(sort) : undefined,
      });

      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/ferramentas/:id
   */
  static async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const ferramenta = await ferramentaService.buscarPorId(id);
      return sendSuccess(res, ferramenta, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/ferramentas/por-codigo/:codigo
   */
  static async buscarPorCodigo(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { codigo } = req.params as { codigo: string };
      const ferramenta = await ferramentaService.buscarPorCodigo(codigo);
      return sendSuccess(res, ferramenta, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/ferramentas/:id/historico
   */
  static async buscarHistorico(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const historico = await ferramentaService.buscarHistorico(id);
      return sendSuccess(res, historico, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /v1/ferramentas
   */
  static async criar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const ferramenta = await ferramentaService.criar(req.body);
      return sendSuccess(res, ferramenta, null, 201);
    } catch (error) {
      return next(error);
    }
  }
}

