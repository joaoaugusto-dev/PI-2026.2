import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, Ban, CheckCircle2, Loader2 } from 'lucide-react'
import { ETAPAS, EtapasTratativa, rotuloEtapa } from '@/components/ferramentas/EtapasTratativa'
import { IconeFerramenta } from '@/components/ferramentas/IconeFerramenta'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatarPatrimonio, type Ferramenta } from '@/hooks/useFerramentas'
import { useAuth } from '@/lib/auth'
import { useAvancarTratativa, useBaixarFerramenta, type Colaborador, type Ocorrencia } from '@/hooks/useOcorrencias'
import { avisarErro, mensagemDeErro } from '@/lib/avisar-erro'
import { dataHoraBR } from '@/lib/formatar'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { cn } from '@/lib/utils'

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
  /** disponibilizada com sucesso: toca a saída (carimbo + colapso) antes de a lista tirar o card */
  saindo?: boolean
}

/** Card de ocorrência da tela Indisponíveis — segue o frame "05 - Indisponíveis" do Figma. */
export function OcorrenciaCard({
  ferramenta,
  ocorrencia,
  colaborador,
  carregandoDetalhe,
  onDisponibilizar,
  disponibilizando,
  saindo = false,
}: OcorrenciaCardProps) {
  const avancar = useAvancarTratativa(ferramenta.id)
  const baixar = useBaixarFerramenta()
  const { usuario } = useAuth()
  const [confirmandoBaixa, setConfirmandoBaixa] = useState(false)
  function aoBaixar() {
    baixar.mutate(ferramenta.id, {
      onSuccess: () => toast.success(`${ferramenta.nome} desativada.`),
      onError: (e) => avisarErro(mensagemDeErro(e, 'Não foi possível desativar a ferramenta.')),
    })
  }
  function aoAvancar() {
    if (!ocorrencia) return
    avancar.mutate(ocorrencia.id, {
      onSuccess: (nova) => {
        playSomConfirmacao()
        toast.success(`Tratativa avançada para ${rotuloEtapa(nova.status, perda)}.`)
      },
      onError: (e) =>
        avisarErro(mensagemDeErro(e, 'Não foi possível avançar a tratativa.')),
    })
  }
  const perda = (ocorrencia?.tipo ?? ferramenta.motivo_indisponivel)?.toLowerCase() === 'perda'
  const etapaAtualIndex = ocorrencia ? ETAPAS.findIndex((e) => e.valor === ocorrencia.status) : -1
  const resolvida = ocorrencia?.status === 'resolvida'
  const tipoTag = ocorrencia?.tipo?.toUpperCase() ?? ferramenta.motivo_indisponivel?.toUpperCase()
  const corTag = tipoTag === 'PERDA' ? 'text-status-indisponivel bg-status-indisponivel/15' : 'text-status-atraso bg-status-atraso/15'

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin] duration-[420ms] ease-soufer',
        saindo ? '-mb-4 grid-rows-[0fr] opacity-0 delay-[900ms]' : 'grid-rows-[1fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <Card className="relative shadow-xs">
          {saindo && (
            <div className="absolute inset-0 z-20 flex animate-entrada items-center justify-center gap-2.5 bg-status-disponivel text-white">
              <CheckCircle2 className="size-7 animate-check-entra" />
              <span className="text-secao font-semibold">Disponível novamente</span>
            </div>
          )}
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
                  ['Data', carregandoDetalhe ? null : ocorrencia ? dataHoraBR(ocorrencia.created_at) : '—'],
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
              <EtapasTratativa etapaAtual={etapaAtualIndex} resolvida={resolvida} perda={perda} />

              <div className="flex flex-wrap justify-end gap-2">
                {usuario?.papel === 'admin' && (
                  <Button variant="outline" onClick={() => setConfirmandoBaixa(true)}>
                    <Ban className="size-4" />
                    Desativar ferramenta
                  </Button>
                )}
                {resolvida ? (
                  <Button
                    className="animate-entrada bg-status-disponivel text-white hover:bg-status-disponivel/90"
                    onClick={onDisponibilizar}
                    disabled={disponibilizando}
                  >
                    {disponibilizando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {perda ? 'Ferramenta encontrada' : 'Disponibilizar ferramenta'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="group"
                      onClick={aoAvancar}
                      disabled={!ocorrencia || avancar.isPending}
                    >
                      {avancar.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      )}
                      {/* diz qual é o próximo passo em vez de "avançar tratativa" */}
                      {ETAPAS[etapaAtualIndex + 1] ? `Marcar ${rotuloEtapa(ETAPAS[etapaAtualIndex + 1].valor, perda).toLowerCase()}` : 'Avançar'}
                    </Button>
                    <Button onClick={onDisponibilizar} disabled={disponibilizando}>
                      {disponibilizando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      {perda ? 'Ferramenta encontrada' : 'Disponibilizar ferramenta'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmandoBaixa} onOpenChange={(a) => !a && !baixar.isPending && setConfirmandoBaixa(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar {ferramenta.nome}?</DialogTitle>
            <DialogDescription>A ferramenta sai de circulação e das listas, mas o histórico é mantido.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmandoBaixa(false)} disabled={baixar.isPending}>
              Cancelar
            </Button>
            <Button onClick={aoBaixar} disabled={baixar.isPending}>
              {baixar.isPending && <Loader2 className="size-4 animate-spin" />}
              Desativar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
