import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { api } from '@/lib/api'

interface UsuarioPendente {
  id: number
  nome: string
  matricula: string
  papel: string
  ativo: boolean
  created_at: string
}

interface ListaPendentesResponse {
  data: UsuarioPendente[]
  meta: { page: number; limit: number; total: number }
}

/**
 * Aprovação de auto-cadastro (issue #149): lista quem se cadastrou pela
 * matrícula e ainda está `ativo = false`, e aprova via
 * `PATCH /v1/usuarios/:id/ativar`. Só o papel `admin` acessa (garantido pela
 * API com 403; a rota também é protegida no router pelo mesmo papel).
 */
export function AprovacoesPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['usuarios-pendentes'],
    queryFn: async () => {
      const { data } = await api.get<ListaPendentesResponse>('/usuarios', { params: { ativo: false } })
      return data
    },
  })

  const aprovar = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/usuarios/${id}/ativar`)
    },
    onSuccess: (_dados, id) => {
      const pendente = data?.data.find((usuario) => usuario.id === id)
      toast.success(pendente ? `Cadastro de ${pendente.nome} aprovado.` : 'Cadastro aprovado.')
      queryClient.invalidateQueries({ queryKey: ['usuarios-pendentes'] })
    },
    onError: (erro: any) => {
      const codigo = erro?.response?.data?.error?.code
      toast.error(
        codigo === 'USUARIO_JA_ATIVO' ? 'Este cadastro já foi aprovado.' : 'Não foi possível aprovar o cadastro.',
      )
    },
  })

  const pendentes = data?.data ?? []

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div>
        <div className="flex items-center gap-2">
          <UserCheck className="size-6 text-primary" />
          <h1 className="text-titulo">Aprovação de cadastros</h1>
        </div>
        <p className="text-corpo text-muted-foreground mt-1">
          Pessoas da manutenção que se cadastraram pela matrícula e aguardam liberação de acesso.
        </p>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-secao">Pendentes de aprovação</CardTitle>
          <CardDescription className="text-rotulo">
            {isLoading ? 'Carregando...' : `${pendentes.length} cadastro(s) aguardando aprovação`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div className="bg-status-indisponivel/10 text-status-indisponivel p-4 rounded-lg text-rotulo border border-status-indisponivel/20">
              Não foi possível carregar os cadastros pendentes.
            </div>
          ) : pendentes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <CheckCircle2 className="size-8 text-status-disponivel" />
              <p className="text-corpo">Nenhum cadastro pendente no momento.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-mono">{usuario.matricula}</TableCell>
                    <TableCell>{usuario.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(usuario.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => aprovar.mutate(usuario.id)}
                        disabled={aprovar.isPending && aprovar.variables === usuario.id}
                        className="gap-1.5 text-rotulo text-primary-foreground"
                      >
                        {aprovar.isPending && aprovar.variables === usuario.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        Aprovar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pendentes.length > 0 && (
        <div className="flex items-center gap-2 text-rotulo text-muted-foreground">
          <Badge variant="outline">admin</Badge>
          Só o papel admin vê e aprova esta lista.
        </div>
      )}
    </div>
  )
}
