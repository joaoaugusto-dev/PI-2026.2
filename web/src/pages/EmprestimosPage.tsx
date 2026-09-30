import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { ChevronLeft, ChevronRight, Download, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatarPatrimonio } from '@/hooks/useFerramentas'
import {
  buscarEmprestimos,
  useEmprestimos,
  type Emprestimo,
  type FiltrosEmprestimos,
  type SituacaoEmprestimo,
} from '@/hooks/useEmprestimos'
import { useSetores } from '@/hooks/useSetores'
import { avisarErro } from '@/lib/avisar-erro'
import { baixarCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

const LIMITE = 20

const ROTULO: Record<SituacaoEmprestimo, string> = {
  em_aberto: 'Em aberto',
  atrasado: 'Atrasado',
  devolvido: 'Devolvido',
}
const COR: Record<SituacaoEmprestimo, string> = {
  em_aberto: 'text-status-em-uso',
  atrasado: 'text-status-atraso',
  devolvido: 'text-status-disponivel',
}

const dataBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

// 100 por página (limite da API) × 100 páginas = 10 mil linhas por exportação
const MAX_PAGINAS_EXPORTACAO = 100

/** Exporta as páginas do filtro atual (até 10 mil linhas); `signal` cancela no meio. Retorna se truncou. */
async function exportarCsv(filtros: FiltrosEmprestimos, signal: AbortSignal) {
  const linhas: Emprestimo[] = []
  let truncou = false
  for (let page = 1, total = 1; page <= total; page++) {
    if (page > MAX_PAGINAS_EXPORTACAO) {
      truncou = true
      break
    }
    const r = await buscarEmprestimos({ ...filtros, page, limit: 100 }, signal)
    linhas.push(...r.data)
    total = r.meta.totalPages
  }
  baixarCsv(
    'historico-emprestimos.csv',
    ['Ferramenta', 'Código', 'Colaborador', 'Matrícula', 'Setor', 'Retirada', 'Previsão', 'Devolução', 'Situação'],
    linhas.map((e) => [
      e.ferramenta_nome,
      formatarPatrimonio(e.codigo_identificacao),
      e.colaborador_nome,
      e.colaborador_matricula,
      e.setor_nome,
      dataBR(e.data_retirada),
      dataBR(e.previsao_devolucao),
      dataBR(e.data_devolucao),
      ROTULO[e.situacao],
    ]),
  )
  return truncou
}

const selectClasse = 'h-9 rounded-md border border-input bg-background px-3 text-corpo'

export function EmprestimosPage() {
  const { data: setores } = useSetores()
  const [busca, setBusca] = useState('')
  const [q, setQ] = useState('')
  const [situacao, setSituacao] = useState('')
  const [setorId, setSetorId] = useState('')
  const [page, setPage] = useState(1)
  const [exportando, setExportando] = useState(false)
  const exportacao = useRef<AbortController | null>(null)

  // fechar a tela cancela uma exportação em andamento
  useEffect(() => () => exportacao.current?.abort(), [])

  // espera o usuário parar de digitar antes de consultar a API
  useEffect(() => {
    const id = setTimeout(() => setQ(busca.trim()), 300)
    return () => clearTimeout(id)
  }, [busca])

  const filtros: FiltrosEmprestimos = {
    q: q || undefined,
    situacao: (situacao as SituacaoEmprestimo) || undefined,
    setorId: setorId ? Number(setorId) : undefined,
  }
  const { data, isLoading, isError } = useEmprestimos({ ...filtros, page, limit: LIMITE })
  const linhas = data?.data ?? []
  const meta = data?.meta

  // qualquer mudança de filtro volta para a primeira página
  function filtrar(setter: (v: string) => void) {
    return (e: { target: { value: string } }) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Buscar empréstimo"
          placeholder="Ferramenta, código, colaborador ou matrícula"
          value={busca}
          onChange={filtrar(setBusca)}
          className="max-w-sm"
        />
        <select
          aria-label="Filtrar por situação"
          value={situacao}
          onChange={filtrar(setSituacao)}
          className={selectClasse}
        >
          <option value="">Todas as situações</option>
          {(Object.keys(ROTULO) as SituacaoEmprestimo[]).map((s) => (
            <option key={s} value={s}>
              {ROTULO[s]}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por setor" value={setorId} onChange={filtrar(setSetorId)} className={selectClasse}>
          <option value="">Todos os setores</option>
          {setores?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="ml-auto"
          disabled={!linhas.length || exportando}
          onClick={async () => {
            exportacao.current = new AbortController()
            setExportando(true)
            try {
              const truncou = await exportarCsv(filtros, exportacao.current.signal)
              if (truncou)
                toast.warning('Exportados os primeiros 10 mil registros. Refine os filtros para ver o restante.')
            } catch (e) {
              if (!axios.isCancel(e)) avisarErro('Não foi possível exportar o CSV.')
            } finally {
              setExportando(false)
            }
          }}
        >
          {exportando ? <Loader2 className="animate-spin" /> : <Download />}{' '}
          {exportando ? 'Exportando…' : 'Exportar CSV'}
        </Button>
      </div>

      {isError && <p className="text-corpo text-destructive">Não foi possível carregar o histórico.</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : linhas.length === 0 ? (
            <EmptyState icone={History} titulo="Nenhum empréstimo encontrado" descricao="Ajuste os filtros da busca." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Retirada</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Devolução</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <p className="font-medium">{e.ferramenta_nome}</p>
                      <p className="font-mono text-rotulo text-muted-foreground">
                        {formatarPatrimonio(e.codigo_identificacao)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>{e.colaborador_nome}</p>
                      <p className="text-rotulo text-muted-foreground">{e.colaborador_matricula}</p>
                    </TableCell>
                    <TableCell>{e.setor_nome}</TableCell>
                    <TableCell>{dataBR(e.data_retirada)}</TableCell>
                    <TableCell>{dataBR(e.previsao_devolucao)}</TableCell>
                    <TableCell>{dataBR(e.data_devolucao)}</TableCell>
                    <TableCell className={cn('font-medium', COR[e.situacao])}>
                      {ROTULO[e.situacao]}
                      {e.condicao_devolucao && e.condicao_devolucao !== 'ok' && ` · ${e.condicao_devolucao}`}
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
            Página {meta.page} de {meta.totalPages} · {meta.total} empréstimos
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
    </div>
  )
}
