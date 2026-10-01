import { toast } from 'sonner'
import { ArrowRight, Check, CheckCircle2, Loader2 } from 'lucide-react'
import { IconeFerramenta } from '@/components/ferramentas/IconeFerramenta'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatarPatrimonio, type Ferramenta } from '@/hooks/useFerramentas'
import { useAvancarTratativa, type Colaborador, type Ocorrencia, type StatusOcorrencia } from '@/hooks/useOcorrencias'
import { avisarErro } from '@/lib/avisar-erro'
import { dataBR } from '@/lib/formatar'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { cn } from '@/lib/utils'

const ETAPAS: { valor: StatusOcorrencia; label: string }[] = [
  { valor: 'aberta', label: 'Aberta' },
  { valor: 'em_reparo', label: 'Em reparo' },
  { valor: 'cobrada', label: 'Cobrada' },
  { valor: 'resolvida', label: 'Resolvida' },
]

function formatarMoeda(valor: string | null) {
  if (!valor) return '—'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type OcorrenciaCardProps = {
  ferramenta: Ferramenta
  ocorrencia?: Ocorrencia
  colaborador?: Colaborador | null
  carregandoDetalhe: boolean
  onDisponibilizar: () => void
  disponibilizando: boolean
}

/** Card de ocorrência da tela Indisponíveis — segue o frame "05 - Indisponíveis" do Figma. */
export function OcorrenciaCard({
  ferramenta,
  ocorrencia,
  colaborador,
  carregandoDetalhe,
  onDisponibilizar,
  disponibilizando,
}: OcorrenciaCardProps) {
  const avancar = useAvancarTratativa(ferramenta.id)
  function aoAvancar() {
    if (!ocorrencia) return
    avancar.mutate(ocorrencia.id, {
      onSuccess: (nova) => {
        playSomConfirmacao()
        toast.success(`Tratativa avançada para ${ETAPAS.find((e) => e.valor === nova.status)?.label ?? nova.status}.`)
      },
      onError: (e) =>
        avisarErro(
          (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
            'Não foi possível avançar a tratativa.',
        ),
    })
  }
  const etapaAtualIndex = ocorrencia ? ETAPAS.findIndex((e) => e.valor === ocorrencia.status) : -1
  const resolvida = ocorrencia?.status === 'resolvida'
  const tipoTag = ocorrencia?.tipo?.toUpperCase() ?? ferramenta.motivo_indisponivel?.toUpperCase()
  const corTag = tipoTag === 'PERDA' ? 'text-status-indisponivel bg-status-indisponivel/15' : 'text-status-atraso bg-status-atraso/15'

  return (
    <Card className="shadow-xs">
      <CardContent className="flex flex-col gap-3.5">
        <div className="flex items-start gap-5">
          <IconeFerramenta
            nome={ferramenta.nome}
            fotoUrl={ferramenta.foto_url}
            className="size-14 shrink-0 bg-status-indisponivel/10 text-status-indisponivel"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <p className="truncate text-secao font-semibold">{ferramenta.nome}</p>
              {tipoTag && (
                <span className={cn('shrink-0 rounded-sm px-2.5 py-0.5 text-[10px] font-semibold', corTag)}>
                  {tipoTag}
                </span>
              )}
            </div>
            <p className="font-mono text-rotulo text-muted-foreground">
              {formatarPatrimonio(ferramenta.codigo_identificacao)}
            </p>
            {carregandoDetalhe ? (
              <Skeleton className="mt-1 h-4 w-2/3" />
            ) : (
              <p className="text-corpo text-muted-foreground">{ocorrencia?.descricao ?? '—'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-3.5 sm:grid-cols-4">
          {(
            [
              ['Responsável', carregandoDetalhe ? null : (colaborador?.nome ?? '—')],
              ['Matrícula', carregandoDetalhe ? null : (colaborador?.matricula ?? '—')],
              ['Data', carregandoDetalhe ? null : ocorrencia ? dataBR(ocorrencia.created_at) : '—'],
              ['Custo estimado', carregandoDetalhe ? null : formatarMoeda(ocorrencia?.custo_estimado ?? null)],
            ] as const
          ).map(([label, valor]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
              {valor === null ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span className="truncate text-corpo font-semibold">{valor}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t pt-3.5">
          <div className="grid grid-cols-4">
            {ETAPAS.map((etapa, index) => {
              const concluida = etapaAtualIndex >= 0 && index <= etapaAtualIndex
              const atual = index === etapaAtualIndex
              const ehResolvida = etapa.valor === 'resolvida' && resolvida
              return (
                <div key={etapa.valor} className="flex flex-col items-center gap-1">
                  <div className="relative flex h-7 w-full items-center justify-center">
                    {index > 0 && (
                      <div
                        className={cn(
                          'absolute top-1/2 right-1/2 h-0.5 w-full -translate-y-1/2',
                          index <= etapaAtualIndex ? 'bg-foreground' : 'bg-border',
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-rotulo font-bold',
                        ehResolvida
                          ? 'border-status-disponivel bg-status-disponivel text-white'
                          : atual
                            ? 'border-status-indisponivel bg-status-indisponivel text-white'
                            : concluida
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-card text-muted-foreground',
                      )}
                    >
                      {concluida && !atual ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    {index < ETAPAS.length - 1 && (
                      <div
                        className={cn(
                          'absolute top-1/2 left-1/2 h-0.5 w-full -translate-y-1/2',
                          index < etapaAtualIndex ? 'bg-foreground' : 'bg-border',
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium whitespace-nowrap',
                      ehResolvida
                        ? 'text-status-disponivel font-semibold'
                        : atual
                          ? 'text-status-indisponivel font-semibold'
                          : concluida
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                    )}
                  >
                    {etapa.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2">
            {resolvida ? (
              <Button
                className="bg-status-disponivel text-white hover:bg-status-disponivel/90"
                onClick={onDisponibilizar}
                disabled={disponibilizando}
              >
                {disponibilizando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Disponibilizar ferramenta
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={aoAvancar}
                  disabled={!ocorrencia || avancar.isPending}
                >
                  {avancar.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  Avançar tratativa
                </Button>
                <Button onClick={onDisponibilizar} disabled={disponibilizando}>
                  {disponibilizando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Disponibilizar ferramenta
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
