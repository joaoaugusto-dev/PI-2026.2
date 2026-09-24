import { Request, Response, NextFunction } from 'express';
import * as usuarioService from '../services/usuarioService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

export class UsuarioController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const ativo = req.query.ativo as boolean | undefined;

      const { rows, total } = await usuarioService.listarUsuarios({ offset, limit, ativo });

      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  static async ativar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const usuario = await usuarioService.ativarUsuario(id);
      return sendSuccess(res, usuario, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
