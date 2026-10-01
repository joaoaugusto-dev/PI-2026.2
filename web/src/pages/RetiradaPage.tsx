import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Barcode, CheckCircle2, IdCard, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { SeletorDataCalendario } from '@/components/SeletorDataCalendario'
import { StatusBadge } from '@/components/StatusBadge'
import { useSetores } from '@/hooks/useSetores'
import { statusParaBadge } from '@/hooks/useFerramentas'
import { useCadastrarColaboradorRapido, useColaboradorPorTermo, useFerramentaPorTermo, useRetirarFerramenta } from '@/hooks/useRetirada'
import { useAuth } from '@/lib/auth'
import { avisarErro } from '@/lib/avisar-erro'
import { CadastroRapidoColaborador } from '@/components/fluxo/CadastroRapidoColaborador'
import { CampoIdentificacao, DicaEnter } from '@/components/fluxo/CampoIdentificacao'
import { RodapeFluxo } from '@/components/fluxo/RodapeFluxo'
import { RotuloCampo } from '@/components/fluxo/RotuloCampo'
import { SecaoFluxo } from '@/components/fluxo/SecaoFluxo'

const schema = z.object({
  ferramentaCodigo: z.string().trim().min(1, 'Bipe o leitor ou digite o código de patrimônio'),
  colaborador: z.string().trim().min(1, 'Informe matrícula, crachá ou nome'),
  atividade: z.string().trim().optional(),
  setor: z.string().min(1, 'Selecione o setor de destino'), // id do setor
  previsaoDevolucao: z.string().min(1, 'Informe a previsão de devolução'),
})

type FormValues = z.infer<typeof schema>

