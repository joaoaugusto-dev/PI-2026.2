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
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-6 text-primary animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Status dos Serviços</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento em tempo real da API Node.js, banco de dados PostgreSQL e latência de rede.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className={`size-2 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-muted-foreground'
              }`}
            />
            {autoRefresh ? 'Auto-refresh: 10s' : 'Auto-refresh: Pausado'}
          </Button>

          <Button
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-xs"
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
        <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/20 p-2.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
                    Todos os sistemas operacionais
                  </h2>
                  <p className="text-sm text-emerald-700/90 dark:text-emerald-400/90">
                    A API REST e o banco de dados PostgreSQL estão respondendo normalmente com integridade transacional.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-medium">
                100% Operacional
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : isDegraded ? (
        <Card className="border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-500/20 p-2.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-7" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
                    Serviço em estado degradado
                  </h2>
                  <p className="text-sm text-amber-700/90 dark:text-amber-400/90">
                    A API está online, mas há instabilidade ou desconexão com o banco de dados PostgreSQL.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs px-3 py-1 font-medium">
                Degradado (Sem Banco)
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/40 bg-destructive/5 dark:bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-destructive/20 p-2.5 text-destructive">
                  <XCircle className="size-7" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-destructive">
                    API Inacessível ou Offline
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Não foi possível estabelecer conexão com o endpoint da API em <code className="text-xs bg-muted px-1 py-0.5 rounded">{healthEndpointURL}</code>.
                  </p>
                </div>
              </div>
              <Badge variant="destructive" className="text-xs px-3 py-1 font-medium">
                Offline
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Detalhes dos Componentes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: API REST */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">API REST (Node / Express)</CardTitle>
            <Server className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    isOffline ? 'bg-destructive' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-lg font-bold">
                  {isOffline ? 'Inacessível' : 'Online'}
                </span>
              </div>
            )}
            <div className="text-xs text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
              <div className="flex justify-between">
                <span>Ambiente:</span>
                <span className="font-medium text-foreground uppercase text-[10px] bg-muted px-1.5 py-0.5 rounded">
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
            <CardTitle className="text-sm font-medium">PostgreSQL Relacional</CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    healthData?.data?.database?.status === 'connected'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="text-lg font-bold capitalize">
                  {healthData?.data?.database?.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            )}
            <div className="text-xs text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
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
            <CardTitle className="text-sm font-medium">Tempo de Atividade (Uptime)</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-lg font-bold font-mono">
                {healthData?.data?.uptime !== undefined
                  ? formatUptime(healthData.data.uptime)
                  : 'N/A'}
              </div>
            )}
            <div className="text-xs text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
              <div className="flex justify-between">
                <span>Início contínuo:</span>
                <span className="font-medium text-foreground">Processo Ativo</span>
              </div>
              <div className="flex justify-between">
                <span>Graceful Shutdown:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Ativo</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Latência & Rede */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Latência de Rede (Ping)</CardTitle>
            <Wifi className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && !healthData ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono">
                  {latency !== null ? `${latency} ms` : 'N/A'}
                </span>
                {latency !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium ${
                      latency < 80
                        ? 'text-emerald-600 border-emerald-400/30'
                        : latency < 200
                        ? 'text-amber-600 border-amber-400/30'
                        : 'text-destructive border-destructive/30'
                    }`}
                  >
                    {latency < 80 ? 'Ótima' : latency < 200 ? 'Normal' : 'Lenta'}
                  </Badge>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground flex flex-col gap-1 pt-1 border-t border-border/50">
              <div className="flex justify-between">
                <span>Última checagem:</span>
                <span className="font-medium text-foreground">
                  {lastCheckTime ? lastCheckTime.toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Protocolo:</span>
                <span className="font-medium text-foreground uppercase text-[10px]">
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
              <CardTitle className="text-base">Links e Acesso Rápido</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Acesse a documentação interativa ou teste os endpoints diretamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">URL Base da API:</span>
              <div className="bg-muted/60 p-2 rounded text-xs font-mono break-all border border-border/60">
                {baseURL}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button variant="outline" size="sm" asChild className="w-full justify-between text-xs">
                <a href={docsURL} target="_blank" rel="noopener noreferrer">
                  <span className="flex items-center gap-2">
                    <Globe className="size-3.5" />
                    Swagger UI (/docs)
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </a>
              </Button>

              <Button variant="outline" size="sm" asChild className="w-full justify-between text-xs">
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
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="size-4 text-primary" />
                Resposta JSON da API (/v1/health)
              </CardTitle>
              <CardDescription className="text-xs">
                Payload bruto de telemetria retornado pelo servidor.
              </CardDescription>
            </div>
            {healthData && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyJson}
                className="h-8 gap-1.5 text-xs"
              >
                {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
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
              <pre className="bg-muted/70 dark:bg-zinc-950 text-foreground p-4 rounded-lg font-mono text-xs overflow-x-auto border border-border/60 max-h-[260px] leading-relaxed">
                {JSON.stringify(healthData, null, 2)}
              </pre>
            ) : (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg font-mono text-xs border border-destructive/20">
                {error instanceof Error ? error.message : 'Falha ao obter resposta do servidor.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
