import { Router } from 'express';
import { AuthController } from '../../controllers/authController.js';
import { validate } from '../../middlewares/validate.js';
import { loginSchema } from '../../validators/authValidator.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Autenticação de almoxarife com e-mail e senha
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 example: almoxarife@soufer.com.br
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login bem-sucedido com emissão de token JWT
 *       400:
 *         description: Erro de validação nos campos
 *       401:
 *         description: E-mail ou senha inválidos
 */
router.post('/login', validate({ body: loginSchema }), AuthController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retorna os dados do usuário autenticado no token atual
 *     tags:
 *       - Autenticação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário logado
 *       401:
 *         description: Token inválido ou não fornecido
 */
router.get('/me', authenticate, AuthController.me);

export default router;
