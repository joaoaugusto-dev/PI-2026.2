import { Router } from 'express';
import { KpiController } from '../../controllers/kpiController.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import {
  kpiAbertosQuerySchema,
  kpiAgrupadoQuerySchema,
  kpiEvolucaoQuerySchema,
  kpiPeriodoQuerySchema,
  kpiRankingQuerySchema,
} from '../../validators/kpiValidator.js';

const router = Router();

// KPIs de gestão (issue #208). Só manutenção e admin: o perfil consulta nunca vê. Os de período exigem
// de/ate (AAAA-MM-DD, inclusivos, fuso de Brasília, até 366 dias); os dois "agora" não têm período.
const leitura = [authenticate, authorize('manutencao', 'admin')];

/**
 * @openapi
 * /kpis/ferramentas-mais-retiradas:
 *   get:
 *     summary: Ferramentas mais retiradas no período
 *     description: >
 *       Ranking de ferramentas por número de retiradas (data_retirada entre de e ate), da mais para a menos
 *       retirada. Cada item traz ferramenta_id, ferramenta_nome, codigo_identificacao, categoria_nome e total_retiradas.
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: de
 *         required: true
 *         description: Primeiro dia do período, AAAA-MM-DD (fuso de Brasília)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: ate
 *         required: true
 *         description: Último dia do período (inclusive), AAAA-MM-DD. O período vai até 366 dias
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         description: Itens do ranking (padrão 10, máximo 50)
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: "{ periodo, itens }"
 *       400:
 *         description: de/ate ausentes ou inválidos, de depois de ate, período acima de 366 dias ou limit fora do intervalo
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/ferramentas-mais-retiradas', ...leitura, validate({ query: kpiRankingQuerySchema }), KpiController.ferramentasMaisRetiradas);

/**
 * @openapi
 * /kpis/categorias-mais-utilizadas:
 *   get:
 *     summary: Categorias mais utilizadas no período
 *     description: >
 *       O mesmo ranking de retiradas, agrupado por categoria (categoria_id, categoria_nome e total_retiradas).
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: de
 *         required: true
 *         description: Primeiro dia do período, AAAA-MM-DD (fuso de Brasília)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: ate
 *         required: true
 *         description: Último dia do período (inclusive), AAAA-MM-DD. O período vai até 366 dias
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         description: Itens do ranking (padrão 10, máximo 50)
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: "{ periodo, itens }"
 *       400:
 *         description: de/ate ausentes ou inválidos, de depois de ate, período acima de 366 dias ou limit fora do intervalo
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/categorias-mais-utilizadas', ...leitura, validate({ query: kpiRankingQuerySchema }), KpiController.categoriasMaisUtilizadas);

/**
 * @openapi
 * /kpis/tempo-medio-posse:
 *   get:
 *     summary: Tempo médio de posse das ferramentas
 *     description: >
 *       Média entre retirada e devolução dos empréstimos devolvidos entre de e ate (horas_medias e dias_medios),
 *       do maior para o menor tempo. agrupar=categoria (padrão) ou ferramenta.
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: de
 *         required: true
 *         description: Primeiro dia do período, AAAA-MM-DD (fuso de Brasília)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: ate
 *         required: true
 *         description: Último dia do período (inclusive), AAAA-MM-DD. O período vai até 366 dias
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: agrupar
 *         schema: { type: string, enum: [categoria, ferramenta], default: categoria }
 *       - in: query
 *         name: limit
 *         description: Itens do ranking (padrão 10, máximo 50)
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: "{ periodo, agrupar, itens }"
 *       400:
 *         description: de/ate ausentes ou inválidos, de depois de ate, período acima de 366 dias, agrupar desconhecido ou limit fora do intervalo
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/tempo-medio-posse', ...leitura, validate({ query: kpiAgrupadoQuerySchema }), KpiController.tempoMedioPosse);

/**
 * @openapi
 * /kpis/avarias-por-categoria:
 *   get:
 *     summary: Ocorrências de avaria por categoria
 *     description: >
 *       Total de ocorrências do tipo AVARIA abertas entre de e ate, por categoria (da que mais avaria para a que
 *       menos), e a soma geral em total. Categorias sem avaria no período não aparecem.
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: de
 *         required: true
 *         description: Primeiro dia do período, AAAA-MM-DD (fuso de Brasília)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: ate
 *         required: true
 *         description: Último dia do período (inclusive), AAAA-MM-DD. O período vai até 366 dias
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: "{ periodo, total, itens }"
 *       400:
 *         description: de/ate ausentes ou inválidos, de depois de ate ou período acima de 366 dias
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/avarias-por-categoria', ...leitura, validate({ query: kpiPeriodoQuerySchema }), KpiController.avariasPorCategoria);

/**
 * @openapi
 * /kpis/perdas-por-categoria:
 *   get:
 *     summary: Ocorrências de perda por categoria
 *     description: >
 *       Total de ocorrências do tipo PERDA abertas entre de e ate, por categoria (da que mais perde para a que
 *       menos), e a soma geral em total. Categorias sem perda no período não aparecem.
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: de
 *         required: true
 *         description: Primeiro dia do período, AAAA-MM-DD (fuso de Brasília)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: ate
 *         required: true
 *         description: Último dia do período (inclusive), AAAA-MM-DD. O período vai até 366 dias
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: "{ periodo, total, itens }"
 *       400:
 *         description: de/ate ausentes ou inválidos, de depois de ate ou período acima de 366 dias
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/perdas-por-categoria', ...leitura, validate({ query: kpiPeriodoQuerySchema }), KpiController.perdasPorCategoria);

/**
 * @openapi
 * /kpis/taxa-avaria:
 *   get:
 *     summary: Taxa de avaria
 *     description: >
 *       Devoluções com avaria divididas pelas devoluções feitas entre de e ate (taxa_avaria de 0 a 1 e percentual),
 *       da maior para a menor taxa. agrupar=categoria (padrão) ou ferramenta. Só entram grupos com devolução no período.
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: de
 *         required: true
 *         description: Primeiro dia do período, AAAA-MM-DD (fuso de Brasília)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: ate
 *         required: true
 *         description: Último dia do período (inclusive), AAAA-MM-DD. O período vai até 366 dias
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: agrupar
 *         schema: { type: string, enum: [categoria, ferramenta], default: categoria }
 *       - in: query
 *         name: limit
 *         description: Itens do ranking (padrão 10, máximo 50)
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: "{ periodo, agrupar, itens }"
 *       400:
 *         description: de/ate ausentes ou inválidos, de depois de ate, período acima de 366 dias, agrupar desconhecido ou limit fora do intervalo
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/taxa-avaria', ...leitura, validate({ query: kpiAgrupadoQuerySchema }), KpiController.taxaAvaria);

/**
 * @openapi
 * /kpis/indisponiveis:
 *   get:
 *     summary: Ferramentas indisponíveis agora
 *     description: >
 *       Instantâneo, sem filtro de período. Total de ferramentas ativas, quantas estão indisponíveis, o percentual
 *       do parque e a divisão por motivo (avaria, perda, manutencao_preventiva, baixada).
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ total_cadastradas, total_indisponiveis, percentual_do_parque, por_motivo }"
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/indisponiveis', ...leitura, KpiController.indisponiveis);

/**
 * @openapi
 * /kpis/emprestimos-abertos:
 *   get:
 *     summary: Empréstimos abertos agora
 *     description: >
 *       Instantâneo, sem filtro de período. Total de empréstimos em aberto, quantos estão atrasados e os mais antigos
 *       (sem o colaborador).
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Quantos dos mais antigos devolver (padrão 5, máximo 50)
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: "{ total, atrasados, mais_antigos }"
 *       400:
 *         description: limit fora do intervalo
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/emprestimos-abertos', ...leitura, validate({ query: kpiAbertosQuerySchema }), KpiController.emprestimosAbertos);

/**
 * @openapi
 * /kpis/evolucao:
 *   get:
 *     summary: Evolução de retiradas, devoluções e ocorrências
 *     description: >
 *       Série por dia, semana (começa na segunda) ou mês, com zero nos baldes sem movimento. Traz também os totais
 *       do período e do período anterior (mesmo número de dias, logo antes de "de") e a variação percentual
 *       (null quando o anterior é 0).
 *     tags:
 *       - KPIs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: de
 *         required: true
 *         description: Primeiro dia do período, AAAA-MM-DD (fuso de Brasília)
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: ate
 *         required: true
 *         description: Último dia do período (inclusive), AAAA-MM-DD. O período vai até 366 dias
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: granularidade
 *         schema: { type: string, enum: [dia, semana, mes], default: dia }
 *     responses:
 *       200:
 *         description: "{ periodo, periodo_anterior, granularidade, serie, totais, variacao_percentual }"
 *       400:
 *         description: de/ate ausentes ou inválidos, de depois de ate, período acima de 366 dias ou granularidade desconhecida
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Perfil sem permissão (consulta)
 */
router.get('/evolucao', ...leitura, validate({ query: kpiEvolucaoQuerySchema }), KpiController.evolucao);

export default router;
