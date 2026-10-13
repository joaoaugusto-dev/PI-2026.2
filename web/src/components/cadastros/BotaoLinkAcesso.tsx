import { Link2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { avisarErro } from '@/lib/avisar-erro'
import { playSomConfirmacao } from '@/lib/som-confirmacao'

/**
 * Gera o link de acesso (convite) do colaborador e o copia: quem recebe define a própria
 * senha e já entra logada. Serve para o primeiro acesso e para trocar a senha (esquecida
 * ou bloqueada por tentativas erradas). Cada clique gera um link novo e invalida o anterior
 * ainda não usado. Se o navegador não deixar copiar
 * (HTTP fora do localhost), mostra o link num diálogo para copiar à mão.
 */
export function BotaoLinkAcesso({ colaboradorId, nome }: { colaboradorId: number; nome: string }) {
  const [gerando, setGerando] = useState(false)
  const [linkManual, setLinkManual] = useState<string | null>(null)

  async function gerar() {
    setGerando(true)
    try {
      const { data } = await api.post<{ data: { token: string } }>(`/colaboradores/${colaboradorId}/convite`)
      const link = `${window.location.origin}/c/${data.data.token}`
      try {
        await navigator.clipboard.writeText(link)
        playSomConfirmacao()
        toast.success(`Link de ${nome.split(' ')[0]} copiado. Vale por 7 dias e só pode ser usado uma vez.`)
      } catch {
        setLinkManual(link)
      }
    } catch {
      avisarErro('Não foi possível gerar o link de acesso.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={gerar}
        disabled={gerando}
        className="gap-1.5"
        title="Link de acesso: gera e copia o link para a pessoa criar ou trocar a senha (vale 7 dias, uso único)"
        aria-label="Link de acesso"
      >
        {gerando ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
        {/* só ícone abaixo de 2xl: com botões de 44px os quatro rótulos não cabem na linha */}
        <span className="hidden 2xl:inline">Link de acesso</span>
      </Button>
      <Dialog open={linkManual !== null} onOpenChange={(a) => !a && setLinkManual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de acesso e troca de senha de {nome}</DialogTitle>
            <DialogDescription>
              Não foi possível copiar sozinho. Copie o link abaixo e envie para a pessoa; vale por 7 dias e só pode ser
              usado uma vez.
            </DialogDescription>
          </DialogHeader>
          <Input readOnly value={linkManual ?? ''} onFocus={(e) => e.currentTarget.select()} aria-label="Link de acesso e troca de senha" />
        </DialogContent>
      </Dialog>
    </>
  )
}
