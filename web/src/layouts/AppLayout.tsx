import { Activity, BellIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'

const nav = [
  {
    label: 'Movimentação',
    items: [
      { to: '/', label: 'Dashboard' },
      { to: '/retiradas/nova', label: 'Retirada' },
      { to: '/devolucoes', label: 'Devolução' },
      { to: '/indisponiveis', label: 'Indisponíveis' },
      { to: '/emprestimos', label: 'Histórico' },
      { to: '/calendario', label: 'Calendário' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/ferramentas', label: 'Ferramentas' },
      { to: '/colaboradores', label: 'Colaboradores' },
      { to: '/cadastros/setores', label: 'Setores' },
      { to: '/cadastros/categorias', label: 'Categorias' },
      { to: '/cadastros/atividades', label: 'Atividades' },
      { to: '/importar', label: 'Importar CSV' },
    ],
  },
  {
    label: 'Sistema',
    items: [{ to: '/status', label: 'Status da API' }],
  },
  {
    label: 'Referência',
    items: [{ to: '/design-system', label: 'Design system' }],
  },
]

export function AppLayout() {
  const location = useLocation()

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-3 font-semibold flex items-center justify-between">
          <span>SOUFER Tools</span>
          <span className="text-[10px] font-mono font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            v1.0
          </span>
        </SidebarHeader>
        <SidebarContent>
          {nav.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      item.to === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.to)

                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <NavLink to={item.to} end={item.to === '/'}>
                            {item.label}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
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
