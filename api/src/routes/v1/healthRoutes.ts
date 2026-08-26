import { Router } from 'express';
import { HealthController } from '../../controllers/healthController.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Healthcheck da API e do banco PostgreSQL
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: API e banco operacionais
 *       503:
 *         description: API operacional, porém com falha de conexão com o banco
 */
router.get('/', HealthController.check);

export default router;
