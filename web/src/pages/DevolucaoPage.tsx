import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Barcode, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { AtalhosDeTeste } from '@/components/fluxo/AtalhosDeTeste'
import { CampoIdentificacao, DicaEnter } from '@/components/fluxo/CampoIdentificacao'
import { DetalhesEmprestimo } from '@/components/fluxo/DetalhesEmprestimo'
import { FormularioOcorrencia } from '@/components/fluxo/FormularioOcorrencia'
import { RodapeFluxo } from '@/components/fluxo/RodapeFluxo'
import { SecaoFluxo } from '@/components/fluxo/SecaoFluxo'
import { SeletorCondicao } from '@/components/fluxo/SeletorCondicao'

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

/** Máscara de centavos: cada dígito empurra a casa decimal, igual ao valor do Pix no app do Mercado Pago. */
function formatarMoeda(digitos: string) {
  const centavos = Number.parseInt(digitos, 10)
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
  const custoEstimado = watch('custoEstimado') ?? ''
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
        <SecaoFluxo
          titulo="1. Ferramenta em empréstimo"
          descricao="Bipe o leitor ou digite o código de patrimônio a devolver"
        >
          {!emprestimo ? (
            <div className="space-y-2">
              <CampoIdentificacao
                {...register('ferramentaCodigo')}
                icone={Barcode}
                mono
                autoFocus
                placeholder="Código de patrimônio ou nome da ferramenta"
                estadoClassName={cn(
                  'border-2',
                  emprestimoNaoEncontrado && 'animate-erro border-destructive',
                  !ferramentaCodigo && 'border-brand-red',
                )}
              >
                {emprestimoNaoEncontrado && <XCircle className="size-5 shrink-0 text-destructive" />}
                {!ferramentaCodigo && <DicaEnter />}
              </CampoIdentificacao>
              {emprestimoNaoEncontrado && (
                <p className="text-sm text-destructive">
                  Nenhum empréstimo aberto encontrado para "{ferramentaCodigo}".
                </p>
              )}

              <AtalhosDeTeste
                onSimular={simularLeitura}
                atalhos={[
                  { codigo: 'SF000093', label: 'Simular leitura · SF000093 (atrasada)' },
                  { codigo: 'SF000418', label: 'Simular leitura · SF000418 (no prazo)' },
                ]}
              />
            </div>
          ) : (
            <DetalhesEmprestimo
              emprestimo={emprestimo}
              saida={formatarData(emprestimo.saidaEm)}
              diasDesdeSaida={diasDesdeSaida}
              diasAtraso={diasAtraso}
              onBuscarOutra={buscarOutra}
            />
          )}
        </SecaoFluxo>

        {emprestimo && (
          <SecaoFluxo titulo="2. Condição da ferramenta na devolução">
            <SeletorCondicao
              value={condicao}
              onChange={(valor) => setValue('condicao', valor, { shouldValidate: true })}
            />

            {(condicao === 'avaria' || condicao === 'perda') && (
              <FormularioOcorrencia
                tipo={condicao}
                ferramenta={emprestimo.ferramenta}
                retiradoPor={emprestimo.retiradoPor}
                matricula={emprestimo.matricula}
                descricaoProps={register('descricaoOcorrencia')}
                confirmacaoProps={register('confirmacaoOcorrencia')}
                custoEstimado={custoEstimado}
                onCustoChange={(digitos) => setValue('custoEstimado', digitos ? formatarMoeda(digitos) : '')}
                confirmado={confirmacaoOcorrencia}
              />
            )}
          </SecaoFluxo>
        )}
      </div>

      <RodapeFluxo
        rotuloUsuario="Recebido por"
        usuario={USUARIO_LOGADO}
        faltando={faltando}
        textoBotao={precisaOcorrencia ? 'Confirmar e abrir ocorrência' : 'Confirmar devolução'}
        comIcones
      />
    </form>
  )
}
