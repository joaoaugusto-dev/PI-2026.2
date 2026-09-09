import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Barcode, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { playSomConfirmacao } from '@/lib/som-confirmacao'

/**
 * Tela mockada (Sprint 4 — FE-15): API-12 (PATCH .../devolucao) e FE-09
 * (campo de identificação compartilhado) ainda não existem, então o
 * empréstimo aberto é resolvido contra uma lista local. Vira chamada real
 * (`@/lib/api.ts` + TanStack Query) quando a API expuser o endpoint.
 */
function isoDiasAtras(dias: number) {
  const data = new Date()
  data.setDate(data.getDate() - dias)
  return data.toISOString().slice(0, 10)
}

function diasEntre(a: Date, b: Date) {
  const inicioA = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const inicioB = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((inicioA.getTime() - inicioB.getTime()) / 86_400_000)
}

function formatarData(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')
}

const EMPRESTIMOS_MOCK: Record<
  string,
  {
    ferramenta: string
    categoria: string
    retiradoPor: string
    matricula: string
    setor: string
    atividade?: string
    saidaEm: string
    previsaoDevolucao: string
    registradoPor: string
  }
> = {
  SF000093: {
    ferramenta: 'Chave de Impacto Pneumática 1/2"',
    categoria: 'Pneumática',
    retiradoPor: 'Jocimar Ferreira da Silva',
    matricula: '4412',
    setor: 'Caldeiraria',
    atividade: 'Manutenção corretiva',
    saidaEm: isoDiasAtras(11),
    previsaoDevolucao: isoDiasAtras(9),
    registradoPor: 'Marcos Andrade',
  },
  SF000418: {
    ferramenta: 'Bomba de Teste Hidrostático',
    categoria: 'Hidráulica',
    retiradoPor: 'Rafael Antunes',
    matricula: '6620',
    setor: 'Montagem',
    saidaEm: isoDiasAtras(2),
    previsaoDevolucao: isoDiasAtras(-3),
    registradoPor: 'Marcos Andrade',
  },
}

const USUARIO_LOGADO = 'Marcos Andrade'

const CONDICOES = [
  {
    valor: 'ok' as const,
    label: 'OK',
    descricao: 'Sem avaria · volta para o estoque',
    corTexto: 'text-status-disponivel',
    ativa: 'border-status-disponivel bg-status-disponivel text-white',
  },
  {
    valor: 'avaria' as const,
    label: 'Avaria',
    descricao: 'Danificada · vai para reparo',
    corTexto: 'text-status-atraso',
    ativa: 'border-status-atraso bg-status-atraso text-white',
  },
  {
    valor: 'perda' as const,
    label: 'Perda',
    descricao: 'Não retornou · abre cobrança',
    corTexto: 'text-destructive',
    ativa: 'border-destructive bg-destructive text-white',
  },
]

function buscarEmprestimo(valor: string) {
  const chave = valor.trim().toUpperCase()
  if (!chave) return null
  if (EMPRESTIMOS_MOCK[chave]) return { codigo: chave, ...EMPRESTIMOS_MOCK[chave] }
  const porNome = Object.entries(EMPRESTIMOS_MOCK).find(([, e]) =>
    e.ferramenta.toLowerCase().includes(chave.toLowerCase()),
  )
  return porNome ? { codigo: porNome[0], ...porNome[1] } : null
}

const schema = z
  .object({
    ferramentaCodigo: z.string().trim().min(1, 'Bipe o leitor ou digite o código de patrimônio'),
    condicao: z.enum(['ok', 'avaria', 'perda']).nullable(),
    descricaoOcorrencia: z.string().trim().optional(),
    custoEstimado: z.string().optional(),
    confirmacaoOcorrencia: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.condicao && data.condicao !== 'ok') {
      if (!data.descricaoOcorrencia?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['descricaoOcorrencia'], message: 'Descreva o que aconteceu com a ferramenta' })
      }
      if (!data.confirmacaoOcorrencia) {
        ctx.addIssue({ code: 'custom', path: ['confirmacaoOcorrencia'], message: 'Confirme a abertura da ocorrência' })
      }
    }
  })

type FormValues = z.infer<typeof schema>

