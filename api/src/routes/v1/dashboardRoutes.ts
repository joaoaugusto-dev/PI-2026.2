import { Router } from 'express';
import { DashboardController } from '../../controllers/dashboardController.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { dashboardListaParamSchema } from '../../validators/dashboardValidator.js';

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     summary: Pendências da tela inicial (cobrar hoje, atrasados, próximos do prazo e indisponíveis)
 *     description: >
 *       Cada lista traz o total e só as primeiras 4 linhas (as do cartão). cobrar_hoje: devolução prevista para hoje (Brasília).
 *       atrasados: previsão em dia anterior, o mais antigo primeiro. proximos_do_prazo: previsão nos próximos 3 dias.
 *       indisponiveis: ferramentas indisponíveis com a ocorrência em andamento (etapa) e dias parada.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do dashboard
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 */
router.get('/', authenticate, authorize('manutencao', 'admin'), DashboardController.obter);

/**
 * @openapi
 * /dashboard/{lista}:
 *   get:
 *     summary: Uma lista do dashboard, paginada (o "Mostrar tudo" de cada cartão)
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lista
 *         required: true
 *         schema:
 *           type: string
 *           enum: [cobrar_hoje, atrasados, proximos_do_prazo, indisponiveis]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         description: Itens por página (padrão 15, máximo 50)
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Página da lista, com meta de paginação
 *       400:
 *         description: Lista desconhecida
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 */
router.get(
  '/:lista',
  authenticate,
  authorize('manutencao', 'admin'),
  validate({ params: dashboardListaParamSchema }),
  DashboardController.listar
);

export default router;
