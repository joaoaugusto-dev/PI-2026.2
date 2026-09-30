import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, LogOut, PackageSearch, Search, TriangleAlert } from 'lucide-react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { CampoComErro } from '@/components/CampoComErro'
import { EmptyState } from '@/components/EmptyState'
import { ChipFiltro } from '@/components/ferramentas/ChipFiltro'
import { IconeFerramenta } from '@/components/ferramentas/IconeFerramenta'
import { StatusBadge } from '@/components/StatusBadge'
import { TexturaFerramentas } from '@/components/TexturaFerramentas'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Skeleton } from '@/components/ui/Skeleton'
import { useConsultaFerramentas, useIniciarSessaoConsulta, type SessaoConsulta } from '@/hooks/useConsulta'
import { formatarPatrimonio, statusParaBadge, type StatusFerramenta } from '@/hooks/useFerramentas'
import { expiracaoDoToken } from '@/lib/auth'
import { avisarErro } from '@/lib/avisar-erro'
import { setAuthToken } from '@/lib/api'

const LIMITE_POR_PAGINA = 20

const STATUS_FILTROS: { label: string; valor: StatusFerramenta | 'todas' }[] = [
  { label: 'Todas', valor: 'todas' },
  { label: 'Disponível', valor: 'disponivel' },
  { label: 'Em uso', valor: 'em_uso' },
  { label: 'Indisponível', valor: 'indisponivel' },
]

// Regra do time (issue #150): só dígitos, de 0001 a 9999.
const matriculaSchema = z.object({
  matricula: z.string().regex(/^(?!0000)\d{4}$/, 'A matrícula tem 4 dígitos'),
})
type MatriculaForm = z.infer<typeof matriculaSchema>

/** Espera 300ms sem digitação antes de disparar a busca (mesmo padrão de FerramentasPage). */
function useBuscaComDebounce(valor: string) {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), 300)
    return () => clearTimeout(id)
  }, [valor])
  return debounced
}

/** Janela de números de página ao redor da atual, sem estourar [1, total]. */
function paginasVisiveis(atual: number, total: number, max = 5): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1)
  let inicio = Math.max(1, atual - Math.floor(max / 2))
  const fim = Math.min(total, inicio + max - 1)
  inicio = Math.max(1, fim - max + 1)
  return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i)
}

function formatarContagem(ms: number) {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000))
  const minutos = Math.floor(totalSegundos / 60)
  const segundos = totalSegundos % 60
  return `${minutos}:${String(segundos).padStart(2, '0')}`
}

/**
 * Isolado num componente próprio de propósito: o tick de 1s só re-renderiza
 * este `<span>`, não a página inteira (busca, lista de ferramentas, textura
 * de fundo) — antes o contador vivia em `ConsultaPage` e forçava um
 * re-render completo por segundo. `aoExpirar` vai por ref pra não reabrir o
 * `setInterval` a cada render do pai (só o `token`, estável durante toda a
 * sessão, precisa disparar a resubscrição).
 */
