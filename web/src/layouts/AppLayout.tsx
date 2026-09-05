import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
          <SidebarHeader className="items-center px-4 py-4">
            <img src="/brand/soufer-negativo.png" alt="Soufer Tools" className="w-[85%]" />
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
                        <SidebarMenuButton asChild isActive={isActive}>
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
        <header className="flex h-16 items-center gap-2 border-b px-4 justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-secao font-semibold">{tituloDaPagina(location.pathname)}</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-corpo text-muted-foreground hidden md:inline">
              {dataFormatada} · {horaFormatada}
            </span>
            <Link to="/status" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Badge variant="outline" className="gap-1 text-xs py-0.5 px-2 bg-background cursor-pointer">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Activity className="size-3 text-muted-foreground" />
                <span className="text-[11px] font-medium hidden sm:inline">Status API</span>
              </Badge>
            </Link>
            <button type="button" className="relative cursor-pointer">
              <BellIcon className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
              <Badge className="absolute -top-2 -right-2 size-4 justify-center rounded-full p-0 text-[10px] bg-[var(--brand-red)] text-white">
                4
              </Badge>
            </button>
            <div className="flex items-center gap-2 border-l pl-4">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs font-medium">MA</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-corpo font-medium">Marcos Andrade</span>
                <span className="text-rotulo text-muted-foreground">Almoxarife · Turno A</span>
              </div>
            </div>
          </div>
        </header>
        <div key={location.pathname} className="animate-entrada flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
