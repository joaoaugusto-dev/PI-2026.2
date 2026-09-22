import { Router } from 'express';
import { SetorController } from '../../controllers/auxiliaresController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listarAuxiliaresQuerySchema,
  auxiliarIdParamSchema,
  criarSetorSchema,
  atualizarSetorSchema,
} from '../../validators/auxiliaresValidator.js';

const router = Router();

/**
 * @openapi
 * /setores:
 *   get:
 *     summary: Lista os setores cadastrados (paginado, busca textual por nome)
 *     tags:
 *       - Setores
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
 *         description: Busca textual pelo nome do setor
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
 *         description: Lista paginada de setores
 *       401:
 *         description: Token inválido ou não fornecido
 *   post:
 *     summary: Cadastra um novo setor
 *     tags:
 *       - Setores
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
 *         description: Setor criado com sucesso
 *       400:
 *         description: Erro de validação
 *       409:
 *         description: Setor com este nome já existe
 */
router
  .route('/')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ query: listarAuxiliaresQuerySchema }),
    SetorController.listar
  )
  .post(
    authenticate,
    authorize('almoxarife'),
    validate({ body: criarSetorSchema }),
    SetorController.criar
  );

/**
 * @openapi
 * /setores/{id}:
 *   get:
 *     summary: Busca um setor pelo ID
 *     tags:
 *       - Setores
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
 *         description: Detalhes do setor
 *       404:
 *         description: Setor não encontrado
 *   put:
 *     summary: Atualiza os dados de um setor
 *     tags:
 *       - Setores
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
 *         description: Setor atualizado com sucesso
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Setor não encontrado
 *       409:
 *         description: Conflito de nome duplicado
 *   patch:
 *     summary: Atualiza parcialmente os dados de um setor
 *     tags:
 *       - Setores
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
 *         description: Setor atualizado com sucesso
 *   delete:
 *     summary: Desativa logicamente um setor (ativo = false)
 *     tags:
 *       - Setores
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
 *         description: Setor desativado com sucesso
 *       404:
 *         description: Setor não encontrado
 */
router
  .route('/:id')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema }),
    SetorController.buscarPorId
  )
  .put(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema, body: atualizarSetorSchema }),
    SetorController.atualizar
  )
  .patch(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema, body: atualizarSetorSchema }),
    SetorController.atualizar
  )
  .delete(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema }),
    SetorController.excluir
  );

export default router;
