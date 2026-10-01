import { Router } from 'express';
import { NotificacaoController } from '../../controllers/notificacaoController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { listarNotificacoesQuerySchema, notificacaoIdParamSchema } from '../../validators/notificacaoValidator.js';

const router = Router();

/**
 * @openapi
 * /notificacoes:
 *   get:
 *     summary: Lista as notificações (devolução hoje, atraso) da equipe de manutenção
 *     description: >
 *       Geradas por fn_gerar_notificacoes() (seg-sex 07:00 de Brasília). Com
 *       lida=false, meta.total é o contador de não lidas do sino.
 *     tags:
 *       - Notificações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lida
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista paginada de notificações, da mais recente para a mais antiga
 *       400:
 *         description: Erro de validação nos parâmetros
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 */
router.get(
  '/',
  authenticate,
  authorize('manutencao', 'admin'),
  validate({ query: listarNotificacoesQuerySchema }),
  NotificacaoController.listar
);

/**
 * @openapi
 * /notificacoes/{id}/lida:
 *   patch:
 *     summary: Marca uma notificação como lida
 *     tags:
 *       - Notificações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notificação atualizada
 *       400:
 *         description: id inválido
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 *       404:
 *         description: Notificação não encontrada
 */
router.patch(
  '/:id/lida',
  authenticate,
  authorize('manutencao', 'admin'),
  validate({ params: notificacaoIdParamSchema }),
  NotificacaoController.marcarLida
);

/**
 * @openapi
 * /notificacoes/lida:
 *   patch:
 *     summary: Marca todas as notificações não lidas como lidas
 *     tags:
 *       - Notificações
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quantidade de notificações atualizadas
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 */
router.patch('/lida', authenticate, authorize('manutencao', 'admin'), NotificacaoController.marcarTodasLidas);

export default router;
