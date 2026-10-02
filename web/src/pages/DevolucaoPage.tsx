import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Barcode, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCategorias } from '@/hooks/useCategorias'
import { useDevolverEmprestimo, useEmprestimoAberto } from '@/hooks/useDevolucao'
import { formatarPatrimonio, useFerramenta } from '@/hooks/useFerramentas'
import { useAuth } from '@/lib/auth'
import { avisarErro, mensagemDeErro } from '@/lib/avisar-erro'
import { dataBR, diasEntre } from '@/lib/formatar'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { CampoIdentificacao, DicaEnter } from '@/components/fluxo/CampoIdentificacao'
import { DetalhesEmprestimo } from '@/components/fluxo/DetalhesEmprestimo'
import { FormularioOcorrencia } from '@/components/fluxo/FormularioOcorrencia'
import { RodapeFluxo } from '@/components/fluxo/RodapeFluxo'
import { SecaoFluxo } from '@/components/fluxo/SecaoFluxo'
import { SeletorCondicao } from '@/components/fluxo/SeletorCondicao'

/** Máscara de centavos: cada dígito empurra a casa decimal, igual ao valor do Pix no app do Mercado Pago. */
function formatarMoeda(digitos: string) {
  const centavos = Number.parseInt(digitos, 10)
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
  // o dashboard abre a devolução já com o código da ferramenta atrasada
  const [params] = useSearchParams()

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
      ferramentaCodigo: params.get('codigo') ?? '',
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

  // espera o usuário parar de digitar (ou o leitor terminar de bipar) antes de consultar a API
  const [termo, setTermo] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setTermo(ferramentaCodigo.trim()), 300)
    return () => clearTimeout(id)
  }, [ferramentaCodigo])

  const { usuario } = useAuth()
  const devolver = useDevolverEmprestimo()
  const { data: escolha, isFetching: buscando, isError: erroBusca } = useEmprestimoAberto(termo)
  const termoAtual = termo === ferramentaCodigo.trim()
  const encontrado = escolha?.item ?? null
  const ambiguos = termoAtual ? (escolha?.ambiguos ?? []) : []
  const { data: ferramentaDoEmprestimo } = useFerramenta(encontrado?.ferramenta_id ?? 0)
  const { data: categorias } = useCategorias()
  const emprestimo = encontrado
    ? {
        codigo: formatarPatrimonio(encontrado.codigo_identificacao),
        ferramenta: encontrado.ferramenta_nome,
        categoria: categorias?.find((c) => c.id === ferramentaDoEmprestimo?.grupo_id)?.nome ?? '—',
        retiradoPor: encontrado.colaborador_nome,
        matricula: encontrado.colaborador_matricula,
        setor: encontrado.setor_nome,
        atividade: encontrado.atividade_nome ?? undefined,
        registradoPor: encontrado.usuario_retirada_nome ?? '—',
      }
    : null
  const emprestimoNaoEncontrado = termo.length >= 1 && termoAtual && !buscando && !erroBusca && !encontrado && ambiguos.length === 0

  const precisaOcorrencia = condicao === 'avaria' || condicao === 'perda'

  const hoje = new Date() // a cada render: o balcão deixa a tela aberta de um dia para o outro
  const diasAtraso = encontrado ? Math.max(0, diasEntre(hoje, encontrado.previsao_devolucao)) : 0
  const diasDesdeSaida = encontrado ? diasEntre(hoje, encontrado.data_retirada) : 0

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

  function onConfirmar(data: FormValues) {
    if (!encontrado || !data.condicao) return
    const centavos = Number.parseInt((data.custoEstimado ?? '').replace(/\D/g, ''), 10)
    devolver.mutate(
      {
        emprestimo: encontrado,
        condicao: data.condicao,
        observacao: data.condicao === 'ok' ? undefined : data.descricaoOcorrencia?.trim().slice(0, 500),
        custoEstimado: centavos > 0 ? centavos / 100 : undefined, // NaN e R$ 0,00 viram "sem custo"
      },
      {
        onSuccess: (devolvido) => {
          playSomConfirmacao()
          toast.success(devolvido.resumo)
          buscarOutra()
        },
        onError: (e) =>
          avisarErro(mensagemDeErro(e, 'Não foi possível registrar a devolução.')),
      },
    )
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
                  (emprestimoNaoEncontrado || ambiguos.length > 0 || (erroBusca && termoAtual)) && 'animate-erro border-destructive',
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
              {ambiguos.length > 0 && (
                <p className="text-sm text-destructive">
                  Vários empréstimos abertos para "{ferramentaCodigo}" — digite ou bipe o código:{' '}
                  {ambiguos.map((e) => `${formatarPatrimonio(e.codigo_identificacao)} ${e.ferramenta_nome}`).join(' · ')}
                </p>
              )}
              {erroBusca && termoAtual && (
                <p className="text-sm text-destructive">Não foi possível consultar os empréstimos. Verifique a conexão com a API.</p>
              )}
            </div>
          ) : (
            <DetalhesEmprestimo
              emprestimo={emprestimo}
              saida={dataBR(encontrado?.data_retirada)}
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
        usuario={usuario?.nome ?? '—'}
        faltando={faltando}
        textoBotao={precisaOcorrencia ? 'Confirmar e abrir ocorrência' : 'Confirmar devolução'}
        comIcones
        enviando={devolver.isPending}
      />
    </form>
  )
}
