import { Router } from 'express';
import { FeriadoController } from '../../controllers/feriadoController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listarFeriadosQuerySchema,
  verificarDiaUtilQuerySchema,
  calcularDiasUteisQuerySchema,
} from '../../validators/feriadoValidator.js';

const router = Router();

/**
 * @openapi
 * /feriados:
 *   get:
 *     summary: Lista os feriados nacionais de um ano (cache local; sincroniza com a BrasilAPI se vazio)
 *     tags:
 *       - Feriados
 *     parameters:
 *       - in: query
 *         name: ano
 *         schema:
 *           type: integer
 *           example: 2026
 *     responses:
 *       200:
 *         description: Lista de feriados do ano, com a fonte usada (cache, brasil_api ou fallback_fim_de_semana)
 *       400:
 *         description: Parâmetro "ano" inválido
 */
router.get('/', validate({ query: listarFeriadosQuerySchema }), FeriadoController.listar);

/**
 * @openapi
 * /feriados/dia-util:
 *   get:
 *     summary: Verifica se uma data é dia útil (não é fim de semana nem feriado nacional)
 *     tags:
 *       - Feriados
 *     parameters:
 *       - in: query
 *         name: data
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-09-07"
 *     responses:
 *       200:
 *         description: Resultado da verificação de dia útil
 *       400:
 *         description: Parâmetro "data" inválido
 */
router.get('/dia-util', validate({ query: verificarDiaUtilQuerySchema }), FeriadoController.verificarDiaUtil);

/**
 * @openapi
 * /feriados/dias-uteis:
 *   get:
 *     summary: Calcula a data final somando N dias úteis a partir de uma data inicial (pula fins de semana e feriados)
 *     tags:
 *       - Feriados
 *     parameters:
 *       - in: query
 *         name: dataInicio
 *         required: true
 *         schema:
 *           type: string
 *           example: "2026-04-20"
 *       - in: query
 *         name: dias
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2
 *     responses:
 *       200:
 *         description: Data calculada considerando dias úteis
 *       400:
 *         description: Parâmetros inválidos
 */
router.get('/dias-uteis', validate({ query: calcularDiasUteisQuerySchema }), FeriadoController.calcularDiasUteis);


/**
 * @openapi
 * /feriados/sincronizar:
 *   post:
 *     summary: Força a sincronização dos feriados de um ano diretamente na BrasilAPI
 *     tags:
 *       - Feriados
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ano
 *         schema:
 *           type: integer
 *           example: 2026
 *     responses:
 *       200:
 *         description: Feriados sincronizados com sucesso
 *       401:
 *         description: Token inválido ou não fornecido
 *       502:
 *         description: BrasilAPI indisponível
 */
router.post(
  '/sincronizar',
  authenticate,
  authorize('manutencao'),
  validate({ query: listarFeriadosQuerySchema }),
  FeriadoController.sincronizar
);

export default router;
