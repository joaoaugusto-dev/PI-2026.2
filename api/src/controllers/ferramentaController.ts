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
      const q = req.query.q as string | undefined;
      const status = req.query.status as string | undefined;
      const grupoId = req.query.grupoId ? Number(req.query.grupoId) : undefined;
      const sort = req.query.sort as 'nome' | 'status' | undefined;

      const { rows, total } = await ferramentaService.listar({ offset, limit, q, status, grupoId, sort });
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
      const { codigo } = req.params as unknown as { codigo: number };
      const ferramenta = await ferramentaService.buscarPorCodigo(codigo);
      return sendSuccess(res, ferramenta, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/ferramentas/:id/historico
   */
  static async historico(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const historico = await ferramentaService.historico(id);
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

  /**
   * PUT /v1/ferramentas/:id
   */
  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const ferramenta = await ferramentaService.atualizar(id, req.body);
      return sendSuccess(res, ferramenta, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
