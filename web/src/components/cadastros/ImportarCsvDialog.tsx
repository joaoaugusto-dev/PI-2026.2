import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { api } from '@/lib/api'
import { baixarCsv, lerCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

export interface ConfigCsv {
  /** Cabeçalho do CSV modelo (minúsculo, sem acento). */
  colunas: string[]
  exemplo: string[]
  /** Converte uma linha do CSV no corpo do POST; pode lançar `Error` com o motivo da rejeição. */
  paraPayload: (linha: Record<string, string>) => Record<string, unknown>
}

interface Resultado {
  linha: number
  erro?: string
}

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
  const [resultado, setResultado] = useState<Resultado[] | null>(null)
  const [enviando, setEnviando] = useState(false)

  function fechar() {
    setLinhas([])
    setResultado(null)
    onFechar()
  }

  async function aoEscolher(arquivo?: File) {
    if (!arquivo) return
    setResultado(null)
    setLinhas(lerCsv(await arquivo.text()))
  }

  async function enviar() {
    setEnviando(true)
    const r: Resultado[] = []
    for (const [i, linha] of linhas.entries()) {
      try {
        await api.post(`/${recurso}`, config.paraPayload(linha))
        r.push({ linha: i + 2 })
      } catch (e) {
        const erro = e as { response?: { data?: { error?: { message?: string } } }; message?: string }
        r.push({ linha: i + 2, erro: erro.response?.data?.error?.message ?? erro.message ?? 'Erro ao enviar' })
      }
    }
    setResultado(r)
    setEnviando(false)
    onImportado()
  }

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
              onChange={(e) => aoEscolher(e.target.files?.[0])}
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

        {resultado && (
          <div className="flex flex-col gap-2">
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
          <Button variant="outline" onClick={fechar}>
            {resultado ? 'Fechar' : 'Cancelar'}
          </Button>
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