export function RetiradaPage() {
  const { usuario } = useAuth()
  const { data: setores } = useSetores()
  const retirar = useRetirarFerramenta()
  const cadastrarRapido = useCadastrarColaboradorRapido()

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

  // espera o leitor terminar de bipar / o usuário parar de digitar antes de consultar a API
  const [termoFerramenta, setTermoFerramenta] = useState('')
  const [termoColaborador, setTermoColaborador] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setTermoFerramenta(ferramentaCodigo.trim()), 300)
    return () => clearTimeout(id)
  }, [ferramentaCodigo])
  useEffect(() => {
    const id = setTimeout(() => setTermoColaborador(colaborador.trim()), 300)
    return () => clearTimeout(id)
  }, [colaborador])

  const { data: ferramentaAchada, isFetching: buscandoFerramenta } = useFerramentaPorTermo(termoFerramenta)
  const ferramenta = termoFerramenta === ferramentaCodigo.trim() ? (ferramentaAchada ?? null) : null
  const ferramentaBloqueada = ferramenta !== null && ferramenta.status !== 'disponivel'
  const ferramentaNaoEncontrada = termoFerramenta.length > 0 && termoFerramenta === ferramentaCodigo.trim() && !buscandoFerramenta && !ferramentaAchada

  const { data: colaboradorAchado, isFetching: buscandoColaborador } = useColaboradorPorTermo(termoColaborador)
  const colaboradorEncontrado = termoColaborador === colaborador.trim() ? (colaboradorAchado ?? null) : null
  const colaboradorNaoEncontrado =
    termoColaborador.length > 0 && termoColaborador === colaborador.trim() && !buscandoColaborador && !colaboradorAchado

  // o setor de destino começa no setor do colaborador identificado (continua editável)
  useEffect(() => {
    if (colaboradorEncontrado?.setor_id) setValue('setor', String(colaboradorEncontrado.setor_id), { shouldValidate: true })
  }, [colaboradorEncontrado?.id, colaboradorEncontrado?.setor_id, setValue])

  const faltando = [
    !ferramenta || ferramentaBloqueada ? 'ferramenta' : null,
    !colaboradorEncontrado ? 'colaborador' : null,
    !setor ? 'setor de destino' : null,
    !previsaoDevolucao ? 'previsão de devolução' : null,
  ].filter(Boolean) as string[]

  function limpar() {
    reset({ ferramentaCodigo: '', colaborador: '', atividade: '', setor: '', previsaoDevolucao: '' })
    setFocus('ferramentaCodigo')
  }

  function onConfirmar(data: FormValues) {
    if (!ferramenta || !colaboradorEncontrado) return
    retirar.mutate(
      {
        ferramentaId: ferramenta.id,
        colaboradorId: colaboradorEncontrado.id,
        setorDestinoId: Number(data.setor),
        previsaoDevolucao: data.previsaoDevolucao,
        atividadeObservacao: data.atividade?.trim() || undefined,
      },
      {
        onSuccess: () => {
          playSomConfirmacao()
          toast.success(`Retirada registrada: ${ferramenta.nome} para ${colaboradorEncontrado.nome}`)
          limpar()
        },
        onError: (e) =>
          avisarErro(
            (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
              'Não foi possível registrar a retirada.',
          ),
      },
    )
  }

  function usarCadastroRapido({ nome, matricula, setorId }: { nome: string; matricula: string; setorId: number }) {
    cadastrarRapido.mutate(
      { nome, matricula, setorId },
      {
        onSuccess: (novo) => {
          toast.success(`${novo.nome} cadastrado.`)
          setValue('colaborador', novo.matricula, { shouldValidate: true })
        },
        onError: (e) =>
          avisarErro(
            (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
              'Não foi possível cadastrar o colaborador.',
          ),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit(onConfirmar)} className="flex min-h-full flex-col">
      <div className="animate-entrada flex-1 space-y-8 p-6 pb-28">
        <SecaoFluxo
          titulo="1. Ferramenta"
          descricao="Dispare o leitor no código de patrimônio ou digite o código / nome"
        >
          <div className="space-y-2">
            <CampoIdentificacao
              {...register('ferramentaCodigo')}
              icone={Barcode}
              mono
              autoFocus
              placeholder="Código de patrimônio ou nome da ferramenta"
              estadoClassName={cn(
                'border-2',
                ferramenta && !ferramentaBloqueada && 'animate-reconhecido border-status-disponivel/50 bg-status-disponivel/5',
                (ferramentaBloqueada || ferramentaNaoEncontrada) && 'animate-erro border-destructive',
                !ferramentaCodigo && 'border-brand-red',
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (ferramenta && !ferramentaBloqueada) setFocus('colaborador')
                }
              }}
            >
              {ferramenta && !ferramentaBloqueada && <CheckCircle2 className="size-5 shrink-0 text-status-disponivel" />}
              {(ferramentaBloqueada || ferramentaNaoEncontrada) && <XCircle className="size-5 shrink-0 text-destructive" />}
              {!ferramentaCodigo && <DicaEnter />}
            </CampoIdentificacao>
            {ferramenta && (
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={statusParaBadge(ferramenta.status)} />
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

        </SecaoFluxo>

        <SecaoFluxo titulo="2. Colaborador" descricao="Matrícula, crachá ou nome">
          <CampoIdentificacao
            {...register('colaborador')}
            icone={IdCard}
            placeholder="Matrícula ou nome do colaborador"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (colaborador.trim()) setFocus('atividade')
              }
            }}
          >
            {colaboradorEncontrado && <CheckCircle2 className="size-5 shrink-0 text-status-disponivel" />}
            {!colaborador && <DicaEnter />}
          </CampoIdentificacao>

          {colaboradorEncontrado && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{colaboradorEncontrado.nome}</span>
              <span className="text-sm text-muted-foreground">
                Matrícula {colaboradorEncontrado.matricula} ·{' '}
                {setores?.find((s) => s.id === colaboradorEncontrado.setor_id)?.nome ?? 'sem setor'}
              </span>
            </div>
          )}

          {colaboradorNaoEncontrado && <CadastroRapidoColaborador
              setores={setores ?? []}
              enviando={cadastrarRapido.isPending}
              onUsar={usarCadastroRapido}
            />}
        </SecaoFluxo>

        <SecaoFluxo
          titulo="3. Detalhes da retirada"
          descricao="Setor de destino é obrigatório; atividade é opcional"
        >
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <RotuloCampo>Atividade / motivo</RotuloCampo>
              <textarea
                {...register('atividade')}
                rows={2}
                placeholder="Descreva o motivo da retirada (opcional)"
                className="w-full resize-none rounded-lg border px-3 py-2 text-corpo outline-none focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20"
              />
            </div>

            <div className="space-y-2">
              <RotuloCampo>Setor de destino</RotuloCampo>
              <div className="flex flex-wrap gap-2">
                {setores?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setValue('setor', String(s.id), { shouldValidate: true })}
                    className={cn(
                      'h-(--control-h) rounded-lg border px-4 text-corpo font-medium transition-colors hover:bg-muted',
                      setor === String(s.id) && 'border-transparent bg-foreground text-white hover:bg-foreground',
                    )}
                  >
                    {s.nome}
                  </button>
                ))}
              </div>
              {errors.setor && <p className="text-sm text-destructive">{errors.setor.message}</p>}
            </div>

            <div className="space-y-2">
              <RotuloCampo>Previsão de devolução</RotuloCampo>
              <SeletorDataCalendario
                value={previsaoDevolucao}
                onChange={(iso) => setValue('previsaoDevolucao', iso, { shouldValidate: true })}
              />
            </div>
          </div>
        </SecaoFluxo>
      </div>

      <RodapeFluxo
        rotuloUsuario="Registrado por"
        usuario={usuario?.nome ?? '—'}
        enviando={retirar.isPending}
        faltando={faltando}
        textoBotao="Confirmar retirada"
      />
    </form>
  )
}
