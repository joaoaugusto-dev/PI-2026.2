import { parse } from 'csv-parse/sync';
import { ValidationError } from './errors.js';

export interface LinhaCsv {
  /** Linha física no arquivo (o cabeçalho é a 1), a mesma que o Excel mostra. */
  numero: number;
  celulas: string[];
}

/**
 * O Excel em português salva "CSV (separado por vírgulas)" em Windows-1252,
 * não em UTF-8: sem o fallback, "Chave de fenda Phillips nº 2" viraria lixo.
 */
function decodificar(arquivo: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(arquivo);
  } catch {
    return new TextDecoder('windows-1252').decode(arquivo);
  }
}

/** Mesma regra do front (lib/csv.ts): o separador é o que mais aparece no cabeçalho, `;` no empate. */
function detectarSeparador(texto: string): ';' | ',' {
  const cabecalho = texto.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  return cabecalho.split(';').length >= cabecalho.split(',').length ? ';' : ',';
}

/**
 * Lê um CSV enviado pelo usuário: UTF-8 (com ou sem BOM) ou Windows-1252,
 * separador `;` ou `,`, aspas duplas. Células já vêm com trim. Linhas vazias
 * e linhas só com separadores (";;;;", comum no fim de planilha exportada)
 * são descartadas. Lança 400 se o arquivo não puder ser lido ou estiver vazio.
 */
export function lerCsv(arquivo: Buffer): { cabecalho: string[]; linhas: LinhaCsv[] } {
  const texto = decodificar(arquivo);

  let registros: { record: string[]; info: { lines: number } }[];
  try {
    registros = parse(texto, {
      bom: true,
      delimiter: detectarSeparador(texto),
      info: true,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as unknown as typeof registros; // com info: true cada item vira { record, info }, a tipagem não acompanha
  } catch (err: any) {
    throw new ValidationError('Não foi possível ler o arquivo CSV', [{ message: err.message }]);
  }

  const [cabecalho, ...corpo] = registros.filter((r) => r.record.some((c) => c !== ''));
  if (!cabecalho) {
    throw new ValidationError('O arquivo CSV está vazio');
  }

  return {
    cabecalho: cabecalho.record,
    linhas: corpo.map((r) => ({ numero: r.info.lines, celulas: r.record.map(desfazerNeutralizacao) })),
  };
}

const NUMERO = /^[-+]?\d+([.,]\d+)?$/;

/**
 * Inverso exato de neutralizarFormula: um arquivo exportado pela API e
 * reimportado não grava o `'` de proteção como parte do nome. Só tira o `'`
 * quando o resto é algo que a exportação teria protegido.
 */
function desfazerNeutralizacao(celula: string): string {
  const resto = celula.slice(1);
  return celula.startsWith("'") && neutralizarFormula(resto) === celula ? resto : celula;
}

/**
 * Injeção de fórmula (mesma regra de neutralizarFormula no front): no Excel,
 * célula que começa com `=`, `+`, `-`, `@`, tab ou CR vira fórmula. Texto
 * livre (nome de ferramenta, colaborador vindo de cadastro rápido) ganha um
 * `'` na frente; número de verdade (`-5`, `+12,5`) passa intacto.
 */
function neutralizarFormula(celula: string): string {
  return /^[=+\-@\t\r]/.test(celula) && !NUMERO.test(celula) ? `'${celula}` : celula;
}

/**
 * Monta um CSV para o Excel em português abrir direto: BOM UTF-8 (acentos),
 * separador `;`, tudo entre aspas, fórmulas neutralizadas. Mesmo formato do
 * baixarCsv do front, para os arquivos exportados pelos dois lados baterem.
 */
export function montarCsv(cabecalho: string[], linhas: (string | number | null | undefined)[][]): string {
  const corpo = [cabecalho, ...linhas]
    .map((l) => l.map((c) => `"${neutralizarFormula(String(c ?? '')).replaceAll('"', '""')}"`).join(';'))
    .join('\r\n');
  return `﻿${corpo}\r\n`;
}
