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

## Design system

A página de estilos (FE-01) foi feita em código, não no Figma: os tokens vivem
em `web/src/index.css` e a página de referência é a rota `/design-system`
(`web/src/pages/DesignSystemPage.tsx`).

| Token | Valor | Uso |
|---|---|---|
| `--brand-red` | `#E30613` | Ação primária e marca |
| `--brand-red-dark` | `#B5121B` | Hover / pressionado |
| `--status-disponivel` | `#1B8A4B` | Badge, KPI, indicador |
| `--status-em-uso` | `#575756` | Badge, KPI, indicador |
| `--status-indisponivel` | `#E30613` | Badge, KPI, indicador |
| `--status-atraso` | `#C77700` | Badge, KPI, indicador |

Verde e âmbar são sinalização operacional, não identidade: nunca em botão,
fundo de área grande ou elemento de marca.

Escala tipográfica: display 40px, título 25px, seção 16px, corpo 16px, rótulo
11px (só label caixa-alta), KPI 38px. Espaçamento reaproveita a escala padrão
do Tailwind, já em múltiplos de 4px.

Altura mínima de 56px em ação principal (operador pode estar de luva) e 60px
nos botões de fluxo fixos no rodapé.

Movimento: estado 120–160ms, tela/modal 200–260ms (nunca acima de 300ms),
stagger de lista 20ms só nos 6 primeiros itens, `prefers-reduced-motion`
reduz a opacidade em 80ms sem translação.

## Componentes reutilizáveis

- `DataTable`
- `StatusBadge` (pronto — forma + cor, status nunca só por cor)
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

O sistema trabalha visualmente com os estados, cada um com forma própria além
da cor:

- disponível — círculo cheio, verde;
- em uso — círculo vazado com borda sólida, cinza;
- indisponível — quadrado, vermelho;
- atraso — triângulo, âmbar, sempre acompanhado do número de dias.
