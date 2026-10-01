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

// Os endpoints de convite são públicos (o token é o segredo): o limite dificulta
// adivinhar links por força bruta.
export const conviteLimiter = criarLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
});

// Login por matrícula (issue #150): a matrícula tem só 9.999 valores
// possíveis e não é secreta (mesmo raciocínio do consultaSessaoLimiter) — sem limite, dá pra forçar a senha contra qualquer uma
// das matrículas sem nenhum freio.
export const loginLimiter = criarLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.',
});
