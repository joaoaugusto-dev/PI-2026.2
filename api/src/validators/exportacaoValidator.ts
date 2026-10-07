import { z } from 'zod';
import { listarEmprestimosQuerySchema } from './emprestimoValidator.js';

export const RECURSOS_EXPORTACAO = ['ferramentas', 'colaboradores', 'categorias', 'setores', 'emprestimos'] as const;
export type RecursoExportavel = (typeof RECURSOS_EXPORTACAO)[number];

export const recursoExportacaoParamSchema = z.object({
  recurso: z.enum(RECURSOS_EXPORTACAO, {
    errorMap: () => ({ message: `Recurso deve ser um de: ${RECURSOS_EXPORTACAO.join(', ')}` }),
  }),
});

// Mesmos filtros da listagem (GET /v1/emprestimos), sem a paginação: a
// exportação sai inteira numa consulta só. Só valem para emprestimos; nos
// outros recursos são ignorados.
export const exportacaoQuerySchema = listarEmprestimosQuerySchema.omit({ page: true, limit: true });
