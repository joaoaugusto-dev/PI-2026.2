import { Request, Response, NextFunction } from 'express';
import * as importacaoService from '../services/importacaoService.js';
import { sendSuccess } from '../utils/response.js';
import { montarCsv } from '../utils/csv.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../middlewares/logger.js';
import type { RecursoImportavel } from '../validators/importacaoValidator.js';

export class ImportacaoController {
  /**
   * POST /v1/importacoes/:recurso
   */
  static async importar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { recurso } = req.params as { recurso: RecursoImportavel };
      // sem o Content-Type de CSV o express.raw não lê o corpo e req.body não é Buffer
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw new ValidationError('Envie o arquivo CSV no corpo da requisição (Content-Type: text/csv)');
      }

      const relatorio = await importacaoService.importar(recurso, req.body, req.usuario!.id);
      logger.info(
        { evento: 'importacao_csv', recurso, usuarioId: req.usuario?.id, ...relatorio.resumo },
        'Importação por CSV'
      );
      return sendSuccess(res, relatorio, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /v1/importacoes/:recurso/modelo
   */
  static async modelo(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { recurso } = req.params as { recurso: RecursoImportavel };
      const { cabecalho, exemplo } = importacaoService.modelo(recurso);
      res.attachment(`modelo-${recurso}.csv`);
      return res.type('text/csv; charset=utf-8').send(montarCsv(cabecalho, [exemplo]));
    } catch (error) {
      return next(error);
    }
  }
}
