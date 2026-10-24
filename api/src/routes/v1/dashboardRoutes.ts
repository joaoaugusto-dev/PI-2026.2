import { Router } from 'express';
import { DashboardController } from '../../controllers/dashboardController.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { dashboardListaParamSchema, dashboardListaQuerySchema } from '../../validators/dashboardValidator.js';

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
 * /dashboard/kpis:
 *   get:
 *     summary: Os seis contadores do dashboard (vw_dashboard_kpis)
 *     description: >
 *       cadastradas, disponiveis, em_uso, indisponiveis, atrasadas e ocorrencias (abertas). Declarada antes de
 *       /dashboard/{lista}, que senão trataria "kpis" como nome de lista.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contadores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     cadastradas:
 *                       type: integer
 *                       description: Ferramentas ativas
 *                     disponiveis:
 *                       type: integer
 *                     em_uso:
 *                       type: integer
 *                     indisponiveis:
 *                       type: integer
 *                     atrasadas:
 *                       type: integer
 *                       description: Empréstimos abertos com previsão em dia anterior (Brasília), a mesma definição do cartão de atrasados
 *                     ocorrencias:
 *                       type: integer
 *                       description: Ocorrências abertas
 *             example:
 *               data: { cadastradas: 81, disponiveis: 52, em_uso: 18, indisponiveis: 11, atrasadas: 18, ocorrencias: 5 }
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 */
router.get('/kpis', authenticate, authorize('manutencao', 'admin'), DashboardController.kpis);

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
 *         description: Lista desconhecida ou page/limit fora do intervalo
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 */
router.get(
  '/:lista',
  authenticate,
  authorize('manutencao', 'admin'),
  validate({ params: dashboardListaParamSchema, query: dashboardListaQuerySchema }),
  DashboardController.listar
);

export default router;
