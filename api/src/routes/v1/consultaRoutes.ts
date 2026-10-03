import { Router } from 'express';
import { AuthController } from '../../controllers/authController.js';
import { FerramentaController } from '../../controllers/ferramentaController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { consultaMatriculaLimiter, consultaSessaoLimiter } from '../../middlewares/rateLimit.js';
import { consultaSessaoSchema } from '../../validators/authValidator.js';
import { listarFerramentasQuerySchema } from '../../validators/ferramentaValidator.js';

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
 *         description: Limite excedido (30 tentativas por minuto por IP ou 5 falhas por minuto na mesma matrícula)
 */
router.post(
  '/sessao',
  consultaSessaoLimiter,
  validate({ body: consultaSessaoSchema }),
  consultaMatriculaLimiter,
  AuthController.criarSessaoConsulta
);

/**
 * @openapi
 * /consulta/ferramentas:
 *   get:
 *     summary: Busca somente leitura de ferramentas para o modo quiosque (disponibilidade)
 *     description: >
 *       Mesma listagem de `/v1/ferramentas`, restrita ao papel `consulta`
 *       (token de 15 min emitido por `/v1/consulta/sessao`). O retorno já não
 *       tem dado de colaborador/custo/observação — esses campos vivem em
 *       `/v1/ferramentas/:id/historico`, que continua exclusivo da manutenção.
 *     tags:
 *       - Modo Consulta
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [disponivel, em_uso, indisponivel]
 *       - in: query
 *         name: q
 *         description: Busca textual por nome, descrição, marca ou modelo
 *         schema:
 *           type: string
 *       - in: query
 *         name: grupoId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista paginada de ferramentas
 *       401:
 *         description: Token inválido, não fornecido ou expirado (sessão de 15 min)
 *       403:
 *         description: Papel diferente de `consulta`
 */
router.get(
  '/ferramentas',
  authenticate,
  authorize('consulta'),
  validate({ query: listarFerramentasQuerySchema }),
  FerramentaController.listar
);

export default router;
