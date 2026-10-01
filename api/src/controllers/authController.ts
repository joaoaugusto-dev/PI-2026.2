import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';

export class AuthController {
  /**
   * POST /v1/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { matricula, senha } = req.body;
      const data = await AuthService.login(matricula, senha);
      return sendSuccess(res, data, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/auth/convites/:token
   */
  static async consultarConvite(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { token } = req.params;
      return sendSuccess(res, await AuthService.consultarConvite(token), null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /v1/auth/convites/:token/senha
   */
  static async aceitarConvite(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { token } = req.params;
      const { senha } = req.body;
      return sendSuccess(res, await AuthService.aceitarConvite(token, senha), null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/auth/me
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      return sendSuccess(res, { usuario: req.usuario }, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /v1/consulta/sessao
   */
  static async criarSessaoConsulta(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { identificador } = req.body;
      const data = await AuthService.criarSessaoConsulta(identificador);
      return sendSuccess(res, data, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
