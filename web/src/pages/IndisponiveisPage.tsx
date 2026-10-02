import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PackageX, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { OcorrenciaCard } from '@/components/ferramentas/OcorrenciaCard'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFerramentas } from '@/hooks/useFerramentas'
import {
  ocorrenciaAtiva,
  useColaboradores,
  useDisponibilizarFerramenta,
  useHistoricosFerramentas,
} from '@/hooks/useOcorrencias'
import { avisarErro } from '@/lib/avisar-erro'
import { playSomConfirmacao } from '@/lib/som-confirmacao'

const LIMITE_POR_PAGINA = 50
// carimbo (240ms) + pausa + colapso do card (420ms); só então a lista é refeita e o card some de vez
const SAIDA_MS = 1400

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function IndisponiveisPage() {
  const { data, isLoading, isError } = useFerramentas({ status: 'indisponivel', limit: LIMITE_POR_PAGINA })
  const ferramentas = data?.data ?? []

  const historicos = useHistoricosFerramentas(ferramentas.map((f) => f.id))
  const ocorrenciasPorFerramenta = useMemo(
    () => historicos.map((h) => (h.data ? ocorrenciaAtiva(h.data.ocorrencias) : undefined)),
    [historicos],
  )

  const colaboradorIds = useMemo(
    () => [...new Set(ocorrenciasPorFerramenta.map((o) => o?.colaborador_id).filter((id): id is number => id != null))],
    [ocorrenciasPorFerramenta],
  )
  const colaboradoresQueries = useColaboradores(colaboradorIds)
  const colaboradorPorId = useMemo(() => {
    const mapa = new Map<number, (typeof colaboradoresQueries)[number]['data']>()
    colaboradorIds.forEach((id, i) => mapa.set(id, colaboradoresQueries[i]?.data))
    return mapa
  }, [colaboradorIds, colaboradoresQueries])

  // ponytail: soma só a página carregada (sem endpoint agregado de ocorrências) — ver useOcorrencias.ts
  const ocorrenciasAbertas = ocorrenciasPorFerramenta.filter(
    (o) => o && (o.status === 'aberta' || o.status === 'em_reparo' || o.status === 'cobrada'),
  ).length
  const custoEstimadoTotal = ocorrenciasPorFerramenta.reduce((soma, o) => soma + Number(o?.custo_estimado ?? 0), 0)

  const disponibilizar = useDisponibilizarFerramenta()
  const queryClient = useQueryClient()
  const [saindoId, setSaindoId] = useState<number | null>(null)

  function handleDisponibilizar(ferramentaId: number, nomeFerramenta: string) {
    disponibilizar.mutate(ferramentaId, {
      onSuccess: () => {
        playSomConfirmacao()
        toast.success(`${nomeFerramenta} disponibilizada novamente.`)
        setSaindoId(ferramentaId)
        setTimeout(() => {
          setSaindoId(null)
          queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
        }, SAIDA_MS)
      },
      onError: (erro: any) => {
        avisarErro(erro?.response?.data?.error?.message ?? 'Não foi possível disponibilizar a ferramenta.')
      },
    })
  }

  return (
    <div className="flex lista-stagger flex-col gap-4 p-6">
      <Card className="border-l-4 border-l-status-indisponivel">
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-corpo text-muted-foreground">
            Ferramentas fora de operação por avaria ou perda. Nada aqui está com um colaborador em uso — é estoque
            parado com tratativa aberta.
          </p>
          <div className="flex shrink-0 gap-8">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-kpi tabular-nums text-status-indisponivel">{data?.meta.total ?? '—'}</span>
              <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">
                indisponíveis
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-kpi tabular-nums text-status-atraso">{ocorrenciasAbertas}</span>
              <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">
                ocorrências abertas
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-kpi tabular-nums">{formatarMoeda(custoEstimadoTotal)}</span>
              <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">
                custo estimado
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-xs">
            <CardContent className="flex items-center gap-5">
              <Skeleton className="size-14 shrink-0 rounded" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}

      {!isLoading && isError && (
        <EmptyState
          icone={TriangleAlert}
          titulo="Não foi possível carregar as ferramentas indisponíveis"
          descricao="Verifique sua conexão ou tente novamente em instantes."
        />
      )}

      {!isLoading && !isError && ferramentas.length === 0 && (
        <EmptyState icone={PackageX} titulo="Nenhuma ferramenta indisponível" descricao="Tudo certo por aqui." />
      )}

      {!isLoading &&
        !isError &&
        ferramentas.map((ferramenta, i) => (
          <OcorrenciaCard
            key={ferramenta.id}
            ferramenta={ferramenta}
            ocorrencia={ocorrenciasPorFerramenta[i]}
            colaborador={
              ocorrenciasPorFerramenta[i]?.colaborador_id != null
                ? colaboradorPorId.get(ocorrenciasPorFerramenta[i]!.colaborador_id!)
                : null
            }
            carregandoDetalhe={historicos[i]?.isLoading ?? false}
            onDisponibilizar={() => handleDisponibilizar(ferramenta.id, ferramenta.nome)}
            disponibilizando={disponibilizar.isPending && disponibilizar.variables === ferramenta.id}
            saindo={saindoId === ferramenta.id}
          />
        ))}
    </div>
  )
}
