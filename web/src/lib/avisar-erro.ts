import { toast } from 'sonner'

/** Snackbar de erro centralizado no topo — mais visível que o padrão
 * bottom-right do resto do sistema, pro operador não perder o aviso na
 * tela de login/cadastro. Cor sólida no vermelho vivo da marca
 * (`--brand-red`), não o `--destructive` padrão (que é o `--brand-red-dark`,
 * um vinho escuro que não se destacava no fundo do toast). */
export function avisarErro(mensagem: string) {
  toast.error(mensagem, {
    position: 'top-center',
    duration: 5000,
    className: 'text-secao',
    style: {
      background: 'var(--brand-red)',
      color: 'white',
      border: 'none',
    },
  })
}
