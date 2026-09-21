import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Database,
  Globe,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
  XCircle,
  Terminal,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { BannerStatus } from '@/components/status/BannerStatus'
import { CardServico, LinhaDetalhe } from '@/components/status/CardServico'
import { LinkExterno } from '@/components/status/LinkExterno'
import { toast } from 'sonner'
import { playSomConfirmacao } from '@/lib/som-confirmacao'

export interface HealthResponse {
  data: {
    status: 'ok' | 'degraded' | string
    timestamp: string
    uptime: number
    environment: string
    database: {
      status: 'connected' | 'disconnected' | string
      name: string | null
      serverTime: string | null
      error: string | null
    }
  }
  meta: null
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`)
  parts.push(`${remainingSeconds}s`)

  return parts.join(' ')
}

export function StatusPage() {
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [latency, setLatency] = useState<number | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)

  const baseURL = api.defaults.baseURL || 'http://localhost:3000/v1'
  const docsURL = baseURL.replace(/\/v1\/?$/, '/docs')
  const healthEndpointURL = `${baseURL.replace(/\/$/, '')}/health`

  const {
    data: healthData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const startTime = performance.now()
      try {
        const response = await api.get<HealthResponse>('/health')
        const endTime = performance.now()
        setLatency(Math.round(endTime - startTime))
        setLastCheckTime(new Date())
        return response.data
      } catch (err: any) {
        const endTime = performance.now()
        setLatency(Math.round(endTime - startTime))
        setLastCheckTime(new Date())
        throw err
      }
    },
    refetchInterval: autoRefresh ? 10000 : false,
    retry: 1,
  })

  useEffect(() => {
    if (healthData) {
      setLastCheckTime(new Date())
    }
  }, [healthData])

  const copyJson = () => {
    if (healthData) {
      navigator.clipboard.writeText(JSON.stringify(healthData, null, 2))
      setCopied(true)
      toast.success('Resposta JSON copiada para a área de transferência!')
      playSomConfirmacao()
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Identificação do estado geral
  const isHealthy = healthData?.data?.status === 'ok' && healthData?.data?.database?.status === 'connected'
  const isDegraded = healthData?.data?.status === 'degraded' || (healthData && healthData?.data?.database?.status !== 'connected')
  const isOffline = isError || (!isLoading && !healthData)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-6 text-primary animate-pulse" />
            <h1 className="text-titulo">Status dos Serviços</h1>
          </div>
          <p className="text-corpo text-muted-foreground mt-1">
            Monitoramento em tempo real da API Node.js, banco de dados PostgreSQL e latência de rede.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 text-rotulo"
          >
            <span
              className={`size-2 rounded-full transicao-status ${
                autoRefresh ? 'bg-status-disponivel animate-ping' : 'bg-muted-foreground'
              }`}
            />
            {autoRefresh ? 'Auto-refresh: 10s' : 'Auto-refresh: Pausado'}
          </Button>

          <Button
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-rotulo text-primary-foreground"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Verificando...' : 'Verificar Agora'}
          </Button>
        </div>
      </div>

      {/* Main Banner Alert Card */}
      {isLoading && !healthData ? (
        <Card className="border-muted bg-muted/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isHealthy ? (
        <BannerStatus
          tom="disponivel"
          icone={CheckCircle2}
          titulo="Todos os sistemas operacionais"
          selo="100% Operacional"
        >
          A API REST e o banco de dados PostgreSQL estão respondendo normalmente com integridade transacional.
        </BannerStatus>
      ) : isDegraded ? (
        <BannerStatus
          tom="atraso"
          icone={AlertTriangle}
          titulo="Serviço em estado degradado"
          selo="Degradado (Sem Banco)"
        >
          A API está online, mas há instabilidade ou desconexão com o banco de dados PostgreSQL.
        </BannerStatus>
      ) : (
        <BannerStatus tom="indisponivel" icone={XCircle} titulo="API Inacessível ou Offline" selo="Offline">
          Não foi possível estabelecer conexão com o endpoint da API em{' '}
          <code className="text-rotulo bg-muted px-1 py-0.5 rounded">{healthEndpointURL}</code>.
        </BannerStatus>
      )}

      {/* Grid de Detalhes dos Componentes */}
      <div className="lista-stagger grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardServico
          titulo="API REST (Node / Express)"
          icone={Server}
          carregando={isLoading && !healthData}
          detalhes={
            <>
              <LinhaDetalhe rotulo="Ambiente:">
                <span className="font-medium text-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                  {healthData?.data?.environment || 'Desconhecido'}
                </span>
              </LinhaDetalhe>
              <LinhaDetalhe rotulo="Versão:">
                <span className="font-medium text-foreground">v1 (Node.js 20)</span>
              </LinhaDetalhe>
            </>
          }
        >
          <div className="flex items-center gap-2">
            <span
              className={`transicao-status size-2.5 rounded-full ${
                isOffline ? 'bg-status-indisponivel' : 'bg-status-disponivel'
              }`}
            />
            <span className="text-secao">{isOffline ? 'Inacessível' : 'Online'}</span>
          </div>
        </CardServico>

        <CardServico
          titulo="PostgreSQL Relacional"
          icone={Database}
          carregando={isLoading && !healthData}
          detalhes={
            <>
              <LinhaDetalhe rotulo="Banco de dados:">
                <span className="font-mono text-foreground font-medium">
                  {healthData?.data?.database?.name || 'N/A'}
                </span>
              </LinhaDetalhe>
              <LinhaDetalhe rotulo="Pool Driver:">
                <span className="font-medium text-foreground">pg (node-postgres)</span>
              </LinhaDetalhe>
            </>
          }
        >
          <div className="flex items-center gap-2">
            <span
              className={`transicao-status size-2.5 rounded-full ${
                healthData?.data?.database?.status === 'connected' ? 'bg-status-disponivel' : 'bg-status-atraso'
              }`}
            />
            <span className="text-secao capitalize">
              {healthData?.data?.database?.status === 'connected' ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </CardServico>

        <CardServico
          titulo="Tempo de Atividade (Uptime)"
          icone={Clock}
          carregando={isLoading && !healthData}
          detalhes={
            <>
              <LinhaDetalhe rotulo="Início contínuo:">
                <span className="font-medium text-foreground">Processo Ativo</span>
              </LinhaDetalhe>
              <LinhaDetalhe rotulo="Graceful Shutdown:">
                <span className="font-medium text-status-disponivel">Ativo</span>
              </LinhaDetalhe>
            </>
          }
        >
          <div className="text-secao font-mono">
            {healthData?.data?.uptime !== undefined ? formatUptime(healthData.data.uptime) : 'N/A'}
          </div>
        </CardServico>

        <CardServico
          titulo="Latência de Rede (Ping)"
          icone={Wifi}
          carregando={isLoading && !healthData}
          detalhes={
            <>
              <LinhaDetalhe rotulo="Última checagem:">
                <span className="font-medium text-foreground">
                  {lastCheckTime ? lastCheckTime.toLocaleTimeString() : 'N/A'}
                </span>
              </LinhaDetalhe>
              <LinhaDetalhe rotulo="Protocolo:">
                <span className="font-medium text-foreground uppercase">
                  {window.location.protocol.replace(':', '')}
                </span>
              </LinhaDetalhe>
            </>
          }
        >
          <div className="flex items-center gap-2">
            <span className="text-secao font-mono">{latency !== null ? `${latency} ms` : 'N/A'}</span>
            {latency !== null && (
              <Badge
                variant="outline"
                className={`text-rotulo px-1.5 py-0 ${
                  latency < 80
                    ? 'text-status-disponivel border-status-disponivel/30'
                    : latency < 200
                    ? 'text-status-atraso border-status-atraso/30'
                    : 'text-status-indisponivel border-status-indisponivel/30'
                }`}
              >
                {latency < 80 ? 'Ótima' : latency < 200 ? 'Normal' : 'Lenta'}
              </Badge>
            )}
          </div>
        </CardServico>
      </div>

      {/* Seção de Diagnóstico Detalhado */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Painel de Metadados e Ações */}
        <Card className="md:col-span-1 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <CardTitle className="text-secao">Links e Acesso Rápido</CardTitle>
            </div>
            <CardDescription className="text-rotulo">
              Acesse a documentação interativa ou teste os endpoints diretamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-rotulo text-muted-foreground font-medium uppercase tracking-wide">URL Base da API:</span>
              <div className="bg-muted/60 p-2 rounded text-rotulo font-mono break-all border border-border/60">
                {baseURL}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <LinkExterno href={docsURL} icone={Globe}>
                Swagger UI (/docs)
              </LinkExterno>
              <LinkExterno href={healthEndpointURL} icone={Terminal}>
                Healthcheck Direto (/v1/health)
              </LinkExterno>
            </div>
          </CardContent>
        </Card>

        {/* Visualizador da Resposta JSON */}
        <Card className="md:col-span-2 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-secao flex items-center gap-2">
                <Terminal className="size-4 text-primary" />
                Resposta JSON da API (/v1/health)
              </CardTitle>
              <CardDescription className="text-rotulo">
                Payload bruto de telemetria retornado pelo servidor.
              </CardDescription>
            </div>
            {healthData && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyJson}
                className="h-8 gap-1.5 text-rotulo"
              >
                {copied ? <Check className="size-3 text-status-disponivel" /> : <Copy className="size-3" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading && !healthData ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : healthData ? (
              <pre className="bg-muted/70 dark:bg-zinc-950 text-foreground p-4 rounded-lg font-mono text-rotulo overflow-x-auto border border-border/60 max-h-[260px] leading-relaxed">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            ) : (
              <div className="bg-status-indisponivel/10 text-status-indisponivel p-4 rounded-lg font-mono text-rotulo border border-status-indisponivel/20">
                {error instanceof Error ? error.message : 'Falha ao obter resposta do servidor.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
