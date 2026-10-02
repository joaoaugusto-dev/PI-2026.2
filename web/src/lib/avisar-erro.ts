import { toast } from 'sonner'

/**
 * Toast de erro do sistema inteiro (FE-01, design system): toda notificação
 * — erro ou sucesso — entra por cima, nunca por baixo (posição padrão do
 * `Toaster` em `App.tsx` já é `top-right`; aqui fixamos de novo pra não
 * depender de quem configurou o provider). Erro ainda usa cor sólida no
 * vermelho vivo da marca (`--brand-red`), não o `--destructive` padrão (que é
 * o `--brand-red-dark`, um vinho escuro que não se destacava no fundo do
 * toast) — é isso que o distingue do sucesso, não mais a posição. Toda tela
 * nova usa `avisarErro()` pra erro, nunca `toast.error()` direto — ver seção
 * "Notificações" da página de estilos.
 */
export function avisarErro(mensagem: string) {
  toast.error(mensagem, {
    position: 'top-right',
    duration: 5000,
    className: 'text-secao',
    style: {
      background: 'var(--brand-red)',
      color: 'white',
      border: 'none',
    },
  })
}

/** Mensagem do envelope de erro da API (`error.message`) ou o texto padrão quando não há resposta (API fora). */
export function mensagemDeErro(e: unknown, padrao: string) {
  return erroDaApi(e)?.message ?? padrao
}

interface ErroDaApi {
  code?: string
  message?: string
  details?: unknown[]
}

/** Envelope `error` da resposta da API (`undefined` sem resposta, ex.: API fora). */
export function erroDaApi(e: unknown) {
  return (e as { response?: { data?: { error?: ErroDaApi } } }).response?.data?.error
}

export function statusDoErro(e: unknown) {
  return (e as { response?: { status?: number } }).response?.status
}
