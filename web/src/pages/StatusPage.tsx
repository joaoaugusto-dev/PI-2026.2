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
  ExternalLink,
  Globe,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
  XCircle,
  Terminal,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

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
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Identificação do estado geral
  const isHealthy = healthData?.data?.status === 'ok' && healthData?.data?.database?.status === 'connected'
  const isDegraded = healthData?.data?.status === 'degraded' || (healthData && healthData?.data?.database?.status !== 'connected')
  const isOffline = isError || (!isLoading && !healthData)

  return (
    <div className="animate-entrada flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
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
        <Card className="border-status-disponivel/30 bg-status-disponivel/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-status-disponivel/15 p-2.5 text-status-disponivel">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h2 className="text-secao text-status-disponivel">
                    Todos os sistemas operacionais
                  </h2>
                  <p className="text-corpo text-muted-foreground">
                    A API REST e o banco de dados PostgreSQL estão respondendo normalmente com integridade transacional.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-status-disponivel/10 text-status-disponivel border-status-disponivel/40 text-rotulo px-3 py-1">
                100% Operacional
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : isDegraded ? (
        <Card className="border-status-atraso/40 bg-status-atraso/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-status-atraso/15 p-2.5 text-status-atraso">
                  <AlertTriangle className="size-7" />
                </div>
                <div>
                  <h2 className="text-secao text-status-atraso">
                    Serviço em estado degradado
                  </h2>
                  <p className="text-corpo text-muted-foreground">
                    A API está online, mas há instabilidade ou desconexão com o banco de dados PostgreSQL.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-status-atraso/10 text-status-atraso border-status-atraso/40 text-rotulo px-3 py-1">
                Degradado (Sem Banco)
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-status-indisponivel/40 bg-status-indisponivel/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-status-indisponivel/15 p-2.5 text-status-indisponivel">
                  <XCircle className="size-7" />
                </div>
                <div>
                  <h2 className="text-secao text-status-indisponivel">
                    API Inacessível ou Offline
                  </h2>
                  <p className="text-corpo text-muted-foreground">
                    Não foi possível estabelecer conexão com o endpoint da API em <code className="text-rotulo bg-muted px-1 py-0.5 rounded">{healthEndpointURL}</code>.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-status-indisponivel/10 text-status-indisponivel border-status-indisponivel/40 text-rotulo px-3 py-1">
                Offline
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Detalhes dos Componentes */}
      <div className="lista-stagger grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: API REST */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-rotulo font-medium tracking-wide uppercase">API REST (Node / Express)</CardTitle>
            <Server className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`transicao-status size-2.5 rounded-full ${
                    isOffline ? 'bg-status-indisponivel' : 'bg-status-disponivel'
                  }`}
                />
                <span className="text-secao">
                  {isOffline ? 'Inacessível' : 'Online'}
                </span>
              </div>
            )}
            <div className="text-rotulo text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
              <div className="flex justify-between">
                <span>Ambiente:</span>
                <span className="font-medium text-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                  {healthData?.data?.environment || 'Desconhecido'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Versão:</span>
                <span className="font-medium text-foreground">v1 (Node.js 20)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Banco de Dados PostgreSQL */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-rotulo font-medium tracking-wide uppercase">PostgreSQL Relacional</CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`transicao-status size-2.5 rounded-full ${
                    healthData?.data?.database?.status === 'connected'
                      ? 'bg-status-disponivel'
                      : 'bg-status-atraso'
                  }`}
                />
                <span className="text-secao capitalize">
                  {healthData?.data?.database?.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            )}
            <div className="text-rotulo text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
              <div className="flex justify-between">
                <span>Banco de dados:</span>
                <span className="font-mono text-foreground font-medium">
                  {healthData?.data?.database?.name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pool Driver:</span>
                <span className="font-medium text-foreground">pg (node-postgres)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Uptime do Servidor */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-rotulo font-medium tracking-wide uppercase">Tempo de Atividade (Uptime)</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-secao font-mono">
                {healthData?.data?.uptime !== undefined
                  ? formatUptime(healthData.data.uptime)
                  : 'N/A'}
              </div>
            )}
            <div className="text-rotulo text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
              <div className="flex justify-between">
                <span>Início contínuo:</span>
                <span className="font-medium text-foreground">Processo Ativo</span>
              </div>
              <div className="flex justify-between">
                <span>Graceful Shutdown:</span>
                <span className="font-medium text-status-disponivel">Ativo</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Latência & Rede */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-rotulo font-medium tracking-wide uppercase">Latência de Rede (Ping)</CardTitle>
            <Wifi className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-secao font-mono">
                  {latency !== null ? `${latency} ms` : 'N/A'}
                </span>
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
            )}
            <div className="text-rotulo text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
              <div className="flex justify-between">
                <span>Última checagem:</span>
                <span className="font-medium text-foreground">
                  {lastCheckTime ? lastCheckTime.toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Protocolo:</span>
                <span className="font-medium text-foreground uppercase">
                  {window.location.protocol.replace(':', '')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <Button variant="outline" size="sm" asChild className="w-full justify-between text-rotulo">
                <a href={docsURL} target="_blank" rel="noopener noreferrer">
                  <span className="flex items-center gap-2">
                    <Globe className="size-3.5" />
                    Swagger UI (/docs)
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </a>
              </Button>

              <Button variant="outline" size="sm" asChild className="w-full justify-between text-rotulo">
                <a href={healthEndpointURL} target="_blank" rel="noopener noreferrer">
                  <span className="flex items-center gap-2">
                    <Terminal className="size-3.5" />
                    Healthcheck Direto (/v1/health)
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </a>
              </Button>
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
