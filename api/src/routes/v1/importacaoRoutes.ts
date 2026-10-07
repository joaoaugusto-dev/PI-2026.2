import express, { Request, Response, NextFunction, Router } from 'express';
import { ImportacaoController } from '../../controllers/importacaoController.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { papeisImportacao } from '../../services/importacaoService.js';
import { recursoImportacaoParamSchema, RecursoImportavel } from '../../validators/importacaoValidator.js';

const router = Router();

// Tipos com que navegador e Excel costumam mandar um .csv (o Windows com
// Office instalado rotula .csv como application/vnd.ms-excel).
const TIPOS_CSV = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];

// Cada recurso exige os mesmos perfis da rota de cadastro dele: categorias e
// setores são só do admin; ferramentas e colaboradores, manutenção e admin.
const autorizarRecurso = (req: Request, res: Response, next: NextFunction) =>
  authorize(...papeisImportacao(req.params.recurso as RecursoImportavel))(req, res, next);

/**
 * @openapi
 * /importacoes/{recurso}:
 *   post:
 *     summary: Importa registros em lote a partir de um arquivo CSV (DATA-03)
 *     description: >
 *       Corpo é o arquivo CSV cru (Content-Type text/csv, até 2 MB e 5000 linhas),
 *       separado por ";" ou "," (detectado pelo cabeçalho), em UTF-8 ou
 *       Windows-1252 (CSV salvo pelo Excel). Colunas por recurso:
 *       ferramentas = nome*, categoria*, marca, modelo, setor, localizacao, descricao, valor;
 *       colaboradores = matricula*, nome*, setor*; categorias e setores = nome*
 *       (* obrigatória; o modelo de cada um sai em GET /importacoes/{recurso}/modelo).
 *       Colunas desconhecidas são ignoradas e listadas em colunas_ignoradas.
 *       Linhas inválidas são rejeitadas sem bloquear as válidas; linhas que já
 *       existem no banco (ou repetidas no arquivo) são ignoradas, então
 *       reenviar o mesmo arquivo é seguro. Categorias e setores são só do admin.
 *     tags:
 *       - Importações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recurso
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ferramentas, colaboradores, categorias, setores]
 *     requestBody:
 *       required: true
 *       content:
 *         text/csv:
 *           schema:
 *             type: string
 *             example: "nome;categoria;marca;modelo;localizacao;valor\nFuradeira de impacto;Ferramentas Elétricas;Bosch;GSB 13;Armário 2;1.234,56"
 *     responses:
 *       200:
 *         description: Relatório da importação (resumo, aceitas, rejeitadas com motivos, ignoradas)
 *       400:
 *         description: Recurso desconhecido, corpo ausente, arquivo ilegível, vazio, sem colunas obrigatórias ou acima de 5000 linhas
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão para o recurso
 *       413:
 *         description: Arquivo maior que 2 MB
 */
router.post(
  '/:recurso',
  authenticate,
  validate({ params: recursoImportacaoParamSchema }),
  autorizarRecurso,
  express.raw({ type: TIPOS_CSV, limit: '2mb' }),
  ImportacaoController.importar
);

/**
 * @openapi
 * /importacoes/{recurso}/modelo:
 *   get:
 *     summary: Baixa o modelo de CSV do recurso (cabeçalho e uma linha de exemplo)
 *     tags:
 *       - Importações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recurso
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ferramentas, colaboradores, categorias, setores]
 *     responses:
 *       200:
 *         description: Arquivo CSV (UTF-8 com BOM, separado por ";")
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Recurso desconhecido
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão para o recurso
 */
router.get(
  '/:recurso/modelo',
  authenticate,
  validate({ params: recursoImportacaoParamSchema }),
  autorizarRecurso,
  ImportacaoController.modelo
);

export default router;
