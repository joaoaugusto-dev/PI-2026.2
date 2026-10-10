import { ArrowLeft, TriangleAlert } from 'lucide-react'
import Barcode from 'react-barcode'
import { BotaoImprimirEtiqueta } from '@/components/ferramentas/BotaoImprimirEtiqueta'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { corDaSituacao, textoSituacao } from '@/components/emprestimos/situacao'
import { IconeFerramenta } from '@/components/ferramentas/IconeFerramenta'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useCategorias } from '@/hooks/useCategorias'
import { formatarPatrimonio, statusParaBadge, useFerramenta } from '@/hooks/useFerramentas'
import { useHistoricoFerramenta } from '@/hooks/useOcorrencias'
import { useSetores } from '@/hooks/useSetores'
import { dataBR, dataHoraBR, rotuloCondicao } from '@/lib/formatar'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { NaoEncontradaPage } from '@/pages/NaoEncontradaPage'

const moeda = (v: string | null) =>
  v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const STATUS_OCORRENCIA: Record<string, string> = {
  aberta: 'Aberta',
  em_reparo: 'Em reparo',
  cobrada: 'Cobrada',
  resolvida: 'Resolvida',
  baixada: 'Baixada',
}

function Campo({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    // a <div> do par dt/dd é filha direta da <dl> (HTML válido); classe extra em vez de outra <div> por fora
    <div className={cn('flex flex-col gap-0.5', className)}>
      <dt className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">{rotulo}</dt>
      <dd className="text-corpo">{children || '—'}</dd>
    </div>
  )
}

export function FerramentaDetalhePage() {
  const id = Number(useParams().id)
  // /ferramentas/abc: não consulta a API com NaN, mostra o 404
  const idValido = Number.isInteger(id) && id > 0
  const { data: ferramenta, isLoading, isError, error } = useFerramenta(id)
  const { data: historico, isLoading: carregandoHistorico } = useHistoricoFerramenta(id)
  const { data: categorias } = useCategorias()
  const { data: setores } = useSetores()
  const { usuario } = useAuth()
  // admin é a manutenção com recursos a mais: imprime a etiqueta também
  const podeImprimirEtiqueta = usuario?.papel === 'manutencao' || usuario?.papel === 'admin'

  if (!idValido) return <NaoEncontradaPage />

  if (isError && (error as { response?: { status?: number } }).response?.status === 404) return <NaoEncontradaPage />

  if (isError) {
    return (
      <EmptyState
        icone={TriangleAlert}
        titulo="Não foi possível carregar a ferramenta"
        descricao="Verifique sua conexão ou tente novamente em instantes."
      />
    )
  }

  if (isLoading || !ferramenta) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const patrimonio = formatarPatrimonio(ferramenta.codigo_identificacao)
  const categoria = categorias?.find((c) => c.id === ferramenta.grupo_id)?.nome
  const setor = setores?.find((s) => s.id === ferramenta.setor_id)?.nome
  const emprestimos = historico?.emprestimos ?? []
  const ocorrencias = historico?.ocorrencias ?? []
  const emUso = ferramenta.status === 'em_uso'

  return (
    <div className="flex animate-entrada flex-col gap-4 p-6">
      <Link
        to="/ferramentas"
        className="flex w-fit items-center gap-1.5 text-corpo text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Ferramentas
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <IconeFerramenta nome={ferramenta.nome} fotoUrl={ferramenta.foto_url} className="size-20 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-titulo">{ferramenta.nome}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-corpo text-muted-foreground">{patrimonio}</span>
            <StatusBadge status={statusParaBadge(ferramenta.status)} vivo={emUso} />
            {ferramenta.motivo_indisponivel && (
              <span className="text-rotulo font-medium tracking-wide text-status-indisponivel uppercase">
                {ferramenta.motivo_indisponivel.replaceAll('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader>
            <CardTitle>Ficha</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo rotulo="Categoria">{categoria}</Campo>
              <Campo rotulo="Marca">{ferramenta.marca}</Campo>
              <Campo rotulo="Modelo">{ferramenta.modelo}</Campo>
              <Campo rotulo="Setor">{setor}</Campo>
              <Campo rotulo="Localização">{ferramenta.localizacao}</Campo>
              <Campo rotulo="Cadastrada em">{dataHoraBR(ferramenta.created_at)}</Campo>
              <Campo rotulo="Descrição" className="sm:col-span-2 lg:col-span-3">
                {ferramenta.descricao}
              </Campo>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etiqueta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            {ferramenta.codigo_identificacao ? (
              <Barcode
                value={patrimonio}
                format="CODE128"
                height={48}
                width={1.6}
                fontSize={12}
                background="transparent"
              />
            ) : (
              <p className="text-corpo text-muted-foreground">Sem código de patrimônio.</p>
            )}
            <p className="text-rotulo text-muted-foreground">
              {ferramenta.etiqueta_impressa_em
                ? `Impressa em ${dataHoraBR(ferramenta.etiqueta_impressa_em)}`
                : 'Ainda não impressa'}
            </p>
            {podeImprimirEtiqueta && <BotaoImprimirEtiqueta ferramenta={ferramenta} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de empréstimos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {carregandoHistorico ? (
            <Skeleton className="h-32 w-full" />
          ) : emprestimos.length === 0 ? (
            <p className="py-6 text-center text-corpo text-muted-foreground">
              Esta ferramenta ainda não foi emprestada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Retirada</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Devolução</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emprestimos.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <p>{e.colaborador_nome}</p>
                      <p className="text-rotulo text-muted-foreground">{e.colaborador_matricula}</p>
                    </TableCell>
                    <TableCell>{e.setor_nome}</TableCell>
                    <TableCell>{dataHoraBR(e.data_retirada)}</TableCell>
                    <TableCell>{dataBR(e.previsao_devolucao)}</TableCell>
                    <TableCell>{dataHoraBR(e.data_devolucao)}</TableCell>
                    <TableCell className={cn('font-medium', corDaSituacao(e))}>{textoSituacao(e)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {ocorrencias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {ocorrencias.map((o) => (
              <div key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-corpo font-medium">{rotuloCondicao(o.tipo)}</p>
                  <p className="text-corpo text-muted-foreground">{o.descricao}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-right">
                  <span className="text-corpo font-medium">{STATUS_OCORRENCIA[o.status] ?? o.status}</span>
                  <span className="text-rotulo text-muted-foreground">
                    {dataHoraBR(o.created_at)} · custo estimado {moeda(o.custo_estimado)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
