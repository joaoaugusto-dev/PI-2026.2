import { Router } from 'express';
import { FeriadoController } from '../../controllers/feriadoController.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { listarFeriadosQuerySchema, verificarDiaUtilQuerySchema } from '../../validators/feriadoValidator.js';

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
  authorize('almoxarife'),
  validate({ query: listarFeriadosQuerySchema }),
  FeriadoController.sincronizar
);

export default router;
