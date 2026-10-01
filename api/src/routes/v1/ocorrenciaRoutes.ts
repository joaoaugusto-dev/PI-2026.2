import { Router } from 'express';
import { OcorrenciaController } from '../../controllers/ocorrenciaController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listarOcorrenciasQuerySchema,
  ocorrenciaIdParamSchema,
  atualizarOcorrenciaSchema,
} from '../../validators/ocorrenciaValidator.js';

const router = Router();

/**
 * @openapi
 * /ocorrencias:
 *   get:
 *     summary: Lista as ocorrências de avaria/perda para acompanhamento da tratativa
 *     description: >
 *       Suporta filtro por status, colaborador e tipo. Sem filtro de status,
 *       traz o histórico completo (inclusive já resolvidas ou baixadas) — o
 *       objetivo é acompanhar e fechar as tratativas, não só as pendentes.
 *     tags:
 *       - Ocorrências
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
 *           enum: [aberta, em_reparo, cobrada, resolvida, baixada]
 *       - in: query
 *         name: colaboradorId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [AVARIA, PERDA]
 *     responses:
 *       200:
 *         description: Lista paginada de ocorrências, com nomes de ferramenta e colaborador resolvidos
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
  validate({ query: listarOcorrenciasQuerySchema }),
  OcorrenciaController.listar
);

/**
 * @openapi
 * /ocorrencias/{id}:
 *   patch:
 *     summary: Atualiza a tratativa de uma ocorrência (status, custo estimado e observações)
 *     description: >
 *       resolvida_por e data_resolucao nunca vêm do corpo (Regra 6) — são
 *       preenchidos a partir do usuário logado quando o status muda para
 *       'resolvida'. Não é possível retroceder o status (por exemplo, de
 *       'resolvida' para 'em_reparo'); a tentativa devolve 409
 *       OCORRENCIA_TRANSICAO_INVALIDA. Ao resolver, se a ferramenta ainda
 *       estiver indisponível, a resposta traz
 *       sugestao_disponibilizar_ferramenta_id com o id dela — uma sugestão
 *       para o front chamar PATCH /v1/ferramentas/:id/disponibilizar, sem
 *       forçar essa chamada.
 *     tags:
 *       - Ocorrências
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da ocorrência
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [aberta, em_reparo, cobrada, resolvida, baixada]
 *               custoEstimado:
 *                 type: number
 *               observacoesResolucao:
 *                 type: string
 *     responses:
 *       200:
 *         description: >
 *           Ocorrência atualizada, com nomes de ferramenta e colaborador
 *           resolvidos e sugestao_disponibilizar_ferramenta_id (ver acima)
 *       400:
 *         description: Erro de validação nos campos (por exemplo, nenhum campo informado)
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 *       404:
 *         description: Ocorrência não encontrada (OCORRENCIA_NOT_FOUND)
 *       409:
 *         description: Tentativa de retroceder o status (OCORRENCIA_TRANSICAO_INVALIDA)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('manutencao', 'admin'),
  validate({ params: ocorrenciaIdParamSchema, body: atualizarOcorrenciaSchema }),
  OcorrenciaController.atualizar
);

export default router;
