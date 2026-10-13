import { z } from 'zod';
import { matriculaSchema } from './matricula.js';

export const RECURSOS_IMPORTACAO = ['ferramentas', 'colaboradores', 'categorias', 'setores'] as const;
export type RecursoImportavel = (typeof RECURSOS_IMPORTACAO)[number];

export const recursoImportacaoParamSchema = z.object({
  recurso: z.enum(RECURSOS_IMPORTACAO, {
    errorMap: () => ({ message: `Recurso deve ser um de: ${RECURSOS_IMPORTACAO.join(', ')}` }),
  }),
});

/** "Localização", " VALOR AQUISICAO " -> "localizacao", "valor_aquisicao" (minúsculas, sem acento, espaço vira _). */
export function normalizarCabecalho(coluna: string): string {
  return coluna
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** trim + espaços internos repetidos viram um ("PARAFUSO ALLEN C/C  M 8" na planilha da DATA-01). */
export function normalizarTexto(valor: string | undefined | null): string | undefined {
  const texto = (valor ?? '').replace(/\s+/g, ' ').trim();
  return texto === '' ? undefined : texto;
}

/**
 * Valor em formato brasileiro para número: "1.234,56", "1234,56", "R$ 89,90".
 * Ponto sem vírgula só é milhar quando agrupa de 3 em 3 ("1.234" = 1234);
 * caso contrário é decimal ("89.90"). Mais de 2 casas decimais ou qualquer
 * outro formato vira NaN, para o Zod rejeitar a linha com mensagem clara.
 */
export function converterValor(valor: string): number {
  const v = valor.replace(/^R\$\s*/i, '').trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(v)) return Number(v.replace(/\./g, '').replace(',', '.'));
  if (/^\d+(,\d{1,2})?$/.test(v)) return Number(v.replace(',', '.'));
  if (/^\d+(\.\d{1,2})?$/.test(v)) return Number(v);
  return NaN;
}

// Os schemas abaixo recebem a linha já normalizada pelo motor de importação:
// textos sem espaço sobrando e célula vazia como undefined.

const textoOpcional = (rotulo: string, max: number) =>
  z.string().max(max, `${rotulo} deve ter no máximo ${max} caracteres`).optional();

const nomeCadastro = (max: number) =>
  z.string({ required_error: 'Nome é obrigatório' }).max(max, `Nome deve ter no máximo ${max} caracteres`);

// DATA-03. Categoria e setor vêm pelo nome, como o almoxarife conhece, e são
// resolvidos para id no serviço. marca/modelo/localização entraram com a
// visita técnica (cadastro de ferramenta ganhou esses campos na DB-03).
export const linhaFerramentaSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres')
    .transform((n) => n.toLocaleUpperCase('pt-BR')),
  categoria: z.string({ required_error: 'Categoria é obrigatória' }).max(100, 'Categoria deve ter no máximo 100 caracteres'),
  marca: textoOpcional('Marca', 100),
  modelo: textoOpcional('Modelo', 100),
  setor: textoOpcional('Setor', 100),
  localizacao: textoOpcional('Localização', 150),
  descricao: textoOpcional('Descrição', 2000),
  valor: z
    .string()
    .transform(converterValor)
    // NaN cai no invalid_type_error; o teto é o de valor_aquisicao NUMERIC(10, 2)
    .pipe(
      z
        .number({ invalid_type_error: 'Valor inválido (use o formato 1.234,56)' })
        .max(99999999.99, 'Valor deve ser no máximo 99.999.999,99')
    )
    .optional(),
});

// Mesmas regras de criarColaboradorSchema. O Excel abre "0036" como o número
// 36 e salva sem os zeros, então 1 a 3 dígitos são completados, como no cadastro.
export const linhaColaboradorSchema = z.object({
  matricula: z.preprocess(
    (v) => (typeof v === 'string' && /^\d{1,3}$/.test(v) ? v.padStart(4, '0') : v),
    matriculaSchema
  ),
  nome: nomeCadastro(150),
  setor: z.string({ required_error: 'Setor é obrigatório' }).max(100, 'Setor deve ter no máximo 100 caracteres'),
});

// Mesmas regras de criarCategoriaSchema/criarSetorSchema.
export const linhaNomeSchema = z.object({ nome: nomeCadastro(100) });

export type LinhaFerramenta = z.infer<typeof linhaFerramentaSchema>;
export type LinhaColaborador = z.infer<typeof linhaColaboradorSchema>;
export type LinhaNome = z.infer<typeof linhaNomeSchema>;
