import { BellIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
]

export function AppLayout() {
  const location = useLocation()

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-3 font-semibold">
          SOUFER Tools
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
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <BellIcon className="ml-auto size-4 text-muted-foreground" />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
