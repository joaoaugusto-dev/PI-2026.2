import { Router } from 'express';
import { EmprestimoController } from '../../controllers/emprestimoController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  criarEmprestimoSchema,
  devolverEmprestimoSchema,
  emprestimoIdParamSchema,
  previsaoSugeridaQuerySchema,
} from '../../validators/emprestimoValidator.js';

const router = Router();

/**
 * @openapi
 * /emprestimos:
 *   post:
 *     summary: Registra a retirada de uma ferramenta
 *     description: >
 *       Endpoint central do sistema. O responsável pelo registro
 *       (usuario_retirada_id) vem sempre do JWT — se o corpo trouxer esse
 *       campo, ele é ignorado (Regra 6). A atividade é opcional (Regra 4).
 *       Quem barra ferramenta indisponível é o banco (trigger
 *       fn_valida_retirada e índice uq_emprestimo_aberto); a API devolve o erro
 *       como 409 FERRAMENTA_INDISPONIVEL. previsaoDevolucao aceita data e hora
 *       (ISO 8601) ou só a data (YYYY-MM-DD, valendo até 23:59 de Brasília).
 *     tags:
 *       - Empréstimos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ferramentaId
 *               - colaboradorId
 *               - setorDestinoId
 *               - previsaoDevolucao
 *             properties:
 *               ferramentaId:
 *                 type: integer
 *               itemKitId:
 *                 type: integer
 *                 description: Peça avulsa de um kit; omitir para ferramenta simples ou kit inteiro
 *               colaboradorId:
 *                 type: integer
 *               setorDestinoId:
 *                 type: integer
 *               atividadeId:
 *                 type: integer
 *               atividadeObservacao:
 *                 type: string
 *               ordemServico:
 *                 type: string
 *               observacoesRetirada:
 *                 type: string
 *               previsaoDevolucao:
 *                 type: string
 *                 example: "2026-10-05"
 *     responses:
 *       201:
 *         description: Retirada registrada (empréstimo com nomes resolvidos)
 *       400:
 *         description: Erro de validação nos campos
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 *       404:
 *         description: Ferramenta, colaborador, setor, atividade ou item do kit não encontrado
 *       409:
 *         description: Ferramenta indisponível ou já emprestada (FERRAMENTA_INDISPONIVEL)
 */
router.post(
  '/',
  authenticate,
  authorize('manutencao'),
  validate({ body: criarEmprestimoSchema }),
  EmprestimoController.criar
);

/**
 * @openapi
 * /emprestimos/previsao-sugerida:
 *   get:
 *     summary: Sugere a previsão de devolução (hoje + N dias úteis)
 *     description: >
 *       N é quantos dias a pessoa que retira vai ficar com a ferramenta. Pula
 *       sábados, domingos e feriados nacionais (ex.: retirada na sexta por 2
 *       dias → devolução na terça). O front usa o resultado como valor inicial
 *       editável do campo previsaoDevolucao.
 *     tags:
 *       - Empréstimos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dias
 *         required: true
 *         description: Quantidade de dias úteis a somar (1 a 30)
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Data sugerida no formato YYYY-MM-DD
 *       400:
 *         description: Parâmetro dias ausente ou inválido
 *       401:
 *         description: Token inválido ou não fornecido
 */
router.get(
  '/previsao-sugerida',
  authenticate,
  authorize('manutencao'),
  validate({ query: previsaoSugeridaQuerySchema }),
  EmprestimoController.previsaoSugerida
);

/**
 * @openapi
 * /emprestimos/{id}/devolucao:
 *   patch:
 *     summary: Registra a devolução de um empréstimo
 *     description: >
 *       Fecha o empréstimo. O responsável (usuario_devolucao_id) vem sempre do
 *       JWT — se o corpo trouxer esse campo, ele é ignorado (Regra 6). Quem
 *       muda o status da ferramenta e abre a ocorrência em caso de avaria ou
 *       perda são os triggers fn_sync_status_ferramenta e fn_abre_ocorrencia,
 *       disparados por este UPDATE (Regra 3).
 *     tags:
 *       - Empréstimos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do empréstimo
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - condicaoDevolucao
 *             properties:
 *               condicaoDevolucao:
 *                 type: string
 *                 enum: [ok, avaria, perda]
 *               observacaoDevolucao:
 *                 type: string
 *     responses:
 *       200:
 *         description: >
 *           Devolução registrada (empréstimo com nomes resolvidos e um campo
 *           `resumo` já pronto para confirmação no front, ex. "Ferramenta X
 *           foi para indisponível por avaria.")
 *       400:
 *         description: Erro de validação nos campos
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão
 *       404:
 *         description: Empréstimo não encontrado (EMPRESTIMO_NOT_FOUND)
 *       409:
 *         description: Empréstimo já devolvido (EMPRESTIMO_JA_DEVOLVIDO)
 */
router.patch(
  '/:id/devolucao',
  authenticate,
  authorize('manutencao'),
  validate({ params: emprestimoIdParamSchema, body: devolverEmprestimoSchema }),
  EmprestimoController.devolver
);

export default router;
