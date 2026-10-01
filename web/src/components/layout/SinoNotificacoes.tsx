import { AlertTriangleIcon, BellIcon, CalendarClockIcon, CheckIcon, InfoIcon, WrenchIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { useMarcarLida, useMarcarTodasLidas, useNotificacoes, type Notificacao } from '@/hooks/useNotificacoes'
import { cn } from '@/lib/utils'

// cada tipo tem cor, ícone e rótulo próprios para a lista não virar uma massa uniforme
const TIPOS: Record<Notificacao['tipo'], { rotulo: string; Icone: LucideIcon; borda: string; icone: string; texto: string }> = {
  atraso: {
    rotulo: 'Atrasado',
    Icone: AlertTriangleIcon,
    borda: 'border-l-red-500',
    icone: 'bg-red-500/15 text-red-600 dark:text-red-400',
    texto: 'text-red-600 dark:text-red-400',
  },
  devolucao_hoje: {
    rotulo: 'Vence hoje',
    Icone: CalendarClockIcon,
    borda: 'border-l-amber-500',
    icone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    texto: 'text-amber-600 dark:text-amber-400',
  },
  ocorrencia_pendente: {
    rotulo: 'Ocorrência',
    Icone: WrenchIcon,
    borda: 'border-l-orange-500',
    icone: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    texto: 'text-orange-600 dark:text-orange-400',
  },
  sistema: {
    rotulo: 'Aviso',
    Icone: InfoIcon,
    borda: 'border-l-sky-500',
    icone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    texto: 'text-sky-600 dark:text-sky-400',
  },
}

const ATRASO_SAIDA_MS = 350 // tempo da animação de saída antes de tirar o item da lista

function haQuantoTempo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.floor(min / 60)} h`
  return `há ${Math.floor(min / 1440)} d`
}

// miolo visual compartilhado entre o item da lista e o popup de notificação nova
function ConteudoNotificacao({ n }: { n: Notificacao }) {
  const { rotulo, Icone, icone, texto } = TIPOS[n.tipo]
  return (
    <>
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', icone)}>
        <Icone className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('text-[11px] font-semibold uppercase tracking-wide', texto)}>{rotulo}</span>
          <span className="text-[11px] text-muted-foreground">{haQuantoTempo(n.created_at)}</span>
        </span>
        <span className="mt-0.5 block text-xs font-normal leading-snug text-foreground">{n.mensagem}</span>
      </span>
    </>
  )
}

export function SinoNotificacoes() {
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState<ReadonlySet<number>>(new Set())
  const navegar = useNavigate()
  const { data, isError, refetch } = useNotificacoes(true)
  const marcarLida = useMarcarLida()
  const marcarTodas = useMarcarTodasLidas()
  const [aba, setAba] = useState<'novas' | 'historico'>('novas')
  const historico = useNotificacoes(aberto && aba === 'historico', true)
  const itens = data?.data ?? []
  const total = data?.meta.total ?? 0

  // ids já vistos: a primeira carga só inicializa, as seguintes avisam sobre o que é novo
  const vistas = useRef<Set<number> | null>(null)
  const [tocando, setTocando] = useState(false)
  useEffect(() => {
    if (!data) return
    const novas = data.data.filter((n) => !vistas.current?.has(n.id))
    const primeiraCarga = vistas.current === null
    vistas.current = new Set(data.data.map((n) => n.id))
    if (primeiraCarga || novas.length === 0) return
    setTocando(true)
    setTimeout(() => setTocando(false), 1000)
    for (const n of novas.slice(0, 3)) {
      toast.custom(
        (id) => (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(id)
              setAberto(true)
            }}
            className={cn(
              'flex w-[356px] max-w-[calc(100vw-2rem)] cursor-pointer items-center gap-2 rounded-md border border-l-4 bg-popover py-2.5 pr-3 pl-2 font-sans shadow-lg',
              TIPOS[n.tipo].borda
            )}
          >
            <ConteudoNotificacao n={n} />
          </button>
        ),
        { duration: 8000 }
      )
    }
    if (novas.length > 3) toast.info(`e mais ${novas.length - 3} notificações novas`)
  }, [data])

  // anima a saída e só então avisa a API (a lista refaz a consulta e o item some de vez)
  function concluir(ids: number[]) {
    setSaindo((atual) => new Set([...atual, ...ids]))
    setTimeout(() => {
      if (ids.length === 1) marcarLida.mutate(ids[0])
      else marcarTodas.mutate()
      setSaindo(new Set())
    }, ATRASO_SAIDA_MS)
  }

  function abrir(n: Notificacao) {
    setAberto(false)
    marcarLida.mutate(n.id)
    if (n.link) navegar(n.link)
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(abrindo) => {
        setAberto(abrindo)
        if (abrindo) void refetch()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative cursor-pointer"
          aria-label={total > 0 ? `Notificações: ${total} não lidas` : 'Notificações'}
        >
          <BellIcon className={cn('size-4 text-muted-foreground hover:text-foreground transition-colors', tocando && 'sino-tocando')} />
          {total > 0 && (
            <Badge className="absolute -top-2 -right-2 min-w-4 h-4 justify-center rounded-full px-1 text-[10px] bg-[var(--brand-red)] text-white">
              {total > 99 ? '99+' : total}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex gap-1" role="tablist">
            {(['novas', 'historico'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className={cn(
                  'cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  aba === id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {id === 'novas' ? `Novas${total > 0 ? ` (${total})` : ''}` : 'Histórico'}
              </button>
            ))}
          </div>
          {aba === 'novas' && itens.length > 0 && (
            <button
              type="button"
              onClick={() => concluir(itens.map((n) => n.id))}
              title="Marca como lidas para toda a equipe"
              className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar tudo
            </button>
          )}
        </div>
        {aba === 'historico' ? (
          historico.isError ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Não foi possível carregar.</p>
          ) : (historico.data?.data.length ?? 0) === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {historico.isPending ? 'Carregando…' : 'Nenhuma notificação lida nos últimos 30 dias.'}
            </p>
          ) : (
            <ul className="scrollbar-fino max-h-96 overflow-y-auto">
              {historico.data?.data.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAberto(false)
                      if (n.link) navegar(n.link)
                    }}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2 border-b border-l-4 py-2 pr-3 pl-2 opacity-70 hover:bg-muted hover:opacity-100',
                      TIPOS[n.tipo].borda
                    )}
                  >
                    <ConteudoNotificacao n={n} />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : isError ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Não foi possível carregar.</p>
        ) : itens.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nada novo por aqui.</p>
        ) : (
          <ul className="scrollbar-fino max-h-96 overflow-y-auto">
            {itens.map((n) => {
              const { borda } = TIPOS[n.tipo]
              const saiu = saindo.has(n.id)
              return (
                // grid 1fr -> 0fr anima a altura sem medir; o translate/opacity dão a saída lateral
                <li
                  key={n.id}
                  className={cn(
                    'grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out motion-reduce:transition-none',
                    saiu ? 'grid-rows-[0fr] translate-x-8 opacity-0' : 'grid-rows-[1fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <div className={cn('flex items-center gap-2 border-b border-l-4 py-2 pr-3 pl-2 hover:bg-muted', borda)}>
                      <button type="button" onClick={() => abrir(n)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <ConteudoNotificacao n={n} />
                      </button>
                      <button
                        type="button"
                        onClick={() => concluir([n.id])}
                        aria-label="Marcar como lida"
                        title="Marcar como lida"
                        className={cn(
                          'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-all duration-200 motion-reduce:transition-none hover:opacity-80 active:scale-90',
                          saiu ? 'scale-110 bg-emerald-500' : 'bg-[var(--brand-red)]'
                        )}
                      >
                        <CheckIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
