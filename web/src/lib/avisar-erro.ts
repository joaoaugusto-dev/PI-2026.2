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
