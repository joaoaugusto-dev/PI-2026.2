import { Request, Response, NextFunction } from 'express';
import * as kpiService from '../services/kpiService.js';
import { sendSuccess } from '../utils/response.js';
import type { KpiAgrupadoQuery, KpiEvolucaoQuery, KpiPeriodoQuery, KpiRankingQuery } from '../validators/kpiValidator.js';

// As queries chegam já validadas e convertidas pelo middleware validate (datas AAAA-MM-DD, limit numérico,
// agrupar e granularidade com padrão), por isso aqui só se repassa ao service.
const periodo = (q: { de: string; ate: string }) => ({ de: q.de, ate: q.ate });

export class KpiController {
  /** GET /v1/kpis/ferramentas-mais-retiradas */
  static async ferramentasMaisRetiradas(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const q = req.query as unknown as KpiRankingQuery;
      return sendSuccess(res, await kpiService.ferramentasMaisRetiradas(periodo(q), q.limit));
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/categorias-mais-utilizadas */
  static async categoriasMaisUtilizadas(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const q = req.query as unknown as KpiRankingQuery;
      return sendSuccess(res, await kpiService.categoriasMaisUtilizadas(periodo(q), q.limit));
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/tempo-medio-posse */
  static async tempoMedioPosse(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const q = req.query as unknown as KpiAgrupadoQuery;
      return sendSuccess(res, await kpiService.tempoMedioPosse(periodo(q), q.agrupar, q.limit));
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/avarias-por-categoria */
  static async avariasPorCategoria(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const q = req.query as unknown as KpiPeriodoQuery;
      return sendSuccess(res, await kpiService.avariasPorCategoria(periodo(q)));
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/perdas-por-categoria */
  static async perdasPorCategoria(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const q = req.query as unknown as KpiPeriodoQuery;
      return sendSuccess(res, await kpiService.perdasPorCategoria(periodo(q)));
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/taxa-avaria */
  static async taxaAvaria(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const q = req.query as unknown as KpiAgrupadoQuery;
      return sendSuccess(res, await kpiService.taxaAvaria(periodo(q), q.agrupar, q.limit));
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/indisponiveis */
  static async indisponiveis(_req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      return sendSuccess(res, await kpiService.indisponiveisAgora());
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/emprestimos-abertos */
  static async emprestimosAbertos(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { limit } = req.query as unknown as { limit: number };
      return sendSuccess(res, await kpiService.emprestimosAbertosAgora(limit));
    } catch (error) {
      return next(error);
    }
  }

  /** GET /v1/kpis/evolucao */
  static async evolucao(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const q = req.query as unknown as KpiEvolucaoQuery;
      return sendSuccess(res, await kpiService.evolucao(periodo(q), q.granularidade));
    } catch (error) {
      return next(error);
    }
  }
}
