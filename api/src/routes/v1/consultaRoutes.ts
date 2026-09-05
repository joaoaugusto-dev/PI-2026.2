import { Router } from 'express';
import { AuthController } from '../../controllers/authController.js';
import { validate } from '../../middlewares/validate.js';
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
 *                 description: Matrícula do colaborador (mesmo número impresso/codificado no crachá)
 *                 example: MAT001
 *     responses:
 *       200:
 *         description: Sessão iniciada com token de consulta temporário
 *       404:
 *         description: Colaborador não localizado
 */
router.post('/sessao', validate({ body: consultaSessaoSchema }), AuthController.criarSessaoConsulta);

export default router;
