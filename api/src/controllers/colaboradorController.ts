import { Request, Response, NextFunction } from 'express';
import * as colaboradorService from '../services/colaboradorService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

export class ColaboradorController {
  /**
   * GET /v1/colaboradores
   */
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const q = req.query.q as string | undefined;
      const setorId = req.query.setorId ? Number(req.query.setorId) : undefined;
      const sort = req.query.sort as 'nome' | 'matricula' | undefined;

      const { rows, total } = await colaboradorService.listar({ offset, limit, q, setorId, sort });
      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/colaboradores/identificar?termo=
   */
  static async identificar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { termo } = req.query as unknown as { termo: string };
      const colaborador = await colaboradorService.identificar(termo);
      return sendSuccess(res, colaborador, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/colaboradores/:id
   */
  static async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const colaborador = await colaboradorService.buscarPorId(id);
      return sendSuccess(res, colaborador, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /v1/colaboradores
   */
  static async criar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const colaborador = await colaboradorService.criar(req.body, req.usuario!.id);
      return sendSuccess(res, colaborador, null, 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * PATCH /v1/colaboradores/:id
   */
  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const colaborador = await colaboradorService.atualizar(id, req.body);
      return sendSuccess(res, colaborador, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * DELETE /v1/colaboradores/:id
   */
  static async inativar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params as unknown as { id: number };
      const colaborador = await colaboradorService.inativar(id);
      return sendSuccess(res, colaborador, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
