import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// API-19 (#78): um lugar só para assinar e conferir os tokens, para algoritmo e audience nunca
// divergirem entre quem emite (authService) e quem confere (middleware authenticate).

// Algoritmo fixo na assinatura e na verificação: sem isso o jsonwebtoken aceitaria o que vier no
// cabeçalho do token (inclusive `alg: none` em bibliotecas mal configuradas).
export const ALGORITMO_JWT = 'HS256' as const;

// O `aud` separa os dois tokens por construção, e não só pelo campo `papel` do payload: o token da
// sessão de balcão (manutenção/admin) e o do quiosque (consulta) nunca valem um no lugar do outro.
export const AUDIENCE_SESSAO = 'soufer-sessao';
export const AUDIENCE_CONSULTA = 'soufer-consulta';

export const audiencePorPapel = (papel: string): string => (papel === 'consulta' ? AUDIENCE_CONSULTA : AUDIENCE_SESSAO);

export function assinarToken(payload: Record<string, unknown>, expiresIn: string | number): string {
  return jwt.sign(payload, env.jwt.secret, {
    algorithm: ALGORITMO_JWT,
    audience: audiencePorPapel(String(payload.papel)),
    expiresIn: expiresIn as any,
  });
}

/** Lança os erros do `jsonwebtoken` (TokenExpiredError, JsonWebTokenError); o `aud` o chamador confere. */
export function decodificarToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, env.jwt.secret, { algorithms: [ALGORITMO_JWT] }) as jwt.JwtPayload;
}
