import { Router } from 'express';
import { AuthController } from '../../controllers/authController.js';
import { validate } from '../../middlewares/validate.js';
import { loginSchema, registroSchema } from '../../validators/authValidator.js';
import { authenticate } from '../../middlewares/auth.js';
import { registroLimiter } from '../../middlewares/rateLimit.js';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Autenticação da manutenção (ou admin) com matrícula e senha
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matricula
 *               - senha
 *             properties:
 *               matricula:
 *                 type: string
 *                 description: Exatamente 4 dígitos numéricos (0001 a 9999)
 *                 example: "0001"
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login bem-sucedido com emissão de token JWT
 *       400:
 *         description: Erro de validação nos campos (matrícula fora do padrão de 4 dígitos)
 *       401:
 *         description: Matrícula ou senha inválidos, ou usuário inativo
 */
router.post('/login', validate({ body: loginSchema }), AuthController.login);

/**
 * @openapi
 * /auth/registro:
 *   post:
 *     summary: Auto-cadastro de manutenção (fica inativo até aprovação de um admin)
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matricula
 *               - senha
 *             properties:
 *               matricula:
 *                 type: string
 *                 description: Matrícula do colaborador (exatamente 4 dígitos, 0001 a 9999). Precisa existir e estar ativa, e ainda não ter conta de acesso.
 *                 example: "0003"
 *               senha:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Cadastro criado com sucesso, aguardando aprovação (ativo=false, sem token)
 *       400:
 *         description: Erro de validação nos campos (matrícula fora do padrão ou senha curta)
 *       404:
 *         description: Matrícula sem colaborador ativo
 *       409:
 *         description: Esta matrícula já possui cadastro de acesso (MATRICULA_JA_CADASTRADA)
 *       429:
 *         description: Limite de 10 tentativas por minuto por IP excedido
 */
router.post('/registro', registroLimiter, validate({ body: registroSchema }), AuthController.registrar);

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
