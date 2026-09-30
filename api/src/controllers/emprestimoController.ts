import { Request, Response, NextFunction } from 'express';
import * as emprestimoService from '../services/emprestimoService.js';
import { sendSuccess } from '../utils/response.js';
import type { ListarEmprestimosQuery } from '../validators/emprestimoValidator.js';
import { buildPaginationMeta, getPaginationParams } from '../utils/pagination.js';

export class EmprestimoController {
  /**
   * GET /v1/emprestimos
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      // o validate já coagiu e tipou req.query com listarEmprestimosQuerySchema
      const { q, situacao, setorId } = req.query as unknown as ListarEmprestimosQuery;
      const { rows, total } = await emprestimoService.listar({ offset, limit, q, situacao, setorId });
      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

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
   * PATCH /v1/emprestimos/:id/devolucao
   */
  static async devolver(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const emprestimo = await emprestimoService.devolver(id, req.body, req.usuario!.id);
      return sendSuccess(res, emprestimo, null, 200);
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
