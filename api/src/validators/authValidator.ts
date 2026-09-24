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

// O nome vem do cadastro do colaborador (a matrícula identifica a pessoa), então o
// corpo só leva matrícula e senha. Campos extras (papel, ativo, nome) são ignorados.
export const registroSchema = z.object({
  matricula: matriculaSchema,
  senha: z.string({ required_error: 'Senha é obrigatória' }).min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type RegistroInput = z.infer<typeof registroSchema>;
