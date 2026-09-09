import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Barcode, CheckCircle2, IdCard, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { SeletorDataCalendario } from '@/components/SeletorDataCalendario'
import { StatusBadge } from '@/components/StatusBadge'

/**
 * Tela mockada (Sprint 4 — FE-08): não há endpoint de retirada ainda, então
 * ferramenta/colaborador são resolvidos contra listas locais. Vira chamada
 * real (`@/lib/api.ts` + TanStack Query) quando a API expuser os endpoints.
 */
const FERRAMENTAS_MOCK: Record<string, { nome: string; status: 'disponivel' | 'em-uso' | 'indisponivel' }> = {
  SF000452: { nome: 'Furadeira de Impacto 1/2"', status: 'disponivel' },
  SF000418: { nome: 'Bomba de Teste Hidrostático', status: 'disponivel' },
  SF000093: { nome: 'Chave de Impacto Pneumática 1/2"', status: 'em-uso' },
  SF000602: { nome: 'Durômetro Portátil', status: 'indisponivel' },
}

const COLABORADORES_MOCK = [
  { matricula: '4412', nome: 'Jocimar Ferreira da Silva' },
  { matricula: '6620', nome: 'Rafael Antunes' },
  { matricula: '2874', nome: 'Cleiton Barbosa' },
  { matricula: '3097', nome: 'Wellington Souza Lima' },
]

const SETORES = ['Caldeiraria', 'Manutenção', 'Montagem', 'Qualidade', 'Expedição', 'Usinagem', 'Pintura']

const USUARIO_LOGADO = 'Marcos Andrade'

function buscarFerramenta(valor: string) {
  const chave = valor.trim().toUpperCase()
  if (!chave) return null
  if (FERRAMENTAS_MOCK[chave]) return { codigo: chave, ...FERRAMENTAS_MOCK[chave] }
  const porNome = Object.entries(FERRAMENTAS_MOCK).find(([, f]) =>
    f.nome.toLowerCase().includes(chave.toLowerCase()),
  )
  return porNome ? { codigo: porNome[0], ...porNome[1] } : null
}

function buscarColaborador(valor: string, colaboradores: typeof COLABORADORES_MOCK) {
  const chave = valor.trim().toLowerCase()
  if (chave.length < 2) return null
  return colaboradores.find((c) => c.matricula === chave || c.nome.toLowerCase().includes(chave)) ?? null
}

const schema = z.object({
  ferramentaCodigo: z.string().trim().min(1, 'Bipe o leitor ou digite o código de patrimônio'),
  colaborador: z.string().trim().min(1, 'Informe matrícula, crachá ou nome'),
  atividade: z.string().trim().optional(),
  setor: z.string().min(1, 'Selecione o setor de destino'),
  previsaoDevolucao: z.string().min(1, 'Informe a previsão de devolução'),
})

type FormValues = z.infer<typeof schema>

