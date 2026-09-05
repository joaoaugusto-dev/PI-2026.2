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
      const status = req.query.status as string | undefined;

      const { rows, total } = await ferramentaService.listar({ offset, limit, status });
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
