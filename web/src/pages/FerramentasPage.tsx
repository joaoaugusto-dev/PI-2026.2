import { useEffect, useState } from 'react'
import { Plus, Search, TriangleAlert, Wrench } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { Paginacao } from '@/components/Paginacao'
import { ChipFiltro } from '@/components/ferramentas/ChipFiltro'
import { IconeFerramenta } from '@/components/ferramentas/IconeFerramenta'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useCategorias } from '@/hooks/useCategorias'
import { useAuth } from '@/lib/auth'
import { formatarPatrimonio, statusParaBadge, useFerramentas, type StatusFerramenta } from '@/hooks/useFerramentas'

const LIMITE_POR_PAGINA = 20

const STATUS_FILTROS: { label: string; valor: StatusFerramenta | 'todas' }[] = [
  { label: 'Todas', valor: 'todas' },
  { label: 'Disponível', valor: 'disponivel' },
  { label: 'Em uso', valor: 'em_uso' },
  { label: 'Indisponível', valor: 'indisponivel' },
]

/** Espera 300ms sem digitação antes de disparar a busca (issue FE-11, "se sobrar tempo"). */
function useBuscaComDebounce(valor: string) {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), 300)
    return () => clearTimeout(id)
  }, [valor])
  return debounced
}

export function FerramentasPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [busca, setBusca] = useState('')
  // o filtro vive na URL: o link do dashboard, voltar/avançar e o compartilhamento refletem o mesmo estado
  const [params, setParams] = useSearchParams()
  const statusUrl = STATUS_FILTROS.find((i) => i.valor === params.get('status'))
  const status = statusUrl?.valor ?? 'todas'
  const setStatus = (v: StatusFerramenta | 'todas') =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v === 'todas') next.delete('status')
        else next.set('status', v)
        return next
      },
      { replace: true },
    )
  const [grupoId, setGrupoId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  // voltar/avançar pode trocar o filtro sem passar pelo chip: volta para a primeira página
  const [statusVisto, setStatusVisto] = useState(status)
  if (statusVisto !== status) {
    setStatusVisto(status)
    setPage(1)
  }
  const buscaDebounced = useBuscaComDebounce(busca)

  const { data: categorias } = useCategorias()
  const { data, isLoading, isError } = useFerramentas({
    page,
    limit: LIMITE_POR_PAGINA,
    q: buscaDebounced || undefined,
    status: status === 'todas' ? undefined : status,
    grupoId: grupoId ?? undefined,
  })

  const ferramentas = data?.data ?? []
  const nomeCategoria = (id: number) => categorias?.find((c) => c.id === id)?.nome ?? '—'
  // coluna toda com "—" é ruído: só aparece quando alguma ferramenta da página tem localização
  const temLocalizacao = ferramentas.some((f) => f.localizacao)

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nome, marca ou modelo"
            autoFocus
            className="pl-9"
          />
        </div>
        {/* o cadastro mora em Cadastros > Ferramentas, que é só do admin: abre o pop-up de criar direto */}
        {usuario?.papel === 'admin' && (
          <Button onClick={() => navigate('/cadastros/ferramentas', { state: { novo: true } })} className="gap-1.5">
            <Plus className="size-4" /> Cadastrar ferramenta
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <span className="shrink-0 text-rotulo font-medium tracking-wide text-muted-foreground uppercase">
            Status
          </span>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {STATUS_FILTROS.map((item) => (
              <ChipFiltro
                key={item.valor}
                label={item.label}
                ativo={status === item.valor}
                onClick={() => {
                  setStatus(item.valor)
                  setPage(1)
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <span className="shrink-0 text-rotulo font-medium tracking-wide text-muted-foreground uppercase">
            Categoria
          </span>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            <ChipFiltro
              label="Todas"
              ativo={grupoId === null}
              onClick={() => {
                setGrupoId(null)
                setPage(1)
              }}
            />
            {categorias?.map((categoria) => (
              <ChipFiltro
                key={categoria.id}
                label={categoria.nome}
                ativo={grupoId === categoria.id}
                onClick={() => {
                  setGrupoId(categoria.id)
                  setPage(1)
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden px-2 text-rotulo font-medium tracking-wide text-muted-foreground uppercase sm:table-cell">
              Patrimônio
            </TableHead>
            <TableHead className="px-1.5 text-rotulo font-medium tracking-wide text-muted-foreground uppercase sm:px-2">
              Ferramenta
            </TableHead>
            <TableHead className="hidden text-rotulo font-medium tracking-wide text-muted-foreground uppercase sm:table-cell">
              Categoria
            </TableHead>
            <TableHead className="px-1.5 text-rotulo font-medium tracking-wide text-muted-foreground uppercase sm:px-2">
              Status
            </TableHead>
            {temLocalizacao && (
              <TableHead className="hidden text-rotulo font-medium tracking-wide text-muted-foreground uppercase lg:table-cell">
                Localização
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden px-2 sm:table-cell">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell className="px-1.5 sm:px-2">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell className="px-1.5 sm:px-2">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : ferramentas.map((ferramenta) => (
                <TableRow
                  key={ferramenta.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/ferramentas/${ferramenta.id}`)}
                >
                  <TableCell className="hidden px-2 font-mono text-corpo sm:table-cell">
                    {formatarPatrimonio(ferramenta.codigo_identificacao)}
                  </TableCell>
                  <TableCell className="px-1.5 whitespace-normal sm:px-2">
                    <div className="flex items-center gap-2.5">
                      <IconeFerramenta nome={ferramenta.nome} fotoUrl={ferramenta.foto_url} className="size-10 shrink-0" />
                      {/* o nome nunca é cortado: a medida ("10 mm", "1 3/4\"") é a informação */}
                      <span className="min-w-0">
                        <span className="block text-corpo font-medium">{ferramenta.nome}</span>
                        <span className="block font-mono text-sm text-muted-foreground sm:hidden">
                          {formatarPatrimonio(ferramenta.codigo_identificacao)}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-corpo text-muted-foreground sm:table-cell">
                    {nomeCategoria(ferramenta.grupo_id)}
                  </TableCell>
                  <TableCell className="px-1.5 sm:px-2">
                    <StatusBadge status={statusParaBadge(ferramenta.status)} />
                  </TableCell>
                  {temLocalizacao && (
                    <TableCell className="hidden text-corpo text-muted-foreground lg:table-cell">
                      {ferramenta.localizacao ?? '—'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
        </TableBody>
      </Table>

      {!isLoading && isError && (
        <EmptyState
          icone={TriangleAlert}
          titulo="Não foi possível carregar as ferramentas"
          descricao="Verifique sua conexão ou tente novamente em instantes."
        />
      )}

      {!isLoading && !isError && ferramentas.length === 0 && (
        <EmptyState
          icone={Wrench}
          titulo="Nenhuma ferramenta encontrada"
          descricao="Ajuste a busca ou os filtros de status e categoria."
        />
      )}

      {!isLoading && !isError && <Paginacao meta={data?.meta} page={page} onPage={setPage} itens="ferramentas" />}
    </div>
  )
}
