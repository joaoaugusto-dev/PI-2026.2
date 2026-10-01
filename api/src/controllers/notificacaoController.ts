import { Request, Response, NextFunction } from 'express';
import * as notificacaoService from '../services/notificacaoService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';
import type { ListarNotificacoesQuery } from '../validators/notificacaoValidator.js';

export class NotificacaoController {
  /**
   * GET /v1/notificacoes
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { lida } = req.query as unknown as ListarNotificacoesQuery;
      const { rows, total } = await notificacaoService.listar({ usuarioId: req.usuario!.id, lida, offset, limit });
      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * PATCH /v1/notificacoes/:id/lida
   */
  static async marcarLida(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const notificacao = await notificacaoService.marcarLida(id, req.usuario!.id);
      return sendSuccess(res, notificacao, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
