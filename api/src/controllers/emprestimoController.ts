import { Request, Response, NextFunction } from 'express';
import * as emprestimoService from '../services/emprestimoService.js';
import { sendSuccess } from '../utils/response.js';

export class EmprestimoController {
  /**
   * POST /v1/emprestimos
   */
  static async criar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const emprestimo = await emprestimoService.criar(req.body, req.usuario!.id);
      return sendSuccess(res, emprestimo, null, 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/emprestimos/previsao-sugerida
   */
  static async previsaoSugerida(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { dias } = req.query as unknown as { dias: number };
      const sugestao = await emprestimoService.sugerirPrevisao(dias);
      return sendSuccess(res, sugestao, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
