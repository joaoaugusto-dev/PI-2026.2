import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { CampoComErro } from '@/components/CampoComErro'
import { CampoSenha } from '@/components/CampoSenha'
import { TexturaFerramentas } from '@/components/TexturaFerramentas'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { api } from '@/lib/api'

// Mesma regra da matrícula do login (issue #150): só dígitos, de 0001 a 9999.
const cadastroSchema = z
  .object({
    matricula: z.string().regex(/^(?!0000)\d{4}$/, 'Informe a matrícula com 4 dígitos'),
    senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmarSenha: z.string().min(1, 'Confirme a senha'),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  })

type CadastroForm = z.infer<typeof cadastroSchema>

// Mensagens por `error.code` do POST /v1/auth/registro (issue #149).
const MENSAGENS_ERRO: Record<string, string> = {
  COLABORADOR_NOT_FOUND: 'Matrícula não encontrada ou colaborador inativo. Confira o número ou procure a manutenção.',
  MATRICULA_JA_CADASTRADA: 'Esta matrícula já possui um cadastro de acesso. Tente entrar ou fale com um administrador.',
  TOO_MANY_REQUESTS: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.',
}

export function CadastroPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [tentativaErro, setTentativaErro] = useState(0)
  const [enviado, setEnviado] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroForm>({ resolver: zodResolver(cadastroSchema) })

  async function onSubmit(dados: CadastroForm) {
    setErro(null)
    try {
      await api.post('/auth/registro', { matricula: dados.matricula, senha: dados.senha })
      setEnviado(true)
    } catch (erroRequisicao: any) {
      const codigo = erroRequisicao?.response?.data?.error?.code
      setErro(MENSAGENS_ERRO[codigo] ?? 'Não foi possível concluir o cadastro. Tente novamente.')
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

          {enviado ? (
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle2 className="size-12 text-status-disponivel" />
              <div className="space-y-1.5">
                <CardTitle className="text-titulo">Cadastro enviado</CardTitle>
                <CardDescription>
                  Aguarde a aprovação de um administrador para poder entrar com sua matrícula e senha.
                </CardDescription>
              </div>
              <Button asChild className="h-(--control-h) w-full">
                <Link to="/login">Voltar para o login</Link>
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-titulo">Solicitar cadastro</CardTitle>
                <CardDescription>
                  Informe sua matrícula de colaborador e crie uma senha. O nome vem do seu cadastro.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="matricula">Matrícula</Label>
                    <CampoComErro erro={!!errors.matricula} tentativa={tentativaErro}>
                      <Input
                        id="matricula"
                        inputMode="numeric"
                        maxLength={4}
                        autoComplete="username"
                        autoFocus
                        aria-invalid={!!errors.matricula}
                        className="h-(--control-h)"
                        {...register('matricula')}
                      />
                    </CampoComErro>
                    {errors.matricula && <p className="text-rotulo text-destructive">{errors.matricula.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="senha">Senha</Label>
                    <CampoComErro erro={!!errors.senha} tentativa={tentativaErro}>
                      <CampoSenha
                        id="senha"
                        autoComplete="new-password"
                        aria-invalid={!!errors.senha}
                        {...register('senha')}
                      />
                    </CampoComErro>
                    {errors.senha && <p className="text-rotulo text-destructive">{errors.senha.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                    <CampoComErro erro={!!errors.confirmarSenha} tentativa={tentativaErro}>
                      <CampoSenha
                        id="confirmarSenha"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirmarSenha}
                        {...register('confirmarSenha')}
                      />
                    </CampoComErro>
                    {errors.confirmarSenha && (
                      <p className="text-rotulo text-destructive">{errors.confirmarSenha.message}</p>
                    )}
                  </div>

                  {erro && <p className="text-sm text-destructive">{erro}</p>}
                  <Button type="submit" className="h-(--control-h)" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    {isSubmitting ? 'Enviando...' : 'Solicitar cadastro'}
                  </Button>
                  <p className="text-center text-rotulo text-muted-foreground">
                    Já tem acesso?{' '}
                    <Link to="/login" className="font-medium text-foreground underline underline-offset-2">
                      Entrar
                    </Link>
                  </p>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
