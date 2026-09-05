import { useState, type CSSProperties } from 'react'
import { Activity, BellIcon, ChevronDown, ExternalLink, LogOut } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

const navPrincipal = [
  { to: '/', label: 'Dashboard' },
  { to: '/retiradas/nova', label: 'Registrar retirada' },
  { to: '/devolucoes', label: 'Registrar devolução' },
  { to: '/ferramentas', label: 'Ferramentas', badge: 486 },
  { to: '/indisponiveis', label: 'Indisponíveis', badge: 16 },
  { to: '/calendario', label: 'Calendário' },
  { to: '/emprestimos', label: 'Histórico' },
]

const navCadastros = [
  { to: '/colaboradores', label: 'Colaboradores' },
  { to: '/cadastros/setores', label: 'Setores' },
  { to: '/cadastros/categorias', label: 'Categorias' },
  { to: '/cadastros/atividades', label: 'Atividades' },
  { to: '/importar', label: 'Importar CSV' },
]

/**
 * Sidebar/login sao sempre no visual negativo (FE-01) — regra de layout, nao
 * de tema, entao as cores nao vem do toggle claro/escuro: sao fixadas aqui
 * via CSS vars locais reaproveitando os tokens de marca ja existentes.
 */
const sidebarNegativoStyle = {
  '--sidebar': 'var(--foreground)',
  '--sidebar-foreground': '#FFFFFF',
  '--sidebar-border': 'rgba(255,255,255,.1)',
  '--sidebar-accent': 'rgba(255,255,255,.08)',
  '--sidebar-accent-foreground': '#FFFFFF',
  '--sidebar-ring': 'rgba(255,255,255,.3)',
} as CSSProperties

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [somConfirmacao, setSomConfirmacao] = useState(true)
  const cadastrosAtivo = navCadastros.some((item) => location.pathname.startsWith(item.to))

  return (
    <SidebarProvider>
      {/*
        O componente `Sidebar` do shadcn espalha `{...props}` (inclusive `style`)
        num `div` interno (`sidebar-container`), nao no `div` mais externo que
        aplica `text-sidebar-foreground` — passar o override direto no
        `<Sidebar>` deixava o texto herdando a cor global (quase preta) em vez
        da negativa, so o item ativo (que redeclara a cor) ficava branco. Um
        wrapper `contents` por fora garante que a variavel chegue a toda a
        arvore sem afetar o layout flex do `SidebarProvider`.
      */}
      <div style={sidebarNegativoStyle} className="contents">
        <Sidebar>
          <SidebarHeader className="gap-1 px-4 py-4">
            <img src="/brand/soufer-negativo.png" alt="Soufer" className="h-8 w-auto self-start" />
            <span className="text-rotulo tracking-widest text-sidebar-foreground/60">
              TOOLS · ALMOXARIFADO
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navPrincipal.map((item) => {
                    const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="data-active:shadow-[inset_2px_0_0_var(--color-primary)]"
                        >
                          <NavLink to={item.to} end={item.to === '/'}>
                            {item.label}
                          </NavLink>
                        </SidebarMenuButton>
                        {item.badge !== undefined && (
                          <SidebarMenuBadge className="text-sidebar-foreground/50">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    )
                  })}

                  <Collapsible.Root defaultOpen={cadastrosAtivo}>
                    <SidebarMenuItem>
                      <Collapsible.Trigger asChild>
                        <SidebarMenuButton className="group/cadastros justify-between">
                          Cadastros
                          <ChevronDown className="size-3.5 transition-transform group-data-[state=open]/cadastros:rotate-180" />
                        </SidebarMenuButton>
                      </Collapsible.Trigger>
                      <Collapsible.Content>
                        <SidebarMenuSub>
                          {navCadastros.map((item) => (
                            <SidebarMenuSubItem key={item.to}>
                              <SidebarMenuSubButton asChild isActive={location.pathname.startsWith(item.to)}>
                                <NavLink to={item.to}>{item.label}</NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </Collapsible.Content>
                    </SidebarMenuItem>
                  </Collapsible.Root>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === '/design-system'}>
                      <NavLink to="/design-system">Design system</NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-3 px-2 pb-3">
            <SidebarSeparator />
            <div className="flex items-center justify-between px-2">
              <span className="text-corpo text-sidebar-foreground/80">Som de confirmação</span>
              <Switch checked={somConfirmacao} onCheckedChange={setSomConfirmacao} />
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
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-2 text-left text-corpo text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
            <span className="px-2 font-mono text-rotulo text-sidebar-foreground/30">v0.0.2-beta</span>
          </SidebarFooter>
        </Sidebar>
      </div>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4 justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>

          <div className="flex items-center gap-3">
            <Link to="/status" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Badge variant="outline" className="gap-1 text-xs py-0.5 px-2 bg-background cursor-pointer">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Activity className="size-3 text-muted-foreground" />
                <span className="text-[11px] font-medium hidden sm:inline">Status API</span>
              </Badge>
            </Link>
            <BellIcon className="size-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
