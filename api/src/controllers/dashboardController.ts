import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

export class DashboardController {
  /**
   * GET /v1/dashboard
   */
  static async obter(_req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      return sendSuccess(res, await dashboardService.obter(), null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/dashboard/:lista?page=&limit=
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { lista } = req.params as unknown as { lista: dashboardService.NomeLista };
      const { page, limit, offset } = getPaginationParams(req.query, 15, 50);
      const { total, itens } = await dashboardService.lista(lista, limit, offset);
      return sendSuccess(res, itens, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }
}
