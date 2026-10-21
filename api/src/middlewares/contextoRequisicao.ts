import { Request, Response, NextFunction } from 'express';
import { contextoRequisicao } from '../config/database.js';

/**
 * Guarda o IP da requisição (req.ip, que respeita `trust proxy`) para a trigger de auditoria gravar em
 * `auditoria.ip_origem`. A leitura acontece em definirUsuarioAuditoria, sem passar `req` por todos os services.
 */
export function registrarContextoRequisicao(req: Request, _res: Response, next: NextFunction) {
  contextoRequisicao.run({ ip: req.ip ?? null }, next);
}
