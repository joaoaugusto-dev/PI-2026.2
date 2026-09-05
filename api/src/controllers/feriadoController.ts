import { Request, Response, NextFunction } from 'express';
import * as feriadoService from '../services/feriadoService.js';
import { sendSuccess } from '../utils/response.js';

export class FeriadoController {
  /**
   * GET /v1/feriados?ano=2026
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { ano } = req.query as unknown as { ano: number };
      const { feriados, fonte } = await feriadoService.listarPorAno(ano);
      return sendSuccess(res, { ano, fonte, feriados }, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /v1/feriados/sincronizar?ano=2026
   * Força uma nova busca na BrasilAPI e atualiza o cache local.
   */
  static async sincronizar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { ano } = req.query as unknown as { ano: number };
      const feriados = await feriadoService.sincronizarFeriados(ano);
      return sendSuccess(res, { ano, fonte: 'brasil_api', feriados }, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/feriados/dia-util?data=2026-09-07
   */
  static async verificarDiaUtil(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { data } = req.query as unknown as { data: string };
      const diaUtil = await feriadoService.ehDiaUtil(data);
      return sendSuccess(res, { data, diaUtil }, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
