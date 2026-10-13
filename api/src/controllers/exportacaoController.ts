import { Request, Response, NextFunction } from 'express';
import * as exportacaoService from '../services/exportacaoService.js';
import type { FiltrosEmprestimos } from '../services/emprestimoService.js';
import type { RecursoExportavel } from '../validators/exportacaoValidator.js';

export class ExportacaoController {
  /**
   * GET /v1/exportacoes/:recurso
   */
  static async exportar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { recurso } = req.params as { recurso: RecursoExportavel };
      const csv = await exportacaoService.exportar(recurso, req.query as FiltrosEmprestimos);
      // data de Brasília no nome do arquivo ('en-CA' formata como AAAA-MM-DD)
      const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      res.attachment(`${recurso}-${hoje}.csv`);
      return res.type('text/csv; charset=utf-8').send(csv);
    } catch (error) {
      return next(error);
    }
  }
}
