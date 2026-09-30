import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { api } from '@/lib/api'
import { avisarErro } from '@/lib/avisar-erro'
import { baixarCsv, lerCsv } from '@/lib/csv'
import { importarLinhas, type ResultadoLinha } from '@/lib/importar-csv'
import { cn } from '@/lib/utils'

export interface ConfigCsv {
  /** Cabeçalho do CSV modelo (minúsculo, sem acento). */
  colunas: string[]
  exemplo: string[]
  /** Opcional: indica linha que já existe no sistema (o recurso não tem chave única que a API use para recusar). */
  duplicada?: (linha: Record<string, string>) => boolean
  /** Converte uma linha do CSV no corpo do POST; pode lançar `Error` com o motivo da rejeição. */
  paraPayload: (linha: Record<string, string>) => Record<string, unknown>
}

/** Teto por importação: o envio é uma requisição por linha. */
const MAX_LINHAS = 500

/**
 * Importação de CSV pelo próprio cadastro (FE-20): prévia das primeiras
 * linhas, envio linha a linha pelo POST do recurso (não existe endpoint de
 * importação em lote ainda — DATA-03) e relatório de aceitas/rejeitadas.
 */
export function ImportarCsvDialog({
  aberto,
  onFechar,
  recurso,
  nomeArquivo,
  config,
  onImportado,
}: {
  aberto: boolean
  onFechar: () => void
  recurso: string
  nomeArquivo: string
  config: ConfigCsv
  onImportado: () => void
}) {
  const [linhas, setLinhas] = useState<Record<string, string>[]>([])
  const [resultado, setResultado] = useState<ResultadoLinha[] | null>(null)
  const [interrompida, setInterrompida] = useState(false)
  const [ignorarDuplicadas, setIgnorarDuplicadas] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const envio = useRef<AbortController | null>(null)

  function cancelarEnvio() {
    envio.current?.abort()
  }

  function fechar() {
    // fechar no meio da importação a interrompe; o que já foi enviado continua valendo.
    // `envio.current = null` marca esta importação como abandonada: quando o laço terminar,
    // `enviar` vê que não é mais a atual e não publica relatório nenhum.
    cancelarEnvio()
    envio.current = null
    setEnviando(false)
    setLinhas([])
    setResultado(null)
    setInterrompida(false)
    onFechar()
  }

  async function aoEscolher(input: HTMLInputElement) {
    const arquivo = input.files?.[0]
    // limpa para que escolher o mesmo arquivo de novo (já corrigido) dispare o onChange
    input.value = ''
    if (!arquivo) return
    setResultado(null)
    setInterrompida(false)
    try {
      const lidas = lerCsv(await arquivo.text())
      const ausentes = config.colunas.filter((c) => !(lidas[0] && c in lidas[0]))
      if (lidas.length === 0) throw new Error('O arquivo está vazio ou não é um CSV.')
      if (ausentes.length > 0) throw new Error(`Colunas ausentes: ${ausentes.join(', ')}.`)
      if (lidas.length > MAX_LINHAS) {
        throw new Error(
          `O arquivo tem ${lidas.length} linhas; o limite é ${MAX_LINHAS} por importação. Divida o arquivo.`,
        )
      }
      setLinhas(lidas)
    } catch (e) {
      setLinhas([])
      avisarErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    }
  }

  async function enviar() {
    const controle = new AbortController()
    envio.current = controle
    setEnviando(true)
    const { resultados, interrompida: parou } = await importarLinhas(
      linhas,
      (linha, signal) => {
        if (ignorarDuplicadas && config.duplicada?.(linha)) throw new Error('Já cadastrada, ignorada.')
        return api.post(`/${recurso}`, config.paraPayload(linha), { signal })
      },
      controle.signal,
    )
    // o que foi criado antes de parar precisa aparecer na lista, mesmo com o diálogo já fechado
    if (resultados.some((r) => !r.erro)) onImportado()
    // só publica o relatório se esta ainda é a importação atual: fechar (ou começar outra)
    // a deixou para trás, e mostrar o relatório dela na reabertura confundiria
    if (envio.current !== controle) return
    envio.current = null
    setEnviando(false)
    setInterrompida(parou)
    setResultado(resultados)
  }

  const duplicadas = config.duplicada ? linhas.filter(config.duplicada).length : 0
  const rejeitadas = resultado?.filter((r) => r.erro) ?? []

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && fechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>Colunas esperadas: {config.colunas.join(', ')}.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-corpo hover:bg-muted">
            <Upload className="size-4" /> Escolher arquivo
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={enviando}
              onChange={(e) => aoEscolher(e.currentTarget)}
            />
          </label>
          <Button variant="ghost" onClick={() => baixarCsv(nomeArquivo, config.colunas, [config.exemplo])}>
            <Download /> Baixar modelo
          </Button>
        </div>

        {linhas.length > 0 && !resultado && (
          <div className="overflow-x-auto rounded-md border">
            <p className="border-b px-3 py-2 text-rotulo text-muted-foreground">
              Prévia: {Math.min(5, linhas.length)} de {linhas.length} linhas
            </p>
            <table className="w-full text-corpo">
              <thead>
                <tr className="text-left text-rotulo text-muted-foreground uppercase">
                  {config.colunas.map((c) => (
                    <th key={c} className="px-3 py-1.5">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, 5).map((l, i) => (
                  <tr key={i} className="border-t">
                    {config.colunas.map((c) => (
                      <td key={c} className="px-3 py-1.5">
                        {l[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {duplicadas > 0 && !resultado && (
          <label className="flex items-start gap-2 rounded-md border border-status-atraso/40 bg-status-atraso/5 px-3 py-2 text-corpo">
            <input
              type="checkbox"
              className="mt-1"
              checked={ignorarDuplicadas}
              disabled={enviando}
              onChange={(e) => setIgnorarDuplicadas(e.target.checked)}
            />
            <span>
              {duplicadas} {duplicadas === 1 ? 'linha parece' : 'linhas parecem'} já cadastrada
              {duplicadas === 1 ? '' : 's'}. Ignorar evita duplicar ao reenviar o mesmo arquivo; desmarque só se forem
              unidades diferentes.
            </span>
          </label>
        )}

        {resultado && (
          <div className="flex flex-col gap-2">
            {interrompida && (
              <p className="text-corpo font-medium text-status-atraso">
                Importação interrompida após {resultado.length} de {linhas.length} linhas. O que já foi enviado foi
                cadastrado; a linha que estava sendo enviada no momento do cancelamento também pode ter sido cadastrada
                — confira na lista.
              </p>
            )}
            <p className="text-corpo">
              <span className="font-medium text-status-disponivel">{resultado.length - rejeitadas.length} aceitas</span>
              {' · '}
              <span className={cn('font-medium', rejeitadas.length && 'text-destructive')}>
                {rejeitadas.length} rejeitadas
              </span>
            </p>
            {rejeitadas.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-corpo">
                {rejeitadas.map((r) => (
                  <li key={r.linha}>
                    <strong>Linha {r.linha}:</strong> {r.erro}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {enviando ? (
            <Button variant="outline" onClick={cancelarEnvio}>
              Cancelar importação
            </Button>
          ) : (
            <Button variant="outline" onClick={fechar}>
              {resultado ? 'Fechar' : 'Cancelar'}
            </Button>
          )}
          {!resultado && (
            <Button disabled={!linhas.length || enviando} onClick={enviar}>
              {enviando ? 'Importando…' : `Importar ${linhas.length || ''} linhas`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
