import { Request, Response, NextFunction } from 'express';
import * as auditoriaService from '../services/auditoriaService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import type { ListarAuditoriaQuery } from '../validators/auditoriaValidator.js';

export class AuditoriaController {
  /**
   * GET /v1/auditoria
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { tabela, registroId, operacao, usuarioId, de, ate } = req.query as unknown as ListarAuditoriaQuery;
      const { rows, total } = await auditoriaService.listar({ tabela, registroId, operacao, usuarioId, de, ate, offset, limit });
      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }
}
