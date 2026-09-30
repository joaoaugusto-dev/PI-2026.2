import axios from 'axios'

export interface ResultadoLinha {
  /** Número da linha no arquivo (cabeçalho é a 1). */
  linha: number
  erro?: string
}

/**
 * Envia as linhas uma a uma (não há endpoint em lote ainda — DATA-03) e
 * devolve o relatório. `signal` interrompe entre linhas e também a requisição
 * em andamento; a linha que estava no ar ao cancelar não entra no relatório.
 * Erro de uma linha (validação, duplicidade, `enviar` lançando) a rejeita e
 * segue para a próxima.
 */
export async function importarLinhas(
  linhas: Record<string, string>[],
  enviar: (linha: Record<string, string>, signal: AbortSignal) => Promise<unknown>,
  signal: AbortSignal,
): Promise<{ resultados: ResultadoLinha[]; interrompida: boolean }> {
  const resultados: ResultadoLinha[] = []
  for (const [i, linha] of linhas.entries()) {
    if (signal.aborted) break
    try {
      await enviar(linha, signal)
      resultados.push({ linha: i + 2 })
    } catch (e) {
      if (axios.isCancel(e) || signal.aborted) break
      const erro = e as { response?: { data?: { error?: { message?: string } } }; message?: string }
      resultados.push({ linha: i + 2, erro: erro.response?.data?.error?.message ?? erro.message ?? 'Erro ao enviar' })
    }
  }
  return { resultados, interrompida: signal.aborted }
}
