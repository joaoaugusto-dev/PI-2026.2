import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { CampoComErro } from '@/components/CampoComErro'
import { CampoPin } from '@/components/CampoPin'
import { TexturaFerramentas } from '@/components/TexturaFerramentas'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { avisarErro } from '@/lib/avisar-erro'
import { useAuth } from '@/lib/auth'

// Regra do time (issue #150): só dígitos, de 0001 a 9999 — `z.string().length(4)`
// aceitaria letras, por isso o regex em vez disso.
const loginSchema = z.object({
  matricula: z.string().regex(/^(?!0000)\d{4}$/, 'A matrícula tem 4 dígitos'),
  senha: z.string().length(6, 'A senha tem 6 dígitos'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [erro, setErro] = useState(false)
  const [tentativaErro, setTentativaErro] = useState(0)
  const senhaRef = useRef<HTMLInputElement>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { matricula: '', senha: '' } })

  async function onSubmit(dados: LoginForm) {
    setErro(false)
    try {
      await login(dados.matricula, dados.senha)
      const destino = (location.state as { from?: Location })?.from?.pathname ?? '/'
      navigate(destino, { replace: true })
    } catch (erroRequisicao: any) {
      const codigo = erroRequisicao?.response?.data?.error?.code
      let mensagem = 'Matrícula ou senha inválidas.'
      if (!erroRequisicao?.response) {
        // Sem resposta (API fora, CORS, rede) — não é credencial errada.
        mensagem = 'Não foi possível conectar ao servidor. Verifique se a API está no ar e tente novamente.'
      } else if (codigo === 'USER_INACTIVE') {
        mensagem = 'Usuário inativo. Contate o administrador.'
      } else if (codigo === 'TOO_MANY_REQUESTS') {
        mensagem = 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.'
      }
      setErro(true)
      setTentativaErro((tentativa) => tentativa + 1)
      avisarErro(mensagem)
    }
  }

  function onErroValidacao(errosForm: FieldErrors<LoginForm>) {
    const primeiraMensagem = Object.values(errosForm)[0]?.message
    if (primeiraMensagem) avisarErro(primeiraMensagem)
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
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit, onErroValidacao)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="matricula">Matrícula</Label>
                <CampoComErro erro={!!errors.matricula || erro} tentativa={tentativaErro}>
                  <Controller
                    name="matricula"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="matricula"
                        inputMode="numeric"
                        maxLength={4}
                        autoComplete="username"
                        autoFocus
                        aria-invalid={!!errors.matricula || erro}
                        className="h-(--control-h) text-center text-titulo md:text-titulo"
                        {...field}
                        onChange={(e) => {
                          const novo = e.target.value.replace(/\D/g, '').slice(0, 4)
                          field.onChange(novo)
                          if (novo.length === 4) senhaRef.current?.focus()
                        }}
                      />
                    )}
                  />
                </CampoComErro>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senha">Senha</Label>
                <CampoComErro erro={!!errors.senha || erro} tentativa={tentativaErro}>
                  <Controller
                    name="senha"
                    control={control}
                    render={({ field }) => (
                      <CampoPin
                        ref={senhaRef}
                        id="senha"
                        autoComplete="current-password"
                        erro={!!errors.senha || erro}
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
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
              <Button asChild type="button" variant="outline" className="h-(--control-h) text-corpo">
                <Link to="/cadastro">Criar Cadastro</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
