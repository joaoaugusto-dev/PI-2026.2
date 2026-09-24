import { Router } from 'express';
import { ColaboradorController } from '../../controllers/colaboradorController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listarColaboradoresQuerySchema,
  identificarColaboradorQuerySchema,
  colaboradorIdParamSchema,
  criarColaboradorSchema,
  editarColaboradorSchema,
} from '../../validators/colaboradorValidator.js';

const router = Router();

/**
 * @openapi
 * /colaboradores:
 *   get:
 *     summary: Lista os colaboradores ativos (paginado, filtro opcional por texto/setor)
 *     tags:
 *       - Colaboradores
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
 *         name: q
 *         description: Busca textual por nome ou matrícula
 *         schema:
 *           type: string
 *       - in: query
 *         name: setorId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [nome, matricula]
 *     responses:
 *       200:
 *         description: Lista paginada de colaboradores
 *       401:
 *         description: Token inválido ou não fornecido
 *   post:
 *     summary: Cadastro rápido de colaborador (matrícula, nome e setor)
 *     tags:
 *       - Colaboradores
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
 *               - matricula
 *               - setorId
 *             properties:
 *               nome:
 *                 type: string
 *               matricula:
 *                 type: string
 *               setorId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Colaborador criado com sucesso
 *       400:
 *         description: Erro de validação nos campos
 *       401:
 *         description: Token inválido ou não fornecido
 *       409:
 *         description: Matrícula já cadastrada
 */
router
  .route('/')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ query: listarColaboradoresQuerySchema }),
    ColaboradorController.listar
  )
  .post(
    authenticate,
    authorize('almoxarife'),
    validate({ body: criarColaboradorSchema }),
    ColaboradorController.criar
  );

/**
 * @openapi
 * /colaboradores/identificar:
 *   get:
 *     summary: Resolve um colaborador por matrícula exata ou nome (tolerante a acento/erro de digitação)
 *     description: >
 *       Endpoint central do fluxo de retirada (Regra 5 do CLAUDE.md). Tenta
 *       matrícula exata primeiro (mesmo valor do crachá — não existe
 *       codigo_cracha separado); se não achar, busca por nome usando
 *       unaccent + pg_trgm. Retorna 404 se nada for encontrado, sinal para o
 *       front abrir o cadastro rápido (POST /v1/colaboradores).
 *     tags:
 *       - Colaboradores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: termo
 *         required: true
 *         description: Matrícula ou nome (completo ou parcial) do colaborador
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Colaborador encontrado
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Nenhum colaborador encontrado para o termo informado
 */
router.get(
  '/identificar',
  authenticate,
  authorize('almoxarife'),
  validate({ query: identificarColaboradorQuerySchema }),
  ColaboradorController.identificar
);

/**
 * @openapi
 * /colaboradores/{id}:
 *   get:
 *     summary: Busca um colaborador pelo ID
 *     tags:
 *       - Colaboradores
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
 *         description: Colaborador encontrado
 *       404:
 *         description: Colaborador não encontrado
 */
router.get(
  '/:id',
  authenticate,
  authorize('almoxarife'),
  validate({ params: colaboradorIdParamSchema }),
  ColaboradorController.buscarPorId
);

/**
 * @openapi
 * /colaboradores/{id}:
 *   patch:
 *     summary: Atualiza os campos editáveis de um colaborador
 *     tags:
 *       - Colaboradores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               matricula:
 *                 type: string
 *               setorId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Colaborador atualizado com sucesso
 *       400:
 *         description: Erro de validação nos campos
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Colaborador não encontrado
 *       409:
 *         description: Matrícula já cadastrada para outro colaborador
 */
router.patch(
  '/:id',
  authenticate,
  authorize('almoxarife'),
  validate({ params: colaboradorIdParamSchema, body: editarColaboradorSchema }),
  ColaboradorController.atualizar
);

/**
 * @openapi
 * /colaboradores/{id}:
 *   delete:
 *     summary: Inativa um colaborador (ativo = false); nunca apaga o registro
 *     tags:
 *       - Colaboradores
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
 *         description: Colaborador inativado com sucesso
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Colaborador não encontrado
 */
router.delete(
  '/:id',
  authenticate,
  authorize('almoxarife'),
  validate({ params: colaboradorIdParamSchema }),
  ColaboradorController.inativar
);

export default router;
