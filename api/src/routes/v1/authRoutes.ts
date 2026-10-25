import { Router } from 'express';
import { AuthController } from '../../controllers/authController.js';
import { validate } from '../../middlewares/validate.js';
import { aceitarConviteSchema, conviteTokenParamSchema, loginSchema } from '../../validators/authValidator.js';
import { authenticate } from '../../middlewares/auth.js';
import { conviteLimiter, loginLimiter } from '../../middlewares/rateLimit.js';

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
 *       429:
 *         description: Limite de 10 tentativas por minuto por IP excedido
 */
// loginLimiter depois do validate() (ordem diferente do conviteLimiter, que
// vem antes): matrícula fora do formato de 4 dígitos é rejeitada de graça
// pelo Zod, sem custar nada de banco/bcrypt, então não faz sentido gastar o
// limite com isso — só tentativas de credencial (matrícula bem formada)
// contam contra as 10/minuto, que é o cenário real de força bruta.
router.post('/login', validate({ body: loginSchema }), loginLimiter, AuthController.login);

/**
 * @openapi
 * /auth/convites/{token}:
 *   get:
 *     summary: Confere o link de convite e devolve nome e matrícula de quem vai definir a senha
 *     tags:
 *       - Autenticação
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Convite válido (nome e matrícula do colaborador)
 *       404:
 *         description: Link inválido, expirado ou já usado (CONVITE_INVALIDO)
 *       429:
 *         description: Limite de 10 tentativas por minuto por IP excedido
 */
router.get('/convites/:token', conviteLimiter, validate({ params: conviteTokenParamSchema }), AuthController.consultarConvite);

/**
 * @openapi
 * /auth/convites/{token}/senha:
 *   post:
 *     summary: Define a senha pelo link de convite e já devolve a sessão (login automático)
 *     description: >
 *       Cria a conta de acesso do colaborador (ou troca a senha, se ela já
 *       existia) e consome o convite: o link vale uma única vez. A resposta é a
 *       mesma do login (token + usuario).
 *     tags:
 *       - Autenticação
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senha
 *             properties:
 *               senha:
 *                 type: string
 *                 description: Exatamente 6 dígitos
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Senha definida; token JWT e usuario
 *       400:
 *         description: Senha fora do padrão de 6 dígitos
 *       404:
 *         description: Link inválido, expirado ou já usado (CONVITE_INVALIDO)
 *       429:
 *         description: Limite de 10 tentativas por minuto por IP excedido
 */
router.post(
  '/convites/:token/senha',
  conviteLimiter,
  validate({ params: conviteTokenParamSchema, body: aceitarConviteSchema }),
  AuthController.aceitarConvite
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retorna os dados do usuário autenticado no token atual
 *     description: >
 *       Aberta a qualquer perfil autenticado (manutencao, admin e consulta) de propósito, sem
 *       `authorize`. Devolve só os dados do próprio usuário do token (id, nome, papel e matrícula),
 *       nada de outros usuários nem de ferramentas, então não há o que restringir por perfil.
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
// Sem `authorize` de propósito (API-19): devolve só os dados do próprio usuário do token, então
// qualquer perfil autenticado pode chamar. Está na lista de exceções de tests/segurancaRotas.test.ts.
router.get('/me', authenticate, AuthController.me);

export default router;
