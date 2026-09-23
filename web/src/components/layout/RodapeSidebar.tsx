import { ExternalLink, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SidebarFooter, SidebarSeparator } from '@/components/ui/Sidebar'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/lib/auth'
import { playSomConfirmacao, setSomConfirmacaoAtivo, useSomConfirmacaoAtivo } from '@/lib/som-confirmacao'

export function RodapeSidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const somConfirmacao = useSomConfirmacaoAtivo()

  return (
    <SidebarFooter className="gap-3 px-2 pb-3">
      <SidebarSeparator />
      <div className="flex items-center justify-between px-2">
        <span className="text-corpo text-sidebar-foreground/80">Som de confirmação</span>
        <Switch
          checked={somConfirmacao}
          onCheckedChange={(ativo) => {
            setSomConfirmacaoAtivo(ativo)
            if (ativo) playSomConfirmacao()
          }}
        />
      </div>
      <a
        href="/consulta"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-2 text-corpo text-sidebar-foreground/60 hover:text-sidebar-foreground"
      >
        Abrir consulta pública
        <ExternalLink className="size-3.5" />
      </a>
      <button
        type="button"
        onClick={() => {
          logout()
          navigate('/login')
        }}
        className="flex items-center gap-1.5 px-2 text-left text-corpo text-sidebar-foreground/60 hover:text-sidebar-foreground"
      >
        <LogOut className="size-3.5" />
        Sair
      </button>
      <span className="px-2 font-mono text-rotulo text-sidebar-foreground/30">v0.0.2-beta</span>
    </SidebarFooter>
  )
}
