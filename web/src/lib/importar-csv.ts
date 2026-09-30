import axios from 'axios'

export interface ResultadoLinha {
  /** Número da linha no arquivo (cabeçalho é a 1). */
  linha: number
  erro?: string
  /**
   * `rede`: a requisição não chegou à API (vale reenviar). `rejeitada`: a API
   * ou a validação local recusou a linha (precisa corrigir o CSV).
   */
  falha?: 'rede' | 'rejeitada'
}

function descreverFalha(e: unknown): Required<Pick<ResultadoLinha, 'erro' | 'falha'>> {
  if (axios.isAxiosError(e)) {
    if (!e.response) return { falha: 'rede', erro: 'Falha de rede: a linha não chegou à API. Reenvie.' }
    const msg = (e.response.data as { error?: { message?: string } } | undefined)?.error?.message
    return { falha: 'rejeitada', erro: msg ?? `Recusada pela API (${e.response.status}).` }
  }
  return { falha: 'rejeitada', erro: e instanceof Error ? e.message : 'Erro ao enviar' }
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
      resultados.push({ linha: i + 2, ...descreverFalha(e) })
    }
  }
  return { resultados, interrompida: signal.aborted }
}
