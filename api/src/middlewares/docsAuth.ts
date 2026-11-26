import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

const REALM = 'Basic realm="SOUFER Tools API Docs", charset="UTF-8"';

/**
 * Protege o Swagger UI só para admin. A navegação do browser não manda o
 * Bearer guardado pelo front, então a entrada é por HTTP Basic (matrícula +
 * senha do próprio admin), validada pelo mesmo AuthService.login do /v1/auth.
 * O browser reaproveita a credencial nos assets de /docs/*.
 */
export async function docsAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', REALM);
    return next(new UnauthorizedError('Autenticação de admin necessária para a documentação', 'DOCS_AUTH_REQUIRED'));
  }

  const decodificado = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const separador = decodificado.indexOf(':');
  const matricula = separador >= 0 ? decodificado.slice(0, separador) : '';
  const senha = separador >= 0 ? decodificado.slice(separador + 1) : '';

  if (!matricula || !senha) {
    res.setHeader('WWW-Authenticate', REALM);
    return next(new UnauthorizedError('Matrícula ou senha inválidos', 'INVALID_CREDENTIALS'));
  }

  try {
    const { usuario } = await AuthService.login(matricula, senha);
    if (usuario.papel !== 'admin') {
      return next(new ForbiddenError('Documentação disponível apenas para administradores', 'ACCESS_DENIED'));
    }
    return next();
  } catch (err) {
    if (err instanceof UnauthorizedError) res.setHeader('WWW-Authenticate', REALM);
    return next(err);
  }
}
