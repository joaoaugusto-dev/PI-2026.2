import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { CampoComErro } from '@/components/CampoComErro'
import { CampoPin } from '@/components/CampoPin'
import { TelaAguardandoAprovacao } from '@/components/TelaAguardandoAprovacao'
import { TexturaFerramentas } from '@/components/TexturaFerramentas'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { api } from '@/lib/api'
import { avisarErro } from '@/lib/avisar-erro'

const cadastroSchema = z
  .object({
    nome: z.string().min(1, 'Informe seu nome'),
    matricula: z.string().regex(/^(?!0000)\d{4}$/, 'A matrícula tem 4 dígitos'),
    senha: z.string().length(6, 'A senha tem 6 dígitos'),
    confirmarSenha: z.string().length(6, 'A senha tem 6 dígitos'),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    message: 'As senhas não conferem',
    path: ['confirmarSenha'],
  })

// Mensagens por `error.code` do POST /v1/auth/registro (issue #149).
const MENSAGENS_ERRO: Record<string, string> = {
  COLABORADOR_NOT_FOUND: 'Matrícula não encontrada ou colaborador inativo. Confira o número ou procure a manutenção.',
  MATRICULA_JA_CADASTRADA: 'Esta matrícula já possui um cadastro de acesso. Tente entrar ou fale com um administrador.',
  TOO_MANY_REQUESTS: 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.',
}

// Só esses códigos são sobre a matrícula em si (destacam o campo).
const CODIGOS_MATRICULA = ['COLABORADOR_NOT_FOUND', 'MATRICULA_JA_CADASTRADA']

type CadastroForm = z.infer<typeof cadastroSchema>

export function CadastroPage() {
  const [erro, setErro] = useState(false)
  const [tentativaErro, setTentativaErro] = useState(0)
  const [enviado, setEnviado] = useState(false)
  const senhaRef = useRef<HTMLInputElement>(null)
  const confirmarSenhaRef = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: '', matricula: '', senha: '', confirmarSenha: '' },
  })

  async function onSubmit(dados: CadastroForm) {
    setErro(false)
    try {
      await api.post('/auth/registro', { nome: dados.nome, matricula: dados.matricula, senha: dados.senha })
      setEnviado(true)
    } catch (erroRequisicao: any) {
      const codigo = erroRequisicao?.response?.data?.error?.code
      let mensagem = MENSAGENS_ERRO[codigo] ?? 'Não foi possível concluir o cadastro. Tente novamente.'
      if (!erroRequisicao?.response) {
        // Sem resposta (API fora, CORS, rede) — não é problema do cadastro em si.
        mensagem = 'Não foi possível conectar ao servidor. Verifique se a API está no ar e tente novamente.'
      }
      setErro(CODIGOS_MATRICULA.includes(codigo))
      setTentativaErro((tentativa) => tentativa + 1)
      avisarErro(mensagem)
    }
  }

  function onErroValidacao(errosForm: FieldErrors<CadastroForm>) {
    const primeiraMensagem = Object.values(errosForm)[0]?.message
    if (primeiraMensagem) avisarErro(primeiraMensagem)
  }

  if (enviado) {
    return <TelaAguardandoAprovacao />
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
            <CardTitle className="text-titulo">Criar conta</CardTitle>
            <CardDescription>Cadastro de Funcionário</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit, onErroValidacao)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <CampoComErro erro={!!errors.nome} tentativa={tentativaErro}>
                  <Input
                    id="nome"
                    autoComplete="name"
                    autoFocus
                    aria-invalid={!!errors.nome}
                    className="h-(--control-h) text-secao md:text-secao"
                    {...register('nome')}
                  />
                </CampoComErro>
              </div>

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
                <CampoComErro erro={!!errors.senha} tentativa={tentativaErro}>
                  <Controller
                    name="senha"
                    control={control}
                    render={({ field }) => (
                      <CampoPin
                        ref={senhaRef}
                        id="senha"
                        autoComplete="new-password"
                        erro={!!errors.senha}
                        value={field.value}
                        onChange={(valor) => {
                          field.onChange(valor)
                          if (valor.length === 6) confirmarSenhaRef.current?.focus()
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
                        ref={confirmarSenhaRef}
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
                {isSubmitting ? 'Enviando...' : 'Criar conta'}
              </Button>
              <Button asChild type="button" variant="outline" className="h-(--control-h) text-corpo">
                <Link to="/login">Já estou cadastrado — Entrar</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
