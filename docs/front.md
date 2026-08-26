# Front-end

## Stack

- Vite
- React 18
- React Router 6
- TanStack Query
- Axios
- React Hook Form
- Zod
- Tailwind
- shadcn/ui
- lucide-react
- sonner
- recharts
- react-barcode
- react-day-picker ou grade própria

## Rotas

| Rota | Responsável | Finalidade |
|---|---|---|
| `/login` | Guilherme | Login |
| `/consulta` | Guilherme | Quiosque de consulta |
| `/` | João | Dashboard |
| `/ferramentas` | João | Lista e filtros |
| `/ferramentas/nova` | João | Cadastro |
| `/ferramentas/:id/editar` | João | Edição |
| `/ferramentas/:id` | João | Detalhe |
| `/ferramentas/:id/etiqueta` | João | Impressão |
| `/retiradas/nova` | João | Retirada |
| `/devolucoes` | João | Devolução |
| `/indisponiveis` | Guilherme | Tratativa |
| `/calendario` | João | Vencimentos |
| `/emprestimos` | Guilherme | Histórico |
| `/colaboradores` | Kauan | CRUD |
| `/cadastros/setores` | Kauan | CRUD |
| `/cadastros/categorias` | Kauan | CRUD |
| `/cadastros/atividades` | Kauan | CRUD |
| `/importar` | Guilherme | Importação CSV |

## Componentes reutilizáveis

- `DataTable`
- `StatusBadge`
- `KpiCard`
- `EmptyState`
- Campo de leitura de código

## Código de barras

Os campos de identificação de ferramenta e colaborador recebem foco automático e tratam `Enter`, permitindo o uso de leitor físico sem configuração adicional.

O padrão utilizado para as etiquetas é Code128.

## Responsividade

A interface deve ser validada em:

- 360 px;
- 768 px;
- 1280 px.

## Estados

O sistema trabalha visualmente com os estados:

- disponível;
- em uso;
- indisponível;
- situação de devolução/atraso.
