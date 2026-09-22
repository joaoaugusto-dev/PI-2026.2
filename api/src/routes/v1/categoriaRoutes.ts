import { Router } from 'express';
import { CategoriaController } from '../../controllers/auxiliaresController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listarAuxiliaresQuerySchema,
  auxiliarIdParamSchema,
  criarCategoriaSchema,
  atualizarCategoriaSchema,
} from '../../validators/auxiliaresValidator.js';

const router = Router();

/**
 * @openapi
 * /categorias:
 *   get:
 *     summary: Lista as categorias (grupos de ferramentas) cadastradas
 *     tags:
 *       - Categorias
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
 *         description: Busca textual pelo nome da categoria
 *         schema:
 *           type: string
 *       - in: query
 *         name: incluirInativos
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [nome, id, created_at]
 *     responses:
 *       200:
 *         description: Lista paginada de categorias
 *       401:
 *         description: Token inválido ou não fornecido
 *   post:
 *     summary: Cadastra uma nova categoria
 *     tags:
 *       - Categorias
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
 *             properties:
 *               nome:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoria criada com sucesso
 *       400:
 *         description: Erro de validação
 *       409:
 *         description: Categoria com este nome já existe
 */
router
  .route('/')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ query: listarAuxiliaresQuerySchema }),
    CategoriaController.listar
  )
  .post(
    authenticate,
    authorize('almoxarife'),
    validate({ body: criarCategoriaSchema }),
    CategoriaController.criar
  );

/**
 * @openapi
 * /categorias/{id}:
 *   get:
 *     summary: Busca uma categoria pelo ID
 *     tags:
 *       - Categorias
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
 *         description: Detalhes da categoria
 *       404:
 *         description: Categoria não encontrada
 *   put:
 *     summary: Atualiza os dados de uma categoria
 *     tags:
 *       - Categorias
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
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Categoria atualizada com sucesso
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Categoria não encontrada
 *       409:
 *         description: Conflito de nome duplicado
 *   patch:
 *     summary: Atualiza parcialmente os dados de uma categoria
 *     tags:
 *       - Categorias
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
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Categoria atualizada com sucesso
 *   delete:
 *     summary: Desativa logicamente uma categoria (ativo = false)
 *     tags:
 *       - Categorias
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
 *         description: Categoria desativada com sucesso
 *       404:
 *         description: Categoria não encontrada
 */
router
  .route('/:id')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema }),
    CategoriaController.buscarPorId
  )
  .put(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema, body: atualizarCategoriaSchema }),
    CategoriaController.atualizar
  )
  .patch(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema, body: atualizarCategoriaSchema }),
    CategoriaController.atualizar
  )
  .delete(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema }),
    CategoriaController.excluir
  );

export default router;
