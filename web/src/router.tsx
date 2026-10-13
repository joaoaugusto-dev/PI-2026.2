import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RotaAdmin, RotaProtegida } from '@/lib/auth'
import { DashboardPage } from '@/pages/DashboardPage'
import { ErroInesperadoPage } from '@/pages/ErroInesperadoPage'
import { LoginPage } from '@/pages/LoginPage'

// Code splitting por tela: o bundle inicial leva só login, layout e dashboard; cada tela baixa na primeira
// visita (antes ia tudo num JS de ~970 KB). O router espera o módulo antes de trocar de tela.
function pagina<M>(carregar: () => Promise<M>, nome: keyof M, soAdmin = false) {
  return async () => {
    const Pagina = (await carregar())[nome] as ComponentType
    return { element: soAdmin ? <RotaAdmin><Pagina /></RotaAdmin> : <Pagina /> }
  }
}

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <ErroInesperadoPage />,
    element: (
      <RotaProtegida>
        <AppLayout />
      </RotaProtegida>
    ),
    // pai sem path: um erro numa página renderiza a tela de erro dentro do layout (sidebar continua)
    children: [
      {
        errorElement: <ErroInesperadoPage />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'status', lazy: pagina(() => import('@/pages/StatusPage'), 'StatusPage') },
          { path: 'health', lazy: pagina(() => import('@/pages/StatusPage'), 'StatusPage') },
          { path: 'ferramentas', lazy: pagina(() => import('@/pages/FerramentasPage'), 'FerramentasPage') },
          { path: 'ferramentas/nova', lazy: pagina(() => import('@/pages/NovaFerramentaPage'), 'NovaFerramentaPage') },
          { path: 'ferramentas/:id', lazy: pagina(() => import('@/pages/FerramentaDetalhePage'), 'FerramentaDetalhePage') },
          { path: 'retiradas/nova', lazy: pagina(() => import('@/pages/RetiradaPage'), 'RetiradaPage') },
          { path: 'devolucoes', lazy: pagina(() => import('@/pages/DevolucaoPage'), 'DevolucaoPage') },
          { path: 'indisponiveis', lazy: pagina(() => import('@/pages/IndisponiveisPage'), 'IndisponiveisPage') },
          { path: 'calendario', lazy: pagina(() => import('@/pages/CalendarioPage'), 'CalendarioPage') },
          { path: 'emprestimos', lazy: pagina(() => import('@/pages/EmprestimosPage'), 'EmprestimosPage') },
          {
            path: 'cadastros/colaboradores',
            lazy: pagina(() => import('@/pages/ColaboradoresPage'), 'ColaboradoresPage', true),
          },
          {
            path: 'cadastros/setores',
            lazy: pagina(() => import('@/pages/SetoresPage'), 'SetoresPage', true),
          },
          {
            path: 'cadastros/categorias',
            lazy: pagina(() => import('@/pages/CategoriasPage'), 'CategoriasPage', true),
          },
          {
            path: 'cadastros/ferramentas',
            lazy: pagina(() => import('@/pages/CadastroFerramentasPage'), 'CadastroFerramentasPage', true),
          },
          // só em dev (import.meta.env.DEV) e para admin; em produção a rota não existe e cai no 404
          ...(import.meta.env.DEV
            ? [
                {
                  path: 'design-system',
                  // import dinâmico dentro do ramo DEV: o build de produção elimina o ramo e a página sai do bundle
                  lazy: async () => {
                    const { DesignSystemPage } = await import('@/pages/DesignSystemPage')
                    return {
                      element: (
                        <RotaAdmin>
                          <DesignSystemPage />
                        </RotaAdmin>
                      ),
                    }
                  },
                },
              ]
            : []),
          // 404 dentro do layout: quem está logado não perde a sidebar (deslogado cai no login)
          { path: '*', lazy: pagina(() => import('@/pages/NaoEncontradaPage'), 'NaoEncontradaPage') },
        ],
      },
    ],
  },
  { path: '/login', errorElement: <ErroInesperadoPage />, element: <LoginPage /> },
  // link de convite: caminho curto e sem palavra que sugira o que é (o token é o segredo)
  { path: '/c/:token', errorElement: <ErroInesperadoPage />, lazy: pagina(() => import('@/pages/ConviteAcessoPage'), 'ConviteAcessoPage') },
  { path: '/consulta', errorElement: <ErroInesperadoPage />, lazy: pagina(() => import('@/pages/ConsultaPage'), 'ConsultaPage') },
])
