import { Router } from 'express';
import { AuthController } from '../../controllers/authController.js';
import { validate } from '../../middlewares/validate.js';
import { consultaSessaoLimiter } from '../../middlewares/rateLimit.js';
import { consultaSessaoSchema } from '../../validators/authValidator.js';

const router = Router();

/**
 * @openapi
 * /consulta/sessao:
 *   post:
 *     summary: Inicia sessão temporária (15 min) para modo quiosque / consulta
 *     tags:
 *       - Modo Consulta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identificador
 *             properties:
 *               identificador:
 *                 type: string
 *                 description: Matrícula do colaborador (exatamente 4 dígitos numéricos, 0001 a 9999)
 *                 example: "0003"
 *     responses:
 *       200:
 *         description: Sessão iniciada com token de consulta temporário
 *       400:
 *         description: Matrícula fora do padrão de 4 dígitos
 *       404:
 *         description: Colaborador não localizado ou inativo
 *       429:
 *         description: Limite de 30 tentativas por minuto por IP excedido
 */
router.post('/sessao', consultaSessaoLimiter, validate({ body: consultaSessaoSchema }), AuthController.criarSessaoConsulta);

export default router;