export function RetiradaPage() {
  const [colaboradores, setColaboradores] = useState(COLABORADORES_MOCK)
  const [cadastroRapido, setCadastroRapido] = useState({ nome: '', matricula: '' })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      ferramentaCodigo: '',
      colaborador: '',
      atividade: '',
      setor: '',
      previsaoDevolucao: '',
    },
  })

  const ferramentaCodigo = watch('ferramentaCodigo')
  const colaborador = watch('colaborador')
  const setor = watch('setor')
  const previsaoDevolucao = watch('previsaoDevolucao')

  const ferramenta = useMemo(() => buscarFerramenta(ferramentaCodigo), [ferramentaCodigo])
  const ferramentaBloqueada = ferramenta !== null && ferramenta.status !== 'disponivel'
  const ferramentaNaoEncontrada = ferramentaCodigo.trim().length >= 3 && !ferramenta

  const colaboradorEncontrado = useMemo(
    () => buscarColaborador(colaborador, colaboradores),
    [colaborador, colaboradores],
  )
  const colaboradorNaoEncontrado = colaborador.trim().length >= 3 && !colaboradorEncontrado

  const faltando = [
    !ferramenta || ferramentaBloqueada ? 'ferramenta' : null,
    !colaborador.trim() || colaboradorNaoEncontrado ? 'colaborador' : null,
    !setor ? 'setor de destino' : null,
    !previsaoDevolucao ? 'previsão de devolução' : null,
  ].filter(Boolean) as string[]

  const podeConfirmar = faltando.length === 0

  function onConfirmar(data: FormValues) {
    playSomConfirmacao()
    toast.success(`Retirada registrada: ${ferramenta?.nome} para ${data.colaborador}`)
    reset({
      ferramentaCodigo: '',
      colaborador: '',
      atividade: '',
      setor: '',
      previsaoDevolucao: '',
    })
    setFocus('ferramentaCodigo')
  }

  function simularLeitura(codigo: string) {
    setValue('ferramentaCodigo', codigo, { shouldValidate: true })
    setFocus('colaborador')
  }

  function usarCadastroRapido() {
    const nome = cadastroRapido.nome.trim()
    const matricula = cadastroRapido.matricula.trim()
    if (!nome || !matricula) return
    setColaboradores((atual) => [...atual, { nome, matricula }])
    setValue('colaborador', matricula, { shouldValidate: true })
    setCadastroRapido({ nome: '', matricula: '' })
  }

  return (
    <form onSubmit={handleSubmit(onConfirmar)} className="flex min-h-full flex-col">
      <div className="animate-entrada flex-1 space-y-8 p-6 pb-28">
        <section className="space-y-3">
          <div>
            <h2 className="text-secao">1. Ferramenta</h2>
            <p className="text-corpo text-muted-foreground">
              Dispare o leitor no código de patrimônio ou digite o código / nome
            </p>
          </div>

          <div className="space-y-2">
            <div
              className={cn(
                'flex h-(--control-h) items-center gap-2 rounded-lg border-2 bg-background px-3 focus-within:border-brand-red focus-within:ring-2 focus-within:ring-brand-red/20',
                ferramenta && !ferramentaBloqueada && 'animate-reconhecido border-status-disponivel/50 bg-status-disponivel/5',
                (ferramentaBloqueada || ferramentaNaoEncontrada) && 'animate-erro border-destructive',
                !ferramentaCodigo && 'border-brand-red',
              )}
            >
              <Barcode className="size-5 shrink-0 text-muted-foreground" />
              <input
                {...register('ferramentaCodigo')}
                autoFocus
                placeholder="Código de patrimônio ou nome da ferramenta"
                className="h-full flex-1 bg-transparent font-mono text-corpo outline-none placeholder:font-sans"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (ferramenta && !ferramentaBloqueada) setFocus('colaborador')
                  }
                }}
              />
              {ferramenta && !ferramentaBloqueada && <CheckCircle2 className="size-5 shrink-0 text-status-disponivel" />}
              {(ferramentaBloqueada || ferramentaNaoEncontrada) && <XCircle className="size-5 shrink-0 text-destructive" />}
              {!ferramentaCodigo && (
                <span className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Enter</span>
              )}
            </div>
            {ferramenta && (
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ferramenta.status} />
                <span className="text-sm text-muted-foreground">{ferramenta.nome}</span>
              </div>
            )}
            {ferramenta && ferramentaBloqueada && (
              <p className="text-sm text-destructive">
                Só um empréstimo aberto por ferramenta — não é possível retirar.
              </p>
            )}
            {ferramentaNaoEncontrada && (
              <p className="text-sm text-destructive">Nenhuma ferramenta encontrada para "{ferramentaCodigo}".</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <p className="w-full text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Atalhos de teste</p>
            <button
              type="button"
              onClick={() => simularLeitura('SF000452')}
              className="h-9 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Simular leitura · SF000452
            </button>
            <button
              type="button"
              onClick={() => simularLeitura('SF000093')}
              className="h-9 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Ler ferramenta já emprestada
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-secao">2. Colaborador</h2>
            <p className="text-corpo text-muted-foreground">Matrícula, crachá ou nome</p>
          </div>

          <div className="flex h-(--control-h) items-center gap-2 rounded-lg border px-3 focus-within:border-brand-red focus-within:ring-2 focus-within:ring-brand-red/20">
            <IdCard className="size-5 shrink-0 text-muted-foreground" />
            <input
              {...register('colaborador')}
              placeholder="Matrícula ou nome do colaborador"
              className="h-full flex-1 bg-transparent text-corpo outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (colaborador.trim()) setFocus('atividade')
                }
              }}
            />
            {colaboradorEncontrado && <CheckCircle2 className="size-5 shrink-0 text-status-disponivel" />}
            {!colaborador && (
              <span className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Enter</span>
            )}
          </div>

          {colaboradorNaoEncontrado && (
            <div className="space-y-2 rounded-lg border border-status-atraso/40 bg-status-atraso/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-status-atraso">
                <AlertTriangle className="size-4" />
                Colaborador não encontrado — cadastro rápido, sem perder o que já foi preenchido
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
                <input
                  value={cadastroRapido.nome}
                  onChange={(e) => setCadastroRapido((c) => ({ ...c, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="h-9 rounded-md border px-2.5 text-sm outline-none focus-visible:border-brand-red"
                />
                <input
                  value={cadastroRapido.matricula}
                  onChange={(e) => setCadastroRapido((c) => ({ ...c, matricula: e.target.value }))}
                  placeholder="Matrícula"
                  className="h-9 rounded-md border px-2.5 text-sm outline-none focus-visible:border-brand-red"
                />
                <button
                  type="button"
                  onClick={usarCadastroRapido}
                  className="h-9 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                >
                  Usar
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-secao">3. Detalhes da retirada</h2>
            <p className="text-corpo text-muted-foreground">Setor de destino é obrigatório; atividade é opcional</p>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Atividade / motivo</p>
              <textarea
                {...register('atividade')}
                rows={2}
                placeholder="Descreva o motivo da retirada (opcional)"
                className="w-full resize-none rounded-lg border px-3 py-2 text-corpo outline-none focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20"
              />
            </div>

            <div className="space-y-2">
              <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Setor de destino</p>
              <div className="flex flex-wrap gap-2">
                {SETORES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue('setor', s, { shouldValidate: true })}
                    className={cn(
                      'h-(--control-h) rounded-lg border px-4 text-corpo font-medium transition-colors hover:bg-muted',
                      setor === s && 'border-transparent bg-foreground text-white hover:bg-foreground',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {errors.setor && <p className="text-sm text-destructive">{errors.setor.message}</p>}
            </div>

            <div className="space-y-2">
              <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Previsão de devolução</p>
              <SeletorDataCalendario
                value={previsaoDevolucao}
                onChange={(iso) => setValue('previsaoDevolucao', iso, { shouldValidate: true })}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background/95 px-6 py-3 backdrop-blur">
        <div>
          <p className="text-corpo">
            Registrado por: <span className="font-medium">{USUARIO_LOGADO}</span>
          </p>
          {faltando.length > 0 ? (
            <p className="text-sm text-status-atraso">Falta preencher: {faltando.join(', ')}</p>
          ) : (
            <p className="text-sm text-status-disponivel">Pronto para confirmar</p>
          )}
        </div>
        <button
          type="submit"
          disabled={!podeConfirmar}
          className="h-(--control-h-fluxo) shrink-0 rounded-lg bg-brand-red px-6 text-corpo font-medium text-white transition-colors hover:bg-brand-red-dark active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
        >
          Confirmar retirada
        </button>
      </div>
    </form>
  )
}
