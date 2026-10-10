import { useEffect, useRef, useState } from 'react'
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
import { diasEntre, prazoBR, quandoBR } from '@/lib/formatar'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { CampoIdentificacao, DicaEnter } from '@/components/fluxo/CampoIdentificacao'
import { DetalhesEmprestimo } from '@/components/fluxo/DetalhesEmprestimo'
import { FormularioOcorrencia } from '@/components/fluxo/FormularioOcorrencia'
import { OpcoesAmbiguas } from '@/components/fluxo/OpcoesAmbiguas'
import { TelaSucessoAnimada } from '@/components/TelaSucessoAnimada'
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
    ferramentaCodigo: z.string().trim().min(1, 'Bipe a etiqueta ou digite o código da ferramenta'),
    condicao: z.enum(['ok', 'avaria', 'perda']),
    descricaoOcorrencia: z.string().trim().optional(),
    custoEstimado: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.condicao !== 'ok' && !data.descricaoOcorrencia?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['descricaoOcorrencia'], message: 'Descreva o que aconteceu com a ferramenta' })
    }
  })

type FormValues = z.infer<typeof schema>

// quase toda devolução é "OK": já vem marcada, e avaria/perda continuam a um toque
const valoresIniciais = (codigo = ''): FormValues => ({
  ferramentaCodigo: codigo,
  condicao: 'ok',
  descricaoOcorrencia: '',
  custoEstimado: '',
})

