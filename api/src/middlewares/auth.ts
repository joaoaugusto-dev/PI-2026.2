import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { UnauthorizedError } from '../utils/errors.js';
import { UsuarioPayload } from '../types/express.js';

const PAPEIS_VALIDOS: string[] = ['manutencao', 'admin', 'consulta'];

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new UnauthorizedError('Token de autenticação não fornecido', 'TOKEN_NOT_PROVIDED'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new UnauthorizedError('Formato de token inválido. Use "Bearer <token>"', 'TOKEN_MALFORMATTED'));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as UsuarioPayload;

    // Tokens emitidos antes do rename do papel `almoxarife` -> `manutencao`
    // (sessões de 7 dias ainda válidas) carregam um papel que não existe mais.
    // Um 401 faz o front deslogar e pedir novo login; sem isso a pessoa ficaria
    // logada recebendo 403 em todas as rotas.
    if (!PAPEIS_VALIDOS.includes(decoded.papel)) {
      return next(new UnauthorizedError('Sessão de uma versão anterior. Faça login novamente.', 'TOKEN_OUTDATED'));
    }

    let { nome, matricula } = decoded;

    // Sessão da manutenção/admin dura 7 dias no token — revalida `ativo` (da
    // conta e do colaborador dono dela) a cada requisição pra um usuário
    // desativado no meio da janela perder acesso na próxima chamada, não só no
    // próximo login. Nome e matrícula vêm do banco (fonte da identidade), não
    // do token: assim tokens emitidos antes da troca e-mail -> matrícula, ou
    // antes de um ajuste de cadastro, continuam devolvendo dados corretos.
    if (decoded.papel === 'manutencao' || decoded.papel === 'admin') {
      const result = await query<{ ativo: boolean; nome: string; matricula: string }>(
        `SELECT (u.ativo AND c.ativo) AS ativo, c.nome, c.matricula
         FROM usuarios u
         JOIN colaboradores c ON c.id = u.colaborador_id
         WHERE u.id = $1`,
        [decoded.id]
      );
      const registro = result.rows[0];
      if (!registro?.ativo) {
        return next(new UnauthorizedError('Usuário inativo. Contate o administrador.', 'USER_INACTIVE'));
      }
      ({ nome, matricula } = registro);
    }

    req.usuario = {
      id: decoded.id,
      nome,
      papel: decoded.papel,
      matricula: matricula || null,
    };

    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token de autenticação expirado', 'TOKEN_EXPIRED'));
    }
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    return next(new UnauthorizedError('Token de autenticação inválido', 'TOKEN_INVALID'));
  }
}
