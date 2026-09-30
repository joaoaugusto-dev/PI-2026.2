import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, History } from 'lucide-react'
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

/** Exporta TODAS as páginas do filtro atual (a API limita 100 por página). */
async function exportarCsv(filtros: FiltrosEmprestimos) {
  const linhas: Emprestimo[] = []
  for (let page = 1, total = 1; page <= total; page++) {
    const r = await buscarEmprestimos({ ...filtros, page, limit: 100 })
    linhas.push(...r.data)
    total = r.meta.totalPages
  }
  const cab = [
    'Ferramenta',
    'Código',
    'Colaborador',
    'Matrícula',
    'Setor',
    'Retirada',
    'Previsão',
    'Devolução',
    'Situação',
  ]
  const corpo = linhas.map((e) =>
    [
      e.ferramenta_nome,
      formatarPatrimonio(e.codigo_identificacao),
      e.colaborador_nome,
      e.colaborador_matricula,
      e.setor_nome,
      dataBR(e.data_retirada),
      dataBR(e.previsao_devolucao),
      dataBR(e.data_devolucao),
      ROTULO[e.situacao],
    ].map((c) => `"${c.replaceAll('"', '""')}"`),
  )
  const csv = [cab, ...corpo].map((l) => l.join(';')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'historico-emprestimos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const selectClasse = 'h-9 rounded-md border border-input bg-background px-3 text-corpo'

export function EmprestimosPage() {
  const { data: setores } = useSetores()
  const [busca, setBusca] = useState('')
  const [q, setQ] = useState('')
  const [situacao, setSituacao] = useState('')
  const [setorId, setSetorId] = useState('')
  const [page, setPage] = useState(1)

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
          disabled={!linhas.length}
          onClick={() => exportarCsv(filtros).catch(() => avisarErro('Não foi possível exportar o CSV.'))}
        >
          <Download /> Exportar CSV
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
