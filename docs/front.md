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

Wireframes (FE-02) e protótipo navegável (FE-03) ficam no Figma:
https://www.figma.com/design/jARhREffx0KXWn1UTUpxmE/SOUFER-Tools

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

### Movimento

Toda animação do sistema é definida em `web/src/index.css` e demonstrada na
página de estilos. A regra que sustenta os 60fps: animação só toca `transform`
e `opacity`, as únicas propriedades que o compositor resolve sem layout nem
repaint. Nunca animar `width`, `height`, `top`, `left`, `margin` ou
`box-shadow`. O script `npm run check:motion` verifica isso no CSS gerado.

| Token / classe | Valor | Uso |
|---|---|---|
| `--ease-soufer` | `cubic-bezier(.2, 0, 0, 1)` | Easing único do sistema |
| `--motion-state` | 140ms | Hover, foco, pressionado |
| `--motion-screen` | 240ms | Tela e modal (nunca acima de 300ms) |
| `--motion-stagger` | 20ms | Intervalo entre itens de lista |
| `--motion-reduced` | 80ms | `prefers-reduced-motion` |
| `animate-entrada` | 240ms | Fade + 8px de subida: página, card, linha |
| `animate-reconhecido` | 420ms | Leitura de código aceita |
| `animate-erro` | 260ms | Código recusado — nega o gesto, não pisca cor |
| `animate-atraso` | 2s, loop | Único loop permitido, só no KPI de atrasadas |
| `.lista-stagger` | — | Escalona só os 6 primeiros filhos |
| `.status-vivo` | 3,2s, loop | Halo que respira num status em andamento |
| `.transicao-status` | 240ms | Troca de status atravessa a cor, não salta |
| `.brilho` | 1,4s, loop | Varredura de carregamento (skeleton) |

Movimento contínuo é para estado em andamento, não decoração, e o halo anima
escala e opacidade — nunca a cor, que é repaint a cada quadro. Loop só em
elemento singular (cabeçalho de detalhe, KPI, chip de filtro): 400 linhas de
tabela respirando são 400 camadas compostas por quadro. A exceção é o
skeleton, temporário e limitado a uma tela.

`--default-transition-duration` e `--default-transition-timing-function`
apontam para esses tokens, então todo utilitário `transition-*` do Tailwind já
sai no tempo certo sem repetir `duration-*`/`ease-*` nas telas.

Com `prefers-reduced-motion: reduce` os keyframes são redefinidos globalmente
para só opacidade em 80ms — sem translação, sem escala e sem loop.

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
