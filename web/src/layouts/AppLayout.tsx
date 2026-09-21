import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
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
} from '@/components/ui/Sidebar'
import { CabecalhoApp } from '@/components/layout/CabecalhoApp'
import { RodapeSidebar } from '@/components/layout/RodapeSidebar'

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

const titulosExtras: Record<string, string> = {
  '/status': 'Status da API',
  '/design-system': 'Design system',
}

function tituloDaPagina(pathname: string) {
  const todasRotas = [...navPrincipal, ...navCadastros]
  const rota = todasRotas.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)))
  return rota?.label ?? titulosExtras[pathname] ?? 'Dashboard'
}

function useTituloDaAba(pathname: string) {
  useEffect(() => {
    const titulo = tituloDaPagina(pathname)
    document.title = titulo === 'Dashboard' ? 'SOUFER Tools' : `${titulo} - SOUFER Tools`
  }, [pathname])
}

/**
 * Indicador deslizante do item ativo da sidebar: mede a posição do botão
 * `data-active` dentro do container via `getBoundingClientRect` (funciona
 * tanto para os itens do nível principal quanto para os do submenu
 * "Cadastros", que ficam aninhados em outro elemento) e desliza até lá via
 * `transform` — recalcula a cada troca de rota e a cada abertura/fechamento
 * do collapsible, já que isso muda quais itens existem no DOM.
 */
function useIndicadorSidebar(dep: unknown) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [posicao, setPosicao] = useState<{ top: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const atualizar = () => {
      const ativo = container.querySelector<HTMLElement>('[data-active="true"]')
      if (!ativo) {
        setPosicao(null)
        return
      }
      const containerRect = container.getBoundingClientRect()
      const ativoRect = ativo.getBoundingClientRect()
      setPosicao({ top: ativoRect.top - containerRect.top, height: ativoRect.height })
    }

    atualizar()
    const id = requestAnimationFrame(atualizar)
    return () => cancelAnimationFrame(id)
  }, [dep])

  return { containerRef, posicao }
}

function useRelogio() {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  return agora
}

export function AppLayout() {
  const location = useLocation()
  const cadastrosAtivo = navCadastros.some((item) => location.pathname.startsWith(item.to))
  const [cadastrosOpen, setCadastrosOpen] = useState(cadastrosAtivo)
  const { containerRef: indicadorRef, posicao: indicadorPos } = useIndicadorSidebar(
    `${location.pathname}-${cadastrosOpen}`
  )
  useTituloDaAba(location.pathname)
  const agora = useRelogio()
  const dataFormatada = agora
    .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    .replace(/^\w/, (letra) => letra.toUpperCase())
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <img src="/brand/soufer-negativo.png" alt="Soufer Tools" className="mx-auto block w-[85%]" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent ref={indicadorRef} className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 w-0.5 rounded-full bg-primary transition-[transform,opacity,height]"
                style={{
                  height: indicadorPos?.height ?? 0,
                  transform: `translateY(${indicadorPos?.top ?? 0}px)`,
                  opacity: indicadorPos ? 1 : 0,
                }}
              />
              <SidebarMenu>
                {navPrincipal.map((item) => {
                  const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isActive} className="h-(--control-h) px-3 text-corpo">
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

                <Collapsible.Root defaultOpen={cadastrosAtivo} onOpenChange={setCadastrosOpen}>
                  <SidebarMenuItem>
                    <Collapsible.Trigger asChild>
                      <SidebarMenuButton className="group/cadastros h-(--control-h) justify-between px-3 text-corpo">
                        Cadastros
                        <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]/cadastros:rotate-180" />
                      </SidebarMenuButton>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                      <SidebarMenuSub className="mx-3.5 gap-0">
                        {navCadastros.map((item) => (
                          <SidebarMenuSubItem key={item.to}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname.startsWith(item.to)}
                              className="h-(--control-h) px-3 text-corpo"
                            >
                              <NavLink to={item.to}>{item.label}</NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </Collapsible.Content>
                  </SidebarMenuItem>
                </Collapsible.Root>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/design-system'}
                    className="h-(--control-h) px-3 text-corpo"
                  >
                    <NavLink to="/design-system">Design system</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <RodapeSidebar />
      </Sidebar>
      <SidebarInset>
        <CabecalhoApp
          titulo={tituloDaPagina(location.pathname)}
          dataFormatada={dataFormatada}
          horaFormatada={horaFormatada}
        />
        <div key={location.pathname} className="animate-entrada flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
