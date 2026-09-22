import { Router } from 'express';
import { OpcoesController } from '../../controllers/auxiliaresController.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

/**
 * @openapi
 * /opcoes:
 *   get:
 *     summary: Retorna listas consolidadas de setores, categorias e atividades ativas para preenchimento rápido de formulários
 *     tags:
 *       - Opções
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listas de opções retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     setores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           nome: { type: string }
 *                     categorias:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           nome: { type: string }
 *                     atividades:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           nome: { type: string }
 *                           descricao: { type: string, nullable: true }
 *       401:
 *         description: Token inválido ou não fornecido
 */
router.get('/', authenticate, OpcoesController.obterOpcoes);

export default router;
