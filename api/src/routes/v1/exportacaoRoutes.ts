import { Router } from 'express';
import { ExportacaoController } from '../../controllers/exportacaoController.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { exportacaoQuerySchema, recursoExportacaoParamSchema } from '../../validators/exportacaoValidator.js';

const router = Router();

/**
 * @openapi
 * /exportacoes/{recurso}:
 *   get:
 *     summary: Exporta um recurso como CSV para download
 *     description: >
 *       Arquivo CSV em UTF-8 com BOM, separado por ";", pronto para abrir no
 *       Excel. Cadastros (ferramentas, colaboradores, categorias, setores)
 *       saem só com os registros ativos e com o cabeçalho do modelo de
 *       importação, para poderem ser editados e reenviados em
 *       POST /importacoes/{recurso}. emprestimos sai com as mesmas colunas da
 *       tela de histórico e aceita os mesmos filtros de GET /emprestimos
 *       (q, situacao, setorId), até 50 mil linhas.
 *     tags:
 *       - Exportações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recurso
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ferramentas, colaboradores, categorias, setores, emprestimos]
 *       - in: query
 *         name: q
 *         description: Só para emprestimos. Busca por ferramenta, colaborador, matrícula ou código
 *         schema:
 *           type: string
 *       - in: query
 *         name: situacao
 *         description: Só para emprestimos
 *         schema:
 *           type: string
 *           enum: [em_aberto, atrasado, devolvido]
 *       - in: query
 *         name: setorId
 *         description: Só para emprestimos
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Arquivo CSV
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Recurso desconhecido ou filtro inválido
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get(
  '/:recurso',
  authenticate,
  authorize('manutencao', 'admin'),
  validate({ params: recursoExportacaoParamSchema, query: exportacaoQuerySchema }),
  ExportacaoController.exportar
);

export default router;
