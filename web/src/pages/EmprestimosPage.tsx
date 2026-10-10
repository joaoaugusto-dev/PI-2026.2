import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Download, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { Paginacao } from '@/components/Paginacao'
import { corDaSituacao, ROTULO_SITUACAO, textoSituacao } from '@/components/emprestimos/situacao'
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
import { dataBR, dataHoraBR } from '@/lib/formatar'
import { cn } from '@/lib/utils'

const LIMITE = 20

/** A retirada grava texto livre (`atividade_observacao`); `atividade_nome` é a do catálogo. */
const atividade = (e: Emprestimo) => e.atividade_nome || e.atividade_observacao || null

// 100 por página (limite da API) × 100 páginas = 10 mil linhas por exportação
const MAX_PAGINAS_EXPORTACAO = 100

/**
 * Exporta as páginas do filtro atual (até 10 mil linhas); `signal` cancela no
 * meio. Retorna se truncou — nesse caso o próprio arquivo ganha uma linha final
 * avisando, para ninguém tratá-lo como o histórico completo.
 *
 * Limitação conhecida: a paginação é por offset. Se um empréstimo for criado ou
 * devolvido enquanto as páginas são buscadas, uma linha pode sair duplicada ou
 * faltar. Para o uso interno (histórico, não conciliação) é aceitável; um
 * `?formato=csv` no servidor, em uma só consulta, elimina o problema.
 */
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
  const aviso = truncou ? [['ATENÇÃO: exportação truncada em 10.000 registros. Refine os filtros.']] : []
  baixarCsv(
    'historico-emprestimos.csv',
    ['Ferramenta', 'Código', 'Colaborador', 'Matrícula', 'Setor', 'Retirada', 'Previsão', 'Devolução', 'Situação'],
    linhas
      .map((e) => [
        e.ferramenta_nome,
        formatarPatrimonio(e.codigo_identificacao),
        e.colaborador_nome,
        e.colaborador_matricula,
        e.setor_nome,
        dataHoraBR(e.data_retirada),
        dataBR(e.previsao_devolucao),
        dataHoraBR(e.data_devolucao),
        ROTULO_SITUACAO[e.situacao],
      ])
      .concat(aviso),
  )
  return truncou
}

const selectClasse = 'h-(--control-h) rounded-lg border border-input bg-background px-3 text-corpo'

export function EmprestimosPage() {
  const { data: setores } = useSetores()
  const [busca, setBusca] = useState('')
  const [q, setQ] = useState('')
  // a situação vive na URL (link do KPI "Atrasadas", voltar/avançar e compartilhamento)
  const [params, setParams] = useSearchParams()
  const situacaoUrl = params.get('situacao') ?? ''
  const situacao = Object.hasOwn(ROTULO_SITUACAO, situacaoUrl) ? situacaoUrl : ''
  const setSituacao = (v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v) next.set('situacao', v)
        else next.delete('situacao')
        return next
      },
      { replace: true },
    )
  const [setorId, setSetorId] = useState('')
  const [page, setPage] = useState(1)
  // voltar/avançar pode trocar a situação sem passar pelo select: volta para a primeira página
  const [situacaoVista, setSituacaoVista] = useState(situacao)
  if (situacaoVista !== situacao) {
    setSituacaoVista(situacao)
    setPage(1)
  }
  const [exportando, setExportando] = useState(false)
  const exportacao = useRef<AbortController | null>(null)

  async function aoExportar() {
    exportacao.current = new AbortController()
    setExportando(true)
    try {
      const truncou = await exportarCsv(filtros, exportacao.current.signal)
      if (truncou) toast.warning('Exportados os primeiros 10 mil registros. Refine os filtros para ver o restante.')
    } catch (e) {
      if (!axios.isCancel(e)) avisarErro('Não foi possível exportar o CSV.')
    } finally {
      setExportando(false)
    }
  }

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
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Buscar empréstimo"
          placeholder="Ferramenta, código, colaborador ou matrícula"
          value={busca}
          onChange={filtrar(setBusca)}
          className="w-full sm:max-w-sm"
        />
        <select
          aria-label="Filtrar por situação"
          value={situacao}
          onChange={filtrar(setSituacao)}
          className={selectClasse}
        >
          <option value="">Todas as situações</option>
          {(Object.keys(ROTULO_SITUACAO) as SituacaoEmprestimo[]).map((s) => (
            <option key={s} value={s}>
              {ROTULO_SITUACAO[s]}
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
        <Button variant="outline" className="ml-auto" disabled={!linhas.length || exportando} onClick={aoExportar}>
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
            <>
            {/* celular: cartão com o essencial (tabela de 7 colunas não cabe em 360px) */}
            <ul className="divide-y md:hidden">
              {linhas.map((e) => (
                <li key={e.id} className="space-y-1 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{e.ferramenta_nome}</p>
                    <span className={cn('shrink-0 text-sm font-medium', corDaSituacao(e))}>{textoSituacao(e)}</span>
                  </div>
                  <p className="text-sm">
                    {e.colaborador_nome} <span className="text-muted-foreground">· {e.setor_nome}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono">{formatarPatrimonio(e.codigo_identificacao)}</span> · saiu {dataHoraBR(e.data_retirada)}
                    {e.data_devolucao ? ` · voltou ${dataHoraBR(e.data_devolucao)}` : ` · prazo ${dataBR(e.previsao_devolucao)}`}
                  </p>
                  {atividade(e) && <p className="text-sm text-muted-foreground">Atividade: {atividade(e)}</p>}
                </li>
              ))}
            </ul>
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  {/* situação logo depois da ferramenta: é o que se procura aqui, e fica visível sem rolar */}
                  <TableHead>Situação</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Retirada</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Devolução</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <p className="font-medium">{e.ferramenta_nome}</p>
                      <p className="font-mono text-rotulo text-muted-foreground">
                        {formatarPatrimonio(e.codigo_identificacao)}
                        {!e.ferramenta_ativa && ' (baixada)'}
                      </p>
                      {atividade(e) && <p className="max-w-64 truncate text-rotulo text-muted-foreground" title={atividade(e)!}>{atividade(e)}</p>}
                    </TableCell>
                    <TableCell className={cn('font-medium', corDaSituacao(e))}>{textoSituacao(e)}</TableCell>
                    <TableCell>
                      <p>{e.colaborador_nome}</p>
                      <p className="text-rotulo text-muted-foreground">{e.colaborador_matricula}</p>
                    </TableCell>
                    <TableCell>{e.setor_nome}</TableCell>
                    <TableCell>{dataHoraBR(e.data_retirada)}</TableCell>
                    <TableCell>{dataBR(e.previsao_devolucao)}</TableCell>
                    <TableCell>{dataHoraBR(e.data_devolucao)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Paginacao meta={meta} page={page} onPage={setPage} itens="empréstimos" />
    </div>
  )
}
