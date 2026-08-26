export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any[];
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details: any[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', code = 'NOT_FOUND', details: any[] = []) {
    super(message, 404, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Acesso não autorizado', code = 'UNAUTHORIZED', details: any[] = []) {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para acessar este recurso', code = 'FORBIDDEN', details: any[] = []) {
    super(message, 403, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito com o estado atual do recurso', code = 'CONFLICT', details: any[] = []) {
    super(message, 409, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Erro de validação nos dados enviados', details: any[] = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}
