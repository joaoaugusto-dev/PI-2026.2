import { Request, Response, NextFunction } from 'express';
import * as ocorrenciaService from '../services/ocorrenciaService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

export class OcorrenciaController {
  /**
   * GET /v1/ocorrencias
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const status = req.query.status as string | undefined;
      const colaboradorId = req.query.colaboradorId ? Number(req.query.colaboradorId) : undefined;
      const tipo = req.query.tipo as string | undefined;

      const { rows, total } = await ocorrenciaService.listar({ offset, limit, status, colaboradorId, tipo });
      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * PATCH /v1/ocorrencias/:id
   */
  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const ocorrencia = await ocorrenciaService.atualizar(id, req.body, req.usuario!.id);
      return sendSuccess(res, ocorrencia, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
