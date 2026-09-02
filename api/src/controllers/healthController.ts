import { Request, Response, NextFunction } from 'express';
import { testConnection } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';

export class HealthController {
  /**
   * GET /v1/health
   */
  static async check(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const dbStatus = await testConnection();

      const healthData = {
        status: dbStatus.ok ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: {
          status: dbStatus.ok ? 'connected' : 'disconnected',
          name: dbStatus.database || null,
          serverTime: dbStatus.timestamp || null,
          error: dbStatus.error || null,
        },
      };

      const statusCode = dbStatus.ok ? 200 : 503;
      return sendSuccess(res, healthData, null, statusCode);
    } catch (error) {
      return next(error);
    }
  }
}
