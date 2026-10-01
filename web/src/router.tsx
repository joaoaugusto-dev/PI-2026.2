import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RotaAdmin, RotaProtegida } from '@/lib/auth'
import { CadastroFerramentasPage } from '@/pages/CadastroFerramentasPage'
import { ConviteAcessoPage } from '@/pages/ConviteAcessoPage'
import { CalendarioPage } from '@/pages/CalendarioPage'
import { CategoriasPage } from '@/pages/CategoriasPage'
import { ColaboradoresPage } from '@/pages/ColaboradoresPage'
import { ConsultaPage } from '@/pages/ConsultaPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { DevolucaoPage } from '@/pages/DevolucaoPage'
import { EmprestimosPage } from '@/pages/EmprestimosPage'
import { ErroInesperadoPage } from '@/pages/ErroInesperadoPage'
import { FerramentaDetalhePage } from '@/pages/FerramentaDetalhePage'
import { FerramentasPage } from '@/pages/FerramentasPage'
import { IndisponiveisPage } from '@/pages/IndisponiveisPage'
import { LoginPage } from '@/pages/LoginPage'
import { NaoEncontradaPage } from '@/pages/NaoEncontradaPage'
import { NovaFerramentaPage } from '@/pages/NovaFerramentaPage'
import { RetiradaPage } from '@/pages/RetiradaPage'
import { SetoresPage } from '@/pages/SetoresPage'
import { StatusPage } from '@/pages/StatusPage'

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
          { path: 'status', element: <StatusPage /> },
          { path: 'health', element: <StatusPage /> },
          { path: 'ferramentas', element: <FerramentasPage /> },
          { path: 'ferramentas/nova', element: <NovaFerramentaPage /> },
          { path: 'ferramentas/:id', element: <FerramentaDetalhePage /> },
          { path: 'retiradas/nova', element: <RetiradaPage /> },
          { path: 'devolucoes', element: <DevolucaoPage /> },
          { path: 'indisponiveis', element: <IndisponiveisPage /> },
          { path: 'calendario', element: <CalendarioPage /> },
          { path: 'emprestimos', element: <EmprestimosPage /> },
          {
            path: 'cadastros/colaboradores',
            element: (
              <RotaAdmin>
                <ColaboradoresPage />
              </RotaAdmin>
            ),
          },
          {
            path: 'cadastros/setores',
            element: (
              <RotaAdmin>
                <SetoresPage />
              </RotaAdmin>
            ),
          },
          {
            path: 'cadastros/categorias',
            element: (
              <RotaAdmin>
                <CategoriasPage />
              </RotaAdmin>
            ),
          },
          {
            path: 'cadastros/ferramentas',
            element: (
              <RotaAdmin>
                <CadastroFerramentasPage />
              </RotaAdmin>
            ),
          },
          { path: 'design-system', element: <DesignSystemPage /> },
          // 404 dentro do layout: quem está logado não perde a sidebar (deslogado cai no login)
          { path: '*', element: <NaoEncontradaPage /> },
        ],
      },
    ],
  },
  { path: '/login', errorElement: <ErroInesperadoPage />, element: <LoginPage /> },
  // link de convite: caminho curto e sem palavra que sugira o que é (o token é o segredo)
  { path: '/c/:token', errorElement: <ErroInesperadoPage />, element: <ConviteAcessoPage /> },
  { path: '/consulta', errorElement: <ErroInesperadoPage />, element: <ConsultaPage /> },
])
