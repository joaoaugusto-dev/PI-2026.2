import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FileUp, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import type { ZodType } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useInativarCadastro, useListaCadastro, useSalvarCadastro, type Recurso } from '@/hooks/useCadastro'
import { avisarErro } from '@/lib/avisar-erro'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { FormularioCadastro, type Campo } from './FormularioCadastro'
import { ImportarCsvDialog, type ConfigCsv } from './ImportarCsvDialog'

const LIMITE = 20

export interface Coluna<T> {
  cabecalho: string
  render: (item: T) => ReactNode
}

type Valores = Record<string, string>

/**
 * Tela de cadastro auxiliar (FE-23 e irmãs): tabela com busca e paginação,
 * "Novo registro" (botão preto — cadastro é manutenção, não operação, ver
 * telas.md), Editar por linha, Inativar (nunca apaga) e importação de CSV.
 * Cada tela só descreve colunas, campos e schema.
 */
export function CadastroCrud<T extends { id: number }>({
  recurso,
  singular,
  nomeCsv,
  colunas,
  campos,
  schema,
  valoresVazios,
  deItem,
  paraPayload,
  csv,
  buscaPlaceholder,
}: {
  recurso: Recurso
  singular: string
  nomeCsv: string
  colunas: Coluna<T>[]
  campos: Campo[]
  schema: ZodType<Valores, Valores>
  valoresVazios: Valores
  deItem: (item: T) => Valores
  paraPayload: (valores: Valores) => Record<string, unknown>
  csv: ConfigCsv
  buscaPlaceholder: string
}) {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [editando, setEditando] = useState<T | 'novo' | null>(null)
  const [importando, setImportando] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(busca.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [busca])

  const { data, isLoading, isError } = useListaCadastro<T>(recurso, { q: q || undefined, page, limit: LIMITE })
  const salvar = useSalvarCadastro(recurso)
  const inativar = useInativarCadastro(recurso)
  const linhas = data?.data ?? []
  const meta = data?.meta

  const erroDaApi = (e: unknown) =>
    (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message

  function aoSalvar(valores: Valores) {
    const id = editando && editando !== 'novo' ? editando.id : undefined
    salvar.mutate(
      { id, dados: paraPayload(valores) },
      {
        onSuccess: () => {
          playSomConfirmacao()
          toast.success(id ? `${singular} atualizado.` : `${singular} cadastrado.`)
          setEditando(null)
        },
        onError: (e) => avisarErro(erroDaApi(e) ?? `Não foi possível salvar o ${singular.toLowerCase()}.`),
      },
    )
  }

  function aoInativar(item: T) {
    if (!window.confirm(`Inativar este ${singular.toLowerCase()}? O histórico é mantido.`)) return
    inativar.mutate(item.id, {
      onSuccess: () => toast.success(`${singular} inativado.`),
      onError: (e) => avisarErro(erroDaApi(e) ?? 'Não foi possível inativar.'),
    })
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Buscar"
          placeholder={buscaPlaceholder}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" className="ml-auto" onClick={() => setImportando(true)}>
          <FileUp /> Importar CSV
        </Button>
        <Button className="bg-foreground text-background hover:bg-foreground/85" onClick={() => setEditando('novo')}>
          Novo registro
        </Button>
      </div>

      {isError && <p className="text-corpo text-destructive">Não foi possível carregar os registros.</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : linhas.length === 0 ? (
            <EmptyState icone={Inbox} titulo="Nenhum registro encontrado" descricao="Ajuste a busca ou cadastre um novo." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map((c) => (
                    <TableHead key={c.cabecalho}>{c.cabecalho}</TableHead>
                  ))}
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((item) => (
                  <TableRow key={item.id}>
                    {colunas.map((c) => (
                      <TableCell key={c.cabecalho}>{c.render(item)}</TableCell>
                    ))}
                    <TableCell className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditando(item)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" disabled={inativar.isPending} onClick={() => aoInativar(item)}>
                        Inativar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-rotulo text-muted-foreground">
            Página {meta.page} de {meta.totalPages} · {meta.total} registros
          </span>
          <Button
            size="icon"
            variant="outline"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Próxima página"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      )}

      <Dialog open={editando !== null} onOpenChange={(a) => !a && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando === 'novo' ? `Novo ${singular.toLowerCase()}` : `Editar ${singular.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <FormularioCadastro
              campos={campos}
              schema={schema}
              valoresIniciais={editando === 'novo' ? valoresVazios : deItem(editando)}
              salvando={salvar.isPending}
              onSubmit={aoSalvar}
              onCancelar={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ImportarCsvDialog
        aberto={importando}
        onFechar={() => setImportando(false)}
        recurso={recurso}
        nomeArquivo={nomeCsv}
        config={csv}
        onImportado={() => queryClient.invalidateQueries({ queryKey: [recurso] })}
      />
    </div>
  )
}
