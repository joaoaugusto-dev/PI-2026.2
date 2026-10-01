import { z } from 'zod';
import { matriculaSchema } from './matricula.js';

export const loginSchema = z.object({
  matricula: matriculaSchema,
  senha: z.string({ required_error: 'Senha é obrigatória' }).min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// O quiosque entra só com a matrícula (sem senha). O campo mantém o
// nome `identificador` por compatibilidade com o front.
export const consultaSessaoSchema = z.object({
  identificador: matriculaSchema,
});

export type ConsultaSessaoInput = z.infer<typeof consultaSessaoSchema>;

// Link de convite: o token tem 43 caracteres base64url (32 bytes aleatórios).
export const conviteTokenParamSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Link inválido'),
});

// A senha é o PIN de 6 dígitos usado no resto do sistema.
export const aceitarConviteSchema = z.object({
  senha: z.string({ required_error: 'Senha é obrigatória' }).regex(/^\d{6}$/, 'A senha deve ter 6 dígitos'),
});

export type AceitarConviteInput = z.infer<typeof aceitarConviteSchema>;
