import { Router } from 'express';
import { FerramentaController } from '../../controllers/ferramentaController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listarFerramentasQuerySchema,
  ferramentaIdParamSchema,
  ferramentaCodigoParamSchema,
  criarFerramentaSchema,
} from '../../validators/ferramentaValidator.js';

const router = Router();

/**
 * @openapi
 * /ferramentas:
 *   get:
 *     summary: Lista as ferramentas ativas do almoxarifado (paginado, filtro opcional por status)
 *     tags:
 *       - Ferramentas
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
 *         description: Filtra pelo grupo de ferramentas (antigo "categoria")
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [nome, status]
 *     responses:
 *       200:
 *         description: Lista paginada de ferramentas
 *       401:
 *         description: Token inválido ou não fornecido
 *   post:
 *     summary: Cadastra uma nova ferramenta
 *     tags:
 *       - Ferramentas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - grupoId
 *             properties:
 *               nome:
 *                 type: string
 *               descricao:
 *                 type: string
 *               marca:
 *                 type: string
 *               modelo:
 *                 type: string
 *               grupoId:
 *                 type: integer
 *               subgrupoId:
 *                 type: integer
 *               setorId:
 *                 type: integer
 *               localizacao:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ferramenta criada com sucesso
 *       400:
 *         description: Erro de validação nos campos
 *       401:
 *         description: Token inválido ou não fornecido
 */
router
  .route('/')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ query: listarFerramentasQuerySchema }),
    FerramentaController.listar
  )
  .post(
    authenticate,
    authorize('almoxarife'),
    validate({ body: criarFerramentaSchema }),
    FerramentaController.criar
  );

/**
 * @openapi
 * /ferramentas/por-codigo/{codigo}:
 *   get:
 *     summary: Busca uma ferramenta pelo código de identificação (usado pela leitura de código de barras)
 *     tags:
 *       - Ferramentas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 9999
 *     responses:
 *       200:
 *         description: Ferramenta encontrada
 *       404:
 *         description: Ferramenta não encontrada
 */
router.get(
  '/por-codigo/:codigo',
  authenticate,
  authorize('almoxarife'),
  validate({ params: ferramentaCodigoParamSchema }),
  FerramentaController.buscarPorCodigo
);

/**
 * @openapi
 * /ferramentas/{id}:
 *   get:
 *     summary: Busca uma ferramenta pelo ID
 *     tags:
 *       - Ferramentas
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
 *         description: Ferramenta encontrada
 *       404:
 *         description: Ferramenta não encontrada
 */
router.get(
  '/:id',
  authenticate,
  authorize('almoxarife'),
  validate({ params: ferramentaIdParamSchema }),
  FerramentaController.buscarPorId
);

/**
 * @openapi
 * /ferramentas/{id}/historico:
 *   get:
 *     summary: Histórico de empréstimos e ocorrências de uma ferramenta
 *     tags:
 *       - Ferramentas
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
 *         description: Histórico encontrado
 *       404:
 *         description: Ferramenta não encontrada
 */
router.get(
  '/:id/historico',
  authenticate,
  authorize('almoxarife'),
  validate({ params: ferramentaIdParamSchema }),
  FerramentaController.historico
);

export default router;