export function DevolucaoPage() {
  // o dashboard abre a devolução já com o código da ferramenta atrasada
  const [params] = useSearchParams()

  const { register, handleSubmit, watch, setValue, setFocus, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: valoresIniciais(params.get('codigo') ?? ''),
  })

  const ferramentaCodigo = watch('ferramentaCodigo')
  const condicao = watch('condicao')
  const descricaoOcorrencia = watch('descricaoOcorrencia') ?? ''
  const custoEstimado = watch('custoEstimado') ?? ''

  // espera o usuário parar de digitar (ou o leitor terminar de bipar) antes de consultar a API
  const [termo, setTermo] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setTermo(ferramentaCodigo.trim()), 300)
    return () => clearTimeout(id)
  }, [ferramentaCodigo])

  const { usuario } = useAuth()
  const devolver = useDevolverEmprestimo()
  const [concluida, setConcluida] = useState<string | null>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
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
        fotoUrl: ferramentaDoEmprestimo?.foto_url,
        categoria: categorias?.find((c) => c.id === ferramentaDoEmprestimo?.grupo_id)?.nome ?? '—',
        retiradoPor: encontrado.colaborador_nome,
        matricula: encontrado.colaborador_matricula,
        setor: encontrado.setor_nome,
        // a retirada grava texto livre em `atividade_observacao`; `atividade_nome` é a do catálogo
        atividade: encontrado.atividade_nome ?? encontrado.atividade_observacao ?? undefined,
        registradoPor: encontrado.usuario_retirada_nome ?? '—',
      }
    : null
  const emprestimoNaoEncontrado = termo.length >= 1 && termoAtual && !buscando && !erroBusca && !encontrado && ambiguos.length === 0
  // achou o empréstimo: foco no botão de confirmar, aí bipa → Enter fecha a devolução
  useEffect(() => {
    if (encontrado) botaoRef.current?.focus()
    // só quando um empréstimo novo é achado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encontrado?.id])

  const precisaOcorrencia = condicao === 'avaria' || condicao === 'perda'
  const diasAtraso = encontrado ? Math.max(0, diasEntre(new Date(), encontrado.previsao_devolucao)) : 0

  const faltando = [
    !emprestimo ? 'ferramenta' : null,
    precisaOcorrencia && !descricaoOcorrencia.trim() ? 'o que aconteceu' : null,
  ].filter(Boolean) as string[]

  function buscarOutra() {
    reset(valoresIniciais())
    setTimeout(() => {
      setFocus('ferramentaCodigo')
      window.scrollTo({ top: 0 })
    })
  }

  function onConfirmar(data: FormValues) {
    if (!encontrado) return
    const centavos = Number.parseInt((data.custoEstimado ?? '').replace(/\D/g, ''), 10)
    const nome = encontrado.ferramenta_nome
    devolver.mutate(
      {
        emprestimo: encontrado,
        condicao: data.condicao,
        observacao: data.condicao === 'ok' ? undefined : data.descricaoOcorrencia?.trim().slice(0, 500),
        custoEstimado: centavos > 0 ? centavos / 100 : undefined, // NaN e R$ 0,00 viram "sem custo"
      },
      {
        onSuccess: () => {
          playSomConfirmacao()
          buscarOutra()
          if (data.condicao === 'ok') {
            setConcluida('Devolução registrada!')
            toast.success(`${nome} voltou para o estoque.`)
          } else {
            // FE-15: depois de confirmar, avisa que foi para Indisponíveis e que a ocorrência foi aberta
            setConcluida('Ocorrência aberta!')
            toast.success(`${nome} foi para Indisponíveis.`, {
              description: `Ocorrência de ${data.condicao} aberta em nome de ${encontrado.colaborador_nome}.`,
            })
          }
        },
        onError: (e) =>
          avisarErro(mensagemDeErro(e, 'Não foi possível registrar a devolução.')),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit(onConfirmar)} className="flex min-h-full flex-col">
      {concluida && <TelaSucessoAnimada contida mensagem={concluida} aoTerminarAnimacao={() => setConcluida(null)} />}
      <div className="animate-entrada flex-1 space-y-8 p-4 pb-28 sm:p-6">
        <SecaoFluxo titulo="1. Ferramenta que está voltando" descricao="Bipe a etiqueta, digite o código ou o nome de quem devolve">
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
                  (emprestimoNaoEncontrado || (erroBusca && termoAtual)) && 'animate-erro border-destructive',
                  !ferramentaCodigo && 'border-brand-red',
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault() // o leitor manda Enter: a busca já roda sozinha
                }}
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
                <OpcoesAmbiguas
                  titulo={`Encontrei ${ambiguos.length} empréstimos para "${ferramentaCodigo}". Toque no que está voltando:`}
                  opcoes={ambiguos.map((e) => ({
                    chave: e.id,
                    identificador: formatarPatrimonio(e.codigo_identificacao),
                    rotulo: e.ferramenta_nome,
                    extra: <span className="hidden text-sm text-muted-foreground sm:inline">{e.colaborador_nome}</span>,
                  }))}
                  aoEscolher={(codigo) => setValue('ferramentaCodigo', codigo, { shouldValidate: true })}
                />
              )}
              {erroBusca && termoAtual && (
                <p className="text-sm text-destructive">Não foi possível consultar os empréstimos. Verifique a conexão com a API.</p>
              )}
            </div>
          ) : (
            <DetalhesEmprestimo
              emprestimo={emprestimo}
              saida={quandoBR(encontrado?.data_retirada)}
              prazo={prazoBR(encontrado?.previsao_devolucao)}
              diasAtraso={diasAtraso}
              onBuscarOutra={buscarOutra}
            />
          )}
        </SecaoFluxo>

        {emprestimo && (
          <SecaoFluxo titulo="2. Como a ferramenta voltou?">
            <SeletorCondicao
              value={condicao}
              onChange={(valor) => setValue('condicao', valor, { shouldValidate: true })}
            />

            {precisaOcorrencia && (
              <FormularioOcorrencia
                tipo={condicao}
                ferramenta={emprestimo.ferramenta}
                retiradoPor={emprestimo.retiradoPor}
                matricula={emprestimo.matricula}
                descricaoProps={register('descricaoOcorrencia')}
                custoEstimado={custoEstimado}
                onCustoChange={(digitos) => setValue('custoEstimado', digitos ? formatarMoeda(digitos) : '')}
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
        botaoRef={botaoRef}
      />
    </form>
  )
}