export function DevolucaoPage() {
  const [hoje] = useState(() => new Date())

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      ferramentaCodigo: '',
      condicao: null,
      descricaoOcorrencia: '',
      custoEstimado: '',
      confirmacaoOcorrencia: false,
    },
  })

  const ferramentaCodigo = watch('ferramentaCodigo')
  const condicao = watch('condicao')
  const descricaoOcorrencia = watch('descricaoOcorrencia') ?? ''
  const confirmacaoOcorrencia = watch('confirmacaoOcorrencia') ?? false

  const emprestimo = useMemo(() => buscarEmprestimo(ferramentaCodigo), [ferramentaCodigo])
  const emprestimoNaoEncontrado = ferramentaCodigo.trim().length >= 3 && !emprestimo

  const precisaOcorrencia = condicao === 'avaria' || condicao === 'perda'

  const diasAtraso = emprestimo ? diasEntre(hoje, new Date(`${emprestimo.previsaoDevolucao}T00:00:00`)) : 0
  const diasDesdeSaida = emprestimo ? diasEntre(hoje, new Date(`${emprestimo.saidaEm}T00:00:00`)) : 0

  const faltando = [
    !emprestimo ? 'ferramenta' : null,
    emprestimo && !condicao ? 'condição da ferramenta' : null,
    precisaOcorrencia && !descricaoOcorrencia.trim() ? 'descrição da ocorrência' : null,
    precisaOcorrencia && !confirmacaoOcorrencia ? 'confirmação da ocorrência' : null,
  ].filter(Boolean) as string[]

  const podeConfirmar = faltando.length === 0

  function buscarOutra() {
    reset({
      ferramentaCodigo: '',
      condicao: null,
      descricaoOcorrencia: '',
      custoEstimado: '',
      confirmacaoOcorrencia: false,
    })
    setFocus('ferramentaCodigo')
  }

  function simularLeitura(codigo: string) {
    setValue('ferramentaCodigo', codigo, { shouldValidate: true })
  }

  function onConfirmar(data: FormValues) {
    playSomConfirmacao()
    if (data.condicao === 'ok') {
      toast.success(`Devolução registrada: ${emprestimo?.ferramenta} voltou ao estoque`)
    } else {
      toast.success(`Ocorrência aberta: ${emprestimo?.ferramenta} foi para Indisponíveis por ${data.condicao}`)
    }
    buscarOutra()
  }

  return (
    <form onSubmit={handleSubmit(onConfirmar)} className="flex min-h-full flex-col">
      <div className="animate-entrada flex-1 space-y-8 p-6 pb-28">
        <section className="space-y-3">
          <div>
            <h2 className="text-secao">1. Ferramenta em empréstimo</h2>
            <p className="text-corpo text-muted-foreground">Bipe o leitor ou digite o código de patrimônio a devolver</p>
          </div>

          {!emprestimo ? (
            <div className="space-y-2">
              <div
                className={cn(
                  'flex h-(--control-h) items-center gap-2 rounded-lg border-2 bg-background px-3 focus-within:border-brand-red focus-within:ring-2 focus-within:ring-brand-red/20',
                  emprestimoNaoEncontrado && 'animate-erro border-destructive',
                  !ferramentaCodigo && 'border-brand-red',
                )}
              >
                <Barcode className="size-5 shrink-0 text-muted-foreground" />
                <input
                  {...register('ferramentaCodigo')}
                  autoFocus
                  placeholder="Código de patrimônio ou nome da ferramenta"
                  className="h-full flex-1 bg-transparent font-mono text-corpo outline-none placeholder:font-sans"
                />
                {emprestimoNaoEncontrado && <XCircle className="size-5 shrink-0 text-destructive" />}
                {!ferramentaCodigo && (
                  <span className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Enter</span>
                )}
              </div>
              {emprestimoNaoEncontrado && (
                <p className="text-sm text-destructive">
                  Nenhum empréstimo aberto encontrado para "{ferramentaCodigo}".
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <p className="w-full text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Atalhos de teste</p>
                <button
                  type="button"
                  onClick={() => simularLeitura('SF000093')}
                  className="h-9 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Simular leitura · SF000093 (atrasada)
                </button>
                <button
                  type="button"
                  onClick={() => simularLeitura('SF000418')}
                  className="h-9 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Simular leitura · SF000418 (no prazo)
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-entrada space-y-0 overflow-hidden rounded-lg border">
              {diasAtraso > 0 && (
                <div className="flex items-center gap-2 bg-status-atraso px-4 py-2 text-white">
                  <span className="size-2 shrink-0 rounded-full bg-current" />
                  <p className="text-sm font-medium">
                    Devolução atrasada em {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
              )}
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-secao font-semibold">{emprestimo.ferramenta}</h3>
                    <p className="text-sm text-muted-foreground">
                      {emprestimo.codigo} · {emprestimo.categoria}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={buscarOutra}
                    className="h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Buscar outra
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-3 sm:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Retirado por</p>
                    <p className="text-corpo font-medium">{emprestimo.retiradoPor}</p>
                  </div>
                  <div>
                    <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Matrícula · Setor</p>
                    <p className="text-corpo font-medium">
                      {emprestimo.matricula} · {emprestimo.setor}
                    </p>
                  </div>
                  <div>
                    <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Atividade</p>
                    <p className="text-corpo font-medium">{emprestimo.atividade || '—'}</p>
                  </div>
                  <div>
                    <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Saída · há</p>
                    <p className="text-corpo font-medium">
                      {formatarData(emprestimo.saidaEm)} · {diasDesdeSaida} {diasDesdeSaida === 1 ? 'dia' : 'dias'}
                    </p>
                  </div>
                  <div>
                    <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Registrado por</p>
                    <p className="text-corpo font-medium">{emprestimo.registradoPor}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {emprestimo && (
          <section className="space-y-3">
            <div>
              <h2 className="text-secao">2. Condição da ferramenta na devolução</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {CONDICOES.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  onClick={() => setValue('condicao', c.valor, { shouldValidate: true })}
                  className={cn(
                    'rounded-lg border-2 p-4 text-left transition-colors',
                    condicao === c.valor ? c.ativa : 'border-border hover:bg-muted',
                  )}
                >
                  <p className={cn('text-secao font-bold', condicao === c.valor ? 'text-white' : c.corTexto)}>
                    {c.label}
                  </p>
                  <p className={cn('text-sm', condicao === c.valor ? 'text-white/85' : 'text-muted-foreground')}>
                    {c.descricao}
                  </p>
                </button>
              ))}
            </div>

            {precisaOcorrencia && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Descrição da ocorrência *</p>
                  <textarea
                    {...register('descricaoOcorrencia')}
                    rows={3}
                    placeholder="O que aconteceu com a ferramenta"
                    className="w-full resize-none rounded-lg border px-3 py-2 text-corpo outline-none focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Custo estimado</p>
                  <input
                    {...register('custoEstimado')}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="h-9 w-40 rounded-md border px-2.5 text-sm outline-none focus-visible:border-brand-red"
                  />
                  <p className="text-sm text-muted-foreground">Opcional. Pode ser ajustado depois na tratativa.</p>
                </div>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm',
                    !confirmacaoOcorrencia && 'border-destructive',
                  )}
                >
                  <input
                    type="checkbox"
                    {...register('confirmacaoOcorrencia')}
                    className="mt-0.5 size-4 shrink-0 accent-brand-red"
                  />
                  <span>
                    Confirmo que <strong>{emprestimo.ferramenta}</strong> vai para{' '}
                    <strong>Indisponíveis</strong> e que uma ocorrência de{' '}
                    <strong>{condicao === 'avaria' ? 'Avaria' : 'Perda'}</strong> será aberta em nome de{' '}
                    <strong>{emprestimo.retiradoPor}</strong> (matrícula {emprestimo.matricula}).
                  </span>
                </label>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t bg-background/95 px-6 py-3 backdrop-blur">
        <div>
          <p className="text-corpo">
            Recebido por: <span className="font-medium">{USUARIO_LOGADO}</span>
          </p>
          {faltando.length > 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-status-atraso">
              <AlertTriangle className="size-4 shrink-0" />
              Falta preencher: {faltando.join(', ')}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-status-disponivel">
              <CheckCircle2 className="size-4 shrink-0" />
              Pronto para confirmar
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!podeConfirmar}
          className="h-(--control-h-fluxo) shrink-0 rounded-lg bg-brand-red px-6 text-corpo font-medium text-white transition-colors hover:bg-brand-red-dark active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
        >
          {precisaOcorrencia ? 'Confirmar e abrir ocorrência' : 'Confirmar devolução'}
        </button>
      </div>
    </form>
  )
}
