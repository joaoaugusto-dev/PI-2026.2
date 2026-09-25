import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { RotaAdmin, RotaProtegida } from '@/lib/auth'
import { AprovacoesPage } from '@/pages/AprovacoesPage'
import { CadastroPage } from '@/pages/CadastroPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { DevolucaoPage } from '@/pages/DevolucaoPage'
import { LoginPage } from '@/pages/LoginPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { RetiradaPage } from '@/pages/RetiradaPage'
import { StatusPage } from '@/pages/StatusPage'

const placeholder = (title: string) => <PlaceholderPage title={title} />

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RotaProtegida>
        <AppLayout />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'status', element: <StatusPage /> },
      { path: 'health', element: <StatusPage /> },
      { path: 'ferramentas', element: placeholder('Ferramentas') },
      { path: 'ferramentas/nova', element: placeholder('Nova ferramenta') },
      { path: 'ferramentas/:id', element: placeholder('Detalhe da ferramenta') },
      { path: 'retiradas/nova', element: <RetiradaPage /> },
      { path: 'devolucoes', element: <DevolucaoPage /> },
      { path: 'indisponiveis', element: placeholder('Indisponíveis') },
      { path: 'calendario', element: placeholder('Calendário') },
      { path: 'emprestimos', element: placeholder('Histórico de empréstimos') },
      { path: 'colaboradores', element: placeholder('Colaboradores') },
      { path: 'cadastros/setores', element: placeholder('Setores') },
      { path: 'cadastros/categorias', element: placeholder('Categorias') },
      { path: 'cadastros/atividades', element: placeholder('Atividades') },
      { path: 'importar', element: placeholder('Importar CSV') },
      {
        path: 'aprovacoes',
        element: (
          <RotaAdmin>
            <AprovacoesPage />
          </RotaAdmin>
        ),
      },
      { path: 'design-system', element: <DesignSystemPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <CadastroPage /> },
  { path: '/consulta', element: placeholder('Consulta') },
  { path: '*', element: placeholder('404') },
])
