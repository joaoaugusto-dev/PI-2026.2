import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { StatusPage } from '@/pages/StatusPage'

const placeholder = (title: string) => <PlaceholderPage title={title} />

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: placeholder('Dashboard') },
      { path: 'status', element: <StatusPage /> },
      { path: 'health', element: <StatusPage /> },
      { path: 'ferramentas', element: placeholder('Ferramentas') },
      { path: 'ferramentas/nova', element: placeholder('Nova ferramenta') },
      { path: 'ferramentas/:id', element: placeholder('Detalhe da ferramenta') },
      { path: 'retiradas/nova', element: placeholder('Retirada') },
      { path: 'devolucoes', element: placeholder('Devolução') },
      { path: 'indisponiveis', element: placeholder('Indisponíveis') },
      { path: 'calendario', element: placeholder('Calendário') },
      { path: 'emprestimos', element: placeholder('Histórico de empréstimos') },
      { path: 'colaboradores', element: placeholder('Colaboradores') },
      { path: 'cadastros/setores', element: placeholder('Setores') },
      { path: 'cadastros/categorias', element: placeholder('Categorias') },
      { path: 'cadastros/atividades', element: placeholder('Atividades') },
      { path: 'importar', element: placeholder('Importar CSV') },
      { path: 'design-system', element: <DesignSystemPage /> },
    ],
  },
  { path: '/login', element: placeholder('Login') },
  { path: '/consulta', element: placeholder('Consulta') },
  { path: '*', element: placeholder('404') },
])
