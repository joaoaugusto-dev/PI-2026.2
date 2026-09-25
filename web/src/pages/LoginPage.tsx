import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { CampoComErro } from '@/components/CampoComErro'
import { CampoSenha } from '@/components/CampoSenha'
import { TexturaFerramentas } from '@/components/TexturaFerramentas'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useAuth } from '@/lib/auth'

// Regra do time (issue #150): só dígitos, de 0001 a 9999 — `z.string().length(4)`
// aceitaria letras, por isso o regex em vez disso.
const loginSchema = z.object({
  matricula: z.string().regex(/^(?!0000)\d{4}$/, 'Informe a matrícula com 4 dígitos'),
  senha: z.string().min(1, 'Informe a senha'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [erro, setErro] = useState<string | null>(null)
  const [tentativaErro, setTentativaErro] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(dados: LoginForm) {
    setErro(null)
    try {
      await login(dados.matricula, dados.senha)
      const destino = (location.state as { from?: Location })?.from?.pathname ?? '/'
      navigate(destino, { replace: true })
    } catch (erroRequisicao: any) {
      const codigo = erroRequisicao?.response?.data?.error?.code
      setErro(
        codigo === 'USER_INACTIVE'
          ? 'Usuário inativo. Contate o administrador.'
          : 'Matrícula ou senha inválidos.',
      )
      setTentativaErro((tentativa) => tentativa + 1)
    }
  }

  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-secondary p-4">
      <TexturaFerramentas />
      <div className="w-full max-w-md">
        <Card className="w-full animate-entrada shadow-2xl ring-foreground/15">
          <div className="-mx-(--card-spacing) -mt-(--card-spacing) flex items-center justify-center rounded-t-xl bg-foreground px-8 py-7">
            <img src="/brand/soufer-negativo.png" alt="SOUFER Tools" className="h-12 w-auto" />
          </div>
          <CardHeader>
            <CardTitle className="text-titulo">Entrar</CardTitle>
            <CardDescription>Acesso ao controle de ferramentas</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="matricula">Matrícula</Label>
                <CampoComErro erro={!!errors.matricula || !!erro} tentativa={tentativaErro}>
                  <Input
                    id="matricula"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="username"
                    autoFocus
                    aria-invalid={!!errors.matricula || !!erro}
                    className="h-(--control-h)"
                    {...register('matricula')}
                  />
                </CampoComErro>
                {errors.matricula && <p className="text-rotulo text-destructive">{errors.matricula.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senha">Senha</Label>
                <CampoComErro erro={!!errors.senha || !!erro} tentativa={tentativaErro}>
                  <CampoSenha
                    id="senha"
                    autoComplete="current-password"
                    aria-invalid={!!errors.senha || !!erro}
                    {...register('senha')}
                  />
                </CampoComErro>
                {errors.senha && <p className="text-rotulo text-destructive">{errors.senha.message}</p>}
              </div>

              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" className="h-(--control-h)" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
              <p className="text-center text-rotulo text-muted-foreground">
                Ainda não tem acesso?{' '}
                <Link to="/cadastro" className="font-medium text-foreground underline underline-offset-2">
                  Solicitar cadastro
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
