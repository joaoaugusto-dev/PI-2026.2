import { Router } from 'express';
import { UsuarioController } from '../../controllers/usuarioController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { listarUsuariosQuerySchema, usuarioIdParamSchema } from '../../validators/usuarioValidator.js';

const router = Router();

/**
 * @openapi
 * /usuarios:
 *   get:
 *     summary: Lista usuários (usuários da manutenção/admins), com filtro por status de aprovação
 *     tags:
 *       - Usuários
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
 *         name: ativo
 *         description: Filtra por status. ativo=false lista cadastros pendentes de aprovação.
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista paginada de usuários
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Apenas admins podem listar usuários
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  validate({ query: listarUsuariosQuerySchema }),
  UsuarioController.listar
);

/**
 * @openapi
 * /usuarios/{id}/ativar:
 *   patch:
 *     summary: Aprova um cadastro pendente de manutenção (ativo = true)
 *     tags:
 *       - Usuários
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
 *         description: Usuário ativado com sucesso
 *       403:
 *         description: Apenas admins podem aprovar cadastros
 *       404:
 *         description: Usuário não encontrado
 *       409:
 *         description: Usuário já está ativo
 */
router.patch(
  '/:id/ativar',
  authenticate,
  authorize('admin'),
  validate({ params: usuarioIdParamSchema }),
  UsuarioController.ativar
);

export default router;
