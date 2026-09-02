import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function authorize(...rolesPermitidos: Array<'almoxarife' | 'consulta'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return next(new UnauthorizedError('Usuário não autenticado', 'UNAUTHORIZED'));
    }

    if (!rolesPermitidos.includes(req.usuario.papel)) {
      return next(
        new ForbiddenError(
          `Perfil '${req.usuario.papel}' não possui permissão para acessar esta rota`,
          'ACCESS_DENIED',
          [{ requiredRoles: rolesPermitidos, userRole: req.usuario.papel }]
        )
      );
    }

    return next();
  };
}