function ContadorSessao({ token, aoExpirar }: { token: string; aoExpirar: () => void }) {
  const [restanteMs, setRestanteMs] = useState<number | null>(null)
  const aoExpirarRef = useRef(aoExpirar)
  useEffect(() => {
    aoExpirarRef.current = aoExpirar
  })

  useEffect(() => {
    const expiraEm = expiracaoDoToken(token)
    if (!expiraEm) return

    const tick = () => {
      const restante = expiraEm - Date.now()
      setRestanteMs(restante)
      if (restante <= 0) aoExpirarRef.current()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [token])

  if (restanteMs === null) return null
  return (
    <span className="font-mono text-corpo tabular-nums text-muted-foreground">
      Sessão expira em {formatarContagem(restanteMs)}
    </span>
  )
}

/**
 * Quiosque de consulta pública (FE-17, Regra 8): só a matrícula abre uma
 * sessão de 15 min, sem senha e sem persistência — some do localStorage e do
 * token global ao sair, expirar ou trocar de aba. Fora do AppLayout: sem
 * sidebar, tela fixa de piso de fábrica.
 */
export function ConsultaPage() {
  const [sessao, setSessao] = useState<SessaoConsulta | null>(null)
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<StatusFerramenta | 'todas'>('disponivel')
  const [page, setPage] = useState(1)
  const buscaDebounced = useBuscaComDebounce(busca)

  const iniciarSessao = useIniciarSessaoConsulta()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MatriculaForm>({ resolver: zodResolver(matriculaSchema), defaultValues: { matricula: '' } })

  const queryClient = useQueryClient()

  function encerrarSessao() {
    setAuthToken(null)
    setSessao(null)
    setBusca('')
    setStatus('disponivel')
    setPage(1)
    reset()
    // A queryKey não depende da sessão — sem isso, o próximo operador podia
    // ver por um instante o resultado (ou o erro) da consulta anterior.
    queryClient.removeQueries({ queryKey: ['consulta'] })
  }

  function encerrarSessaoPorExpiracao() {
    encerrarSessao()
    avisarErro('Sessão de consulta expirada. Informe a matrícula novamente.')
  }
  const encerrarSessaoPorExpiracaoRef = useRef(encerrarSessaoPorExpiracao)
  useEffect(() => {
    encerrarSessaoPorExpiracaoRef.current = encerrarSessaoPorExpiracao
  })

  function encerrarSessaoPorInatividade() {
    encerrarSessao()
    avisarErro('Sessão encerrada por inatividade. Informe a matrícula novamente.')
  }
  const encerrarSessaoPorInatividadeRef = useRef(encerrarSessaoPorInatividade)
  useEffect(() => {
    encerrarSessaoPorInatividadeRef.current = encerrarSessaoPorInatividade
  })

  // Sem token persistido (Regra 8): sair da tela também derruba o token
  // global, pra ele não vazar pra outra rota aberta na mesma aba.
  useEffect(() => () => setAuthToken(null), [])

  // O token do quiosque tem janela fixa de 15 min (ver ContadorSessao) — isso
  // por si só não é "15 min de inatividade" como a issue pede. Esse timer
  // encerra a sessão mais cedo se o operador simplesmente parar de usar o
  // quiosque, sem precisar mexer no backend (reinicia a cada clique/toque ou
  // tecla — cobre também o leitor de código de barras, que digita e manda
  // Enter). Não é o mesmo que renovar o token além dos 15 min fixos.
  useEffect(() => {
    if (!sessao) return
    const LIMITE_INATIVIDADE_MS = 15 * 60 * 1000
    let timeoutId: ReturnType<typeof setTimeout>
    const reiniciarContagem = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(encerrarSessaoPorInatividadeRef.current, LIMITE_INATIVIDADE_MS)
    }
    const eventos = ['pointerdown', 'keydown'] as const
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarContagem))
    reiniciarContagem()
    return () => {
      clearTimeout(timeoutId)
      eventos.forEach((evento) => window.removeEventListener(evento, reiniciarContagem))
    }
  }, [sessao])

  async function onSubmit(dados: MatriculaForm) {
    try {
      const resultado = await iniciarSessao.mutateAsync(dados.matricula)
      setAuthToken(resultado.token)
      setSessao(resultado)
    } catch (erro: any) {
      const codigo = erro?.response?.data?.error?.code
      let mensagem = 'Não foi possível iniciar a consulta.'
      if (!erro?.response) {
        mensagem = 'Não foi possível conectar ao servidor. Verifique se a API está no ar e tente novamente.'
      } else if (codigo === 'COLABORADOR_NOT_FOUND') {
        mensagem = 'Matrícula não encontrada ou cadastro inativo.'
      } else if (codigo === 'TOO_MANY_REQUESTS') {
        mensagem = 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.'
      }
      avisarErro(mensagem)
    }
  }

  function onErroValidacao(errosForm: FieldErrors<MatriculaForm>) {
    const primeiraMensagem = Object.values(errosForm)[0]?.message
    if (primeiraMensagem) avisarErro(primeiraMensagem)
  }

  const { data, isLoading, isError, isPlaceholderData, error, refetch } = useConsultaFerramentas(
    {
      page,
      limit: LIMITE_POR_PAGINA,
      q: buscaDebounced || undefined,
      status: status === 'todas' ? undefined : status,
    },
    !!sessao,
  )
  const erroDeAutenticacao = (error as any)?.response?.status === 401

  // Só um 401 de verdade significa "token do quiosque caiu no meio da
  // sessão" (revogado/expirado no servidor antes do contador local
  // perceber). Qualquer outro erro (rede, 500, etc.) é passageiro — antes
  // este efeito derrubava a sessão pra QUALQUER isError, o que jogava o
  // operador de volta pra tela de matrícula numa simples oscilação de rede.
  useEffect(() => {
    if (erroDeAutenticacao && sessao) encerrarSessaoPorExpiracaoRef.current()
  }, [erroDeAutenticacao, sessao])

  // Troca de página sobe a tela de volta ao topo (kiosk sem scroll "invisível" pro operador).
  useEffect(() => {
    if (sessao) window.scrollTo({ top: 0, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const total = data?.meta.total ?? 0
  const totalPaginas = data?.meta.totalPages ?? 1

  // Quantos itens a página alvo realmente terá (a última costuma ter menos
  // que LIMITE_POR_PAGINA). Enquanto isPlaceholderData mantém a página
  // anterior na tela pra trocar sem flicker, cortamos pro tamanho esperado —
  // sem isso, ir pra última página mostra a página cheia por um instante e
  // depois "engole" os itens que sobram assim que o dado real chega.
  const itensNaPaginaAlvo =
    page < totalPaginas ? LIMITE_POR_PAGINA : Math.max(0, total - (totalPaginas - 1) * LIMITE_POR_PAGINA)
  const ferramentasBrutas = data?.data ?? []
  const ferramentas = isPlaceholderData ? ferramentasBrutas.slice(0, itensNaPaginaAlvo) : ferramentasBrutas
  const esqueletosExtras = isPlaceholderData ? Math.max(0, itensNaPaginaAlvo - ferramentas.length) : 0

  if (!sessao) {
    return (
      <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-secondary p-4">
        <TexturaFerramentas />
        <div className="w-full max-w-md">
          <Card className="w-full animate-entrada shadow-2xl ring-foreground/15">
            <div className="-mx-(--card-spacing) -mt-(--card-spacing) flex items-center justify-center rounded-t-xl bg-foreground px-8 py-7">
              <img src="/brand/soufer-industrial.png" alt="SOUFER Tools" className="h-12 w-auto" />
            </div>
            <CardHeader>
              <CardTitle className="text-titulo">Consulta de ferramentas</CardTitle>
              <CardDescription>Informe sua matrícula para ver o que está disponível ou emprestado</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit, onErroValidacao)} noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="matricula">Matrícula</Label>
                  <CampoComErro erro={!!errors.matricula} tentativa={iniciarSessao.failureCount}>
                    <Controller
                      name="matricula"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="matricula"
                          inputMode="numeric"
                          maxLength={4}
                          autoFocus
                          aria-invalid={!!errors.matricula}
                          className="h-(--control-h) text-center text-titulo md:text-titulo"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        />
                      )}
                    />
                  </CampoComErro>
                </div>

                <Button type="submit" className="h-(--control-h)" disabled={iniciarSessao.isPending}>
                  {iniciarSessao.isPending && <Loader2 className="size-4 animate-spin" />}
                  {iniciarSessao.isPending ? 'Consultando...' : 'Consultar'}
                </Button>
                <Button asChild type="button" variant="ghost" className="h-(--control-h) text-corpo">
                  <Link to="/login">Acesso da manutenção</Link>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-secondary">
      <TexturaFerramentas />
      <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/brand/soufer-assinatura.png" alt="SOUFER Tools" className="h-8 w-auto" />
            <div className="flex flex-col">
              <span className="text-corpo font-semibold">{sessao.colaborador.nome}</span>
              <span className="font-mono text-rotulo text-muted-foreground">
                Matrícula {sessao.colaborador.matricula}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ContadorSessao token={sessao.token} aoExpirar={encerrarSessaoPorExpiracao} />
            <Button type="button" variant="outline" onClick={encerrarSessao} className="gap-1.5">
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar por nome, marca ou modelo"
          className="h-10 bg-card pl-9 text-corpo"
        />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {STATUS_FILTROS.map((item) => (
          <ChipFiltro
            key={item.valor}
            label={item.label}
            ativo={status === item.valor}
            onClick={() => {
              setStatus(item.valor)
              setPage(1)
            }}
          />
        ))}
      </div>

      <div key={page} className="flex animate-entrada flex-col gap-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-xs">
              <CardContent className="flex items-center gap-4">
                <Skeleton className="size-12 shrink-0 rounded" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}

        {!isLoading && isError && !erroDeAutenticacao && (
          <div className="flex flex-col items-center gap-3">
            <EmptyState
              icone={TriangleAlert}
              titulo="Não foi possível carregar as ferramentas"
              descricao="Verifique sua conexão e tente novamente."
            />
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !isError && ferramentas.length === 0 && (
          <EmptyState
            icone={PackageSearch}
            titulo="Nenhuma ferramenta encontrada"
            descricao="Ajuste a busca ou o filtro de status."
          />
        )}

        {!isLoading &&
          !isError &&
          ferramentas.map((ferramenta) => (
            <Card key={ferramenta.id} className="shadow-xs">
              <CardContent className="flex items-center gap-4">
                <IconeFerramenta nome={ferramenta.nome} className="size-12 shrink-0 bg-muted text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-corpo font-semibold">{ferramenta.nome}</p>
                  <p className="font-mono text-rotulo text-muted-foreground">
                    {formatarPatrimonio(ferramenta.codigo_identificacao)}
                    {ferramenta.localizacao ? ` · ${ferramenta.localizacao}` : ''}
                  </p>
                </div>
                <StatusBadge status={statusParaBadge(ferramenta.status)} className="shrink-0" />
              </CardContent>
            </Card>
          ))}

        {!isLoading &&
          !isError &&
          Array.from({ length: esqueletosExtras }).map((_, i) => (
            <Card key={`esqueleto-extra-${i}`} className="shadow-xs">
              <CardContent className="flex items-center gap-4">
                <Skeleton className="size-12 shrink-0 rounded" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {!isLoading && !isError && ferramentas.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {paginasVisiveis(page, totalPaginas).map((numero) => (
              <Button
                key={numero}
                type="button"
                variant={numero === page ? 'default' : 'outline'}
                size="icon-lg"
                onClick={() => setPage(numero)}
                className="font-mono tabular-nums"
              >
                {numero}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              disabled={page >= totalPaginas || isPlaceholderData}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <span className="text-rotulo text-muted-foreground">{total} ferramentas</span>
        </div>
      )}
      </div>
    </div>
  )
}
