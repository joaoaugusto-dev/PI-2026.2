import { Router } from 'express';
import { DashboardController } from '../../controllers/dashboardController.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     summary: Pendências da tela inicial (cobrar hoje, atrasados, próximos do prazo e indisponíveis)
 *     description: >
 *       Cada lista traz total e todos os itens. cobrar_hoje: devolução prevista para hoje (Brasília).
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

export default router;
