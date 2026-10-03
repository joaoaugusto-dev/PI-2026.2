import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { TooManyRequestsError } from '../utils/errors.js';

interface LimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  /** Chave do contador; sem ela, o IP do cliente. */
  keyGenerator?: (req: Request) => string;
  /** Respostas de sucesso (status < 400) não contam no limite. */
  skipSuccessfulRequests?: boolean;
}

/**
 * Limite de requisições por IP com a resposta no envelope de erro padrão
 * (429 TOO_MANY_REQUESTS). Atrás de proxy (Nginx/Dokploy), o IP real só é lido
 * corretamente com TRUST_PROXY_HOPS configurado — ver config/env.ts.
 */
export function criarLimiter({ windowMs, max, message, keyGenerator, skipSuccessfulRequests }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    ...(skipSuccessfulRequests && { skipSuccessfulRequests }),
    handler: (_req, _res, next) => next(new TooManyRequestsError(message)),
  });
}

// Quiosque sem senha: a matrícula tem só 9.999 valores possíveis e não é
// secreta. Dois limites impedem varrer todas até achar as válidas: por IP
// (consultaSessaoLimiter, qualquer tentativa) e por matrícula tentada
// (consultaMatriculaLimiter, abaixo).
export const consultaSessaoLimiter = criarLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Muitas tentativas de acesso ao modo consulta. Aguarde um minuto e tente novamente.',
});

// Por matrícula tentada, somando todos os IPs: a 6ª tentativa fracassada da
// mesma matrícula em um minuto devolve 429. Entradas bem-sucedidas não contam,
// para o colaborador legítimo entrar de novo no quiosque. Precisa rodar depois
// do validate(): a chave é a matrícula já validada (4 dígitos), o que também
// limita a quantidade de contadores em memória a 9.999.
export const consultaMatriculaLimiter = criarLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Muitas tentativas com esta matrícula. Aguarde um minuto e tente novamente.',
  keyGenerator: (req) => `matricula:${String(req.body?.identificador)}`,
  skipSuccessfulRequests: true,
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
