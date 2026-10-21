import { Router } from 'express';
import { AuditoriaController } from '../../controllers/auditoriaController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { listarAuditoriaQuerySchema } from '../../validators/auditoriaValidator.js';

const router = Router();

/**
 * @openapi
 * /auditoria:
 *   get:
 *     summary: Consulta a trilha de auditoria (quem mudou o quê, antes e depois)
 *     description: >
 *       Somente admin. Cada linha traz a tabela, a operação (INSERT, UPDATE, DELETE ou uma ação de negócio como
 *       disponibilizar), o id do registro e o antes/depois em JSON. No UPDATE, só as colunas que mudaram.
 *       Mais recente primeiro. Os filtros `de` e `ate` são datas AAAA-MM-DD, inclusivas.
 *     tags:
 *       - Auditoria
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
 *           maximum: 100
 *       - in: query
 *         name: tabela
 *         schema:
 *           type: string
 *           enum: [ferramentas, emprestimos, ocorrencias, colaboradores]
 *       - in: query
 *         name: registroId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: operacao
 *         schema:
 *           type: string
 *       - in: query
 *         name: usuarioId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: de
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: ate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista paginada de linhas de auditoria, com o nome do usuário resolvido
 *       400:
 *         description: Erro de validação nos parâmetros
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (só admin)
 */
router.get('/', authenticate, authorize('admin'), validate({ query: listarAuditoriaQuerySchema }), AuditoriaController.listar);

export default router;
