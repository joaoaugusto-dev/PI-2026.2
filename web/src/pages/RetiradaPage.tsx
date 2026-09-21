import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Barcode, CheckCircle2, IdCard, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { SeletorDataCalendario } from '@/components/SeletorDataCalendario'
import { StatusBadge } from '@/components/StatusBadge'
import { AtalhosDeTeste } from '@/components/fluxo/AtalhosDeTeste'
import { CadastroRapidoColaborador } from '@/components/fluxo/CadastroRapidoColaborador'
import { CampoIdentificacao, DicaEnter } from '@/components/fluxo/CampoIdentificacao'
import { RodapeFluxo } from '@/components/fluxo/RodapeFluxo'
import { RotuloCampo } from '@/components/fluxo/RotuloCampo'
import { SecaoFluxo } from '@/components/fluxo/SecaoFluxo'

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

  function usarCadastroRapido({ nome, matricula }: { nome: string; matricula: string }) {
    setColaboradores((atual) => [...atual, { nome, matricula }])
    setValue('colaborador', matricula, { shouldValidate: true })
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

          <AtalhosDeTeste
            onSimular={simularLeitura}
            atalhos={[
              { codigo: 'SF000452', label: 'Simular leitura · SF000452' },
              { codigo: 'SF000093', label: 'Ler ferramenta já emprestada' },
            ]}
          />
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

          {colaboradorNaoEncontrado && <CadastroRapidoColaborador onUsar={usarCadastroRapido} />}
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
        usuario={USUARIO_LOGADO}
        faltando={faltando}
        textoBotao="Confirmar retirada"
      />
    </form>
  )
}
