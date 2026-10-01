import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService.js';
import { sendSuccess } from '../utils/response.js';

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
}
