import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { CampoComErro } from '@/components/CampoComErro'
import { CampoPin } from '@/components/CampoPin'
import { TelaAguardandoAprovacao } from '@/components/TelaAguardandoAprovacao'
import { TexturaFerramentas } from '@/components/TexturaFerramentas'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { api } from '@/lib/api'
import { avisarErro } from '@/lib/avisar-erro'
import { useAuth } from '@/lib/auth'

const schema = z
  .object({
    senha: z.string().length(6, 'A senha tem 6 dígitos'),
    confirmarSenha: z.string().length(6, 'A senha tem 6 dígitos'),
  })
  .refine((d) => d.senha === d.confirmarSenha, { message: 'As senhas não conferem', path: ['confirmarSenha'] })

type Form = z.infer<typeof schema>

// Rota pública com sessão própria: não manda nem derruba o token do almoxarife logado (ver web/CLAUDE.md).
const SEM_SESSAO = { skipAuthToken: true, skipAuthHandler401: true } as const

const codigoDoErro = (e: unknown) => (e as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code

/**
 * Destino do link de convite (`/c/:token`): a pessoa vê o próprio nome, escolhe a senha de 6 dígitos
 * e, ao confirmar, a animação de sucesso toca, a sessão já abre e ela cai no sistema (sem tela de login).
 */
export function ConviteAcessoPage() {
  const { token = '' } = useParams()
  const navegar = useNavigate()
  const { entrarComSessao } = useAuth()
  const [concluido, setConcluido] = useState(false)
  const [tentativaErro, setTentativaErro] = useState(0)
  const confirmarRef = useRef<HTMLInputElement>(null)

  const convite = useQuery({
    queryKey: ['convite', token],
    queryFn: async () =>
      (await api.get<{ data: { nome: string; matricula: string } }>(`/auth/convites/${token}`, SEM_SESSAO)).data.data,
    retry: false,
  })

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { senha: '', confirmarSenha: '' } })

  async function onSubmit({ senha }: Form) {
    try {
      const { data } = await api.post(`/auth/convites/${token}/senha`, { senha }, SEM_SESSAO)
      entrarComSessao(data.data.token, data.data.usuario)
      setConcluido(true)
    } catch (e) {
      setTentativaErro((n) => n + 1)
      if (codigoDoErro(e) === 'CONVITE_INVALIDO') convite.refetch()
      else avisarErro('Não foi possível definir a senha. Tente novamente.')
    }
  }

  function onErroValidacao(erros: FieldErrors<Form>) {
    const mensagem = Object.values(erros)[0]?.message
    if (mensagem) avisarErro(mensagem)
  }

  if (concluido) {
    return <TelaAguardandoAprovacao aoTerminarAnimacao={() => navegar('/', { replace: true })} />
  }

  const invalido = convite.isError && codigoDoErro(convite.error) === 'CONVITE_INVALIDO'

  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-secondary p-4">
      <TexturaFerramentas />
      <div className="w-full max-w-md">
        <Card className="w-full animate-entrada shadow-2xl ring-foreground/15">
          <div className="-mx-(--card-spacing) -mt-(--card-spacing) flex items-center justify-center rounded-t-xl bg-foreground px-8 py-7">
            <img src="/brand/soufer-negativo.png" alt="SOUFER Tools" className="h-12 w-auto" />
          </div>

          {convite.isPending ? (
            <CardContent className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </CardContent>
          ) : convite.isError ? (
            <>
              <CardHeader>
                <CardTitle className="text-titulo">{invalido ? 'Link inválido ou expirado' : 'Não foi possível abrir o link'}</CardTitle>
                <CardDescription>
                  {invalido
                    ? 'Este link já foi usado ou venceu. Peça um novo ao administrador.'
                    : 'Verifique sua conexão e tente novamente.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {!invalido && (
                  <Button className="h-(--control-h)" onClick={() => convite.refetch()}>
                    Tentar de novo
                  </Button>
                )}
                <Button asChild variant="outline" className="h-(--control-h) text-corpo">
                  <Link to="/login">Ir para o login</Link>
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-titulo">Olá, {convite.data.nome.split(' ')[0]}</CardTitle>
                <CardDescription>Matrícula {convite.data.matricula} · escolha a senha que vai usar para entrar</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit, onErroValidacao)} noValidate>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="senha">Senha</Label>
                    <CampoComErro erro={!!errors.senha} tentativa={tentativaErro}>
                      <Controller
                        name="senha"
                        control={control}
                        render={({ field }) => (
                          <CampoPin
                            id="senha"
                            autoFocus
                            autoComplete="new-password"
                            erro={!!errors.senha}
                            value={field.value}
                            onChange={(valor) => {
                              field.onChange(valor)
                              if (valor.length === 6) confirmarRef.current?.focus()
                            }}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </CampoComErro>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                    <CampoComErro erro={!!errors.confirmarSenha} tentativa={tentativaErro}>
                      <Controller
                        name="confirmarSenha"
                        control={control}
                        render={({ field }) => (
                          <CampoPin
                            ref={confirmarRef}
                            id="confirmarSenha"
                            autoComplete="new-password"
                            erro={!!errors.confirmarSenha}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </CampoComErro>
                  </div>

                  <Button type="submit" className="h-(--control-h)" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    {isSubmitting ? 'Entrando...' : 'Definir senha e entrar'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
