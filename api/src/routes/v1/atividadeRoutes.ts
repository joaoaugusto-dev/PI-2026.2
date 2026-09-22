import { Router } from 'express';
import { AtividadeController } from '../../controllers/auxiliaresController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listarAuxiliaresQuerySchema,
  auxiliarIdParamSchema,
  criarAtividadeSchema,
  atualizarAtividadeSchema,
} from '../../validators/auxiliaresValidator.js';

const router = Router();

/**
 * @openapi
 * /atividades:
 *   get:
 *     summary: Lista as atividades cadastradas
 *     tags:
 *       - Atividades
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
 *         description: Busca textual por nome ou descrição da atividade
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
 *         description: Lista paginada de atividades
 *       401:
 *         description: Token inválido ou não fornecido
 *   post:
 *     summary: Cadastra uma nova atividade
 *     tags:
 *       - Atividades
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
 *               descricao:
 *                 type: string
 *     responses:
 *       201:
 *         description: Atividade criada com sucesso
 *       400:
 *         description: Erro de validação
 *       409:
 *         description: Atividade com este nome já existe
 */
router
  .route('/')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ query: listarAuxiliaresQuerySchema }),
    AtividadeController.listar
  )
  .post(
    authenticate,
    authorize('almoxarife'),
    validate({ body: criarAtividadeSchema }),
    AtividadeController.criar
  );

/**
 * @openapi
 * /atividades/{id}:
 *   get:
 *     summary: Busca uma atividade pelo ID
 *     tags:
 *       - Atividades
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
 *         description: Detalhes da atividade
 *       404:
 *         description: Atividade não encontrada
 *   put:
 *     summary: Atualiza os dados de uma atividade
 *     tags:
 *       - Atividades
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
 *               descricao:
 *                 type: string
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Atividade atualizada com sucesso
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Atividade não encontrada
 *       409:
 *         description: Conflito de nome duplicado
 *   patch:
 *     summary: Atualiza parcialmente os dados de uma atividade
 *     tags:
 *       - Atividades
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
 *               descricao:
 *                 type: string
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Atividade atualizada com sucesso
 *   delete:
 *     summary: Desativa logicamente uma atividade (ativo = false)
 *     tags:
 *       - Atividades
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
 *         description: Atividade desativada com sucesso
 *       404:
 *         description: Atividade não encontrada
 */
router
  .route('/:id')
  .get(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema }),
    AtividadeController.buscarPorId
  )
  .put(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema, body: atualizarAtividadeSchema }),
    AtividadeController.atualizar
  )
  .patch(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema, body: atualizarAtividadeSchema }),
    AtividadeController.atualizar
  )
  .delete(
    authenticate,
    authorize('almoxarife'),
    validate({ params: auxiliarIdParamSchema }),
    AtividadeController.excluir
  );

export default router;
