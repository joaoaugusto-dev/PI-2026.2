import { z } from 'zod';

// Regra única de matrícula (usuários e colaboradores): exatamente 4 dígitos
// numéricos, de 0001 a 9999. O mesmo padrão é imposto por CHECK no banco.
export const MATRICULA_REGEX = /^(?!0000)\d{4}$/;

export const matriculaSchema = z
  .string({ required_error: 'Matrícula é obrigatória', invalid_type_error: 'Matrícula deve ser um texto' })
  .regex(MATRICULA_REGEX, 'Matrícula deve ter exatamente 4 dígitos numéricos (0001 a 9999)');
