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
import { useFerramentas } from '@/hooks/useFerramentas'
import { useAuth } from '@/lib/auth'

const navPrincipal: { to: string; label: string; contagem?: 'total' | 'indisponiveis' }[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/retiradas/nova', label: 'Registrar retirada' },
  { to: '/devolucoes', label: 'Registrar devolução' },
  { to: '/ferramentas', label: 'Ferramentas', contagem: 'total' },
  { to: '/indisponiveis', label: 'Indisponíveis', contagem: 'indisponiveis' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/emprestimos', label: 'Histórico' },
]

// `titulo` desambigua aba e cabeçalho: "Ferramentas" existe no menu principal e em Cadastros
const navCadastros = [
  { to: '/cadastros/colaboradores', label: 'Colaboradores', titulo: 'Cadastro de colaboradores' },
  { to: '/cadastros/ferramentas', label: 'Ferramentas', titulo: 'Cadastro de ferramentas' },
  { to: '/cadastros/categorias', label: 'Categorias', titulo: 'Cadastro de categorias' },
  { to: '/cadastros/setores', label: 'Setores', titulo: 'Cadastro de setores' },
]

const titulosExtras: Record<string, string> = {
  '/status': 'Status da API',
  '/health': 'Status da API',
  '/design-system': 'Design system',
}

const NAO_ENCONTRADA = 'Página não encontrada'

// cadastro aberto pela URL por quem não é admin mostra o 404 (RotaAdmin): o título não pode
// entregar que a rota existe; URL desconhecida também não é "Dashboard"
function tituloDaPagina(pathname: string, ehAdmin: boolean) {
  const cadastro = navCadastros.find((item) => pathname.startsWith(item.to))
  if (cadastro) return ehAdmin ? cadastro.titulo : NAO_ENCONTRADA
  const rota = navPrincipal.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)))
  return rota?.label ?? titulosExtras[pathname] ?? NAO_ENCONTRADA
}

function useTituloDaAba(titulo: string) {
  useEffect(() => {
    document.title = titulo === 'Dashboard' ? 'SOUFER Tools' : `${titulo} - SOUFER Tools`
  }, [titulo])
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
    // o submenu entra com translateY (lista-stagger): mede de novo quando a animação termina
    const fim = setTimeout(atualizar, 350)
    return () => {
      cancelAnimationFrame(id)
      clearTimeout(fim)
    }
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
  const { usuario } = useAuth()
  // contagens reais nos badges do menu (limit 1: só interessa o meta.total)
  const contagens = {
    total: useFerramentas({ limit: 1 }).data?.meta.total,
    indisponiveis: useFerramentas({ status: 'indisponivel', limit: 1 }).data?.meta.total,
  }
  const cadastrosAtivo = navCadastros.some((item) => location.pathname.startsWith(item.to))
  const [cadastrosOpen, setCadastrosOpen] = useState(cadastrosAtivo)
  const { containerRef: indicadorRef, posicao: indicadorPos } = useIndicadorSidebar(
    `${location.pathname}-${cadastrosOpen}`,
  )
  const titulo = tituloDaPagina(location.pathname, usuario?.papel === 'admin')
  useTituloDaAba(titulo)
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
                      {item.contagem && contagens[item.contagem] !== undefined && (
                        <SidebarMenuBadge className="text-sidebar-foreground/50">
                          {contagens[item.contagem]}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}

                {usuario?.papel === 'admin' && (
                  <Collapsible.Root defaultOpen={cadastrosAtivo} onOpenChange={setCadastrosOpen}>
                    <SidebarMenuItem>
                      <Collapsible.Trigger asChild>
                        <SidebarMenuButton className="group/cadastros h-(--control-h) justify-between px-3 text-corpo">
                          Cadastros
                          <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]/cadastros:rotate-180" />
                        </SidebarMenuButton>
                      </Collapsible.Trigger>
                      <Collapsible.Content className="data-[state=closed]:animate-saida">
                        <SidebarMenuSub className="lista-stagger mx-3.5 gap-0">
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
                )}

                {import.meta.env.DEV && usuario?.papel === 'admin' && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === '/design-system'}
                      className="h-(--control-h) px-3 text-corpo"
                    >
                      <NavLink to="/design-system">Design system</NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <RodapeSidebar />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <CabecalhoApp
          titulo={titulo}
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
