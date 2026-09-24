import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '../utils/errors.js';

interface LimiterOptions {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Limite de requisições por IP com a resposta no envelope de erro padrão
 * (429 TOO_MANY_REQUESTS). Atrás de proxy (Nginx/Dokploy), o IP real só é lido
 * corretamente com TRUST_PROXY_HOPS configurado — ver config/env.ts.
 */
export function criarLimiter({ windowMs, max, message }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError(message)),
  });
}

// Quiosque sem senha: a matrícula tem só 9.999 valores possíveis e não é
// secreta. O limite impede varrer todas até achar as válidas.
export const consultaSessaoLimiter = criarLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Muitas tentativas de acesso ao modo consulta. Aguarde um minuto e tente novamente.',
});

// Registro é público e revela se uma matrícula existe (404) ou já tem conta
// (409); o limite dificulta varrer as 9.999 matrículas por esse caminho também.
export const registroLimiter = criarLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de cadastro. Aguarde um minuto e tente novamente.',
});
