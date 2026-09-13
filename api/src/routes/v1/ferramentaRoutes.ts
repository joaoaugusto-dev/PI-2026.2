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

// Todas as rotas de ferramentas exigem usuário autenticado
router.use(authenticate);

/**
 * @openapi
 * /ferramentas:
 *   get:
 *     summary: Lista ferramentas ativas com filtros avançados (q, status, categoria_id, setor_id, ordenação e paginação)
 *     tags:
 *       - Ferramentas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: q
 *         description: Busca textual em nome, marca, modelo, localização ou código
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [disponivel, em_uso, indisponivel]
 *       - in: query
 *         name: categoria_id
 *         description: ID do grupo/categoria de ferramentas
 *         schema:
 *           type: integer
 *       - in: query
 *         name: grupo_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: setor_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sort
 *         description: Campo e direção de ordenação (ex nome:asc, status:desc, codigo:asc, created_at:desc)
 *         schema:
 *           type: string
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
 *               ehKit:
 *                 type: boolean
 *               valorAquisicao:
 *                 type: number
 *               fotoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ferramenta criada com sucesso
 *       400:
 *         description: Erro de validação nos campos
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Acesso restrito a almoxarifes
 */
router
  .route('/')
  .get(validate({ query: listarFerramentasQuerySchema }), FerramentaController.listar)
  .post(
    authorize('almoxarife'),
    validate({ body: criarFerramentaSchema }),
    FerramentaController.criar
  );

/**
 * @openapi
 * /ferramentas/por-codigo/{codigo}:
 *   get:
 *     summary: Busca uma ferramenta pelo código de identificação (Code128 / leitor de código de barras)
 *     tags:
 *       - Ferramentas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         required: true
 *         description: Código numérico de identificação (ex 1, 0001, SF000001)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ferramenta encontrada com detalhe de itens (kit) e empréstimo ativo
 *       404:
 *         description: Ferramenta não encontrada para o código informado
 */
router.get(
  '/por-codigo/:codigo',
  validate({ params: ferramentaCodigoParamSchema }),
  FerramentaController.buscarPorCodigo
);

// Alias para compatibilidade com rotas sem hífen
router.get(
  '/porcodigo/:codigo',
  validate({ params: ferramentaCodigoParamSchema }),
  FerramentaController.buscarPorCodigo
);

/**
 * @openapi
 * /ferramentas/{id}/historico:
 *   get:
 *     summary: Retorna o histórico de movimentações (empréstimos e ocorrências) de uma ferramenta
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
 *         description: Histórico de empréstimos e ocorrências da ferramenta
 *       404:
 *         description: Ferramenta não encontrada
 */
router.get(
  '/:id/historico',
  validate({ params: ferramentaIdParamSchema }),
  FerramentaController.buscarHistorico
);

/**
 * @openapi
 * /ferramentas/{id}:
 *   get:
 *     summary: Busca detalhes completos de uma ferramenta pelo ID
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
 *         description: Ferramenta encontrada com itens de kit e empréstimo ativo se houver
 *       404:
 *         description: Ferramenta não encontrada
 */
router.get(
  '/:id',
  validate({ params: ferramentaIdParamSchema }),
  FerramentaController.buscarPorId
);

export default router;

