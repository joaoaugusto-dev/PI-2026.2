# CLAUDE.md — /web (SOUFER Tools)

Este arquivo documenta os padrões concretos do front conforme vamos
construindo. Ele é vivo: toda decisão de estrutura, nome de pasta, convenção
de componente ou lib escolhida durante o trabalho deve ser registrada aqui,
para a próxima sessão seguir sem redescobrir nada.

As regras de negócio e o cronograma continuam em `/CLAUDE.md` (raiz) — não
duplicar aqui. As convenções de branch/commit/PR continuam em
`/CONTRIBUTING.md`. Este arquivo é só sobre **como o código do `/web` é
escrito**.

---

## Stack (definida na Seção 4 do guia raiz)

- Vite + React 19 + React Router 7
- TanStack Query (dado remoto) + Axios (cliente HTTP)
- React Hook Form + Zod (formulários e validação)
- Tailwind + shadcn/ui
- `recharts` (gráficos) + `react-barcode` (Code128)

## Estrutura de pastas

```
web/
├── src/
│   ├── main.tsx          # entrypoint, importa index.css
│   ├── App.tsx            # QueryClientProvider + RouterProvider + Toaster
│   ├── router.tsx          # createBrowserRouter com todas as rotas (FE-10)
│   ├── index.css           # @import "tailwindcss" + tokens shadcn (tw-animate-css, geist)
│   ├── layouts/
│   │   └── AppLayout.tsx   # sidebar + header, usado pelas rotas autenticadas
│   ├── pages/
│   │   └── PlaceholderPage.tsx  # placeholder genérico das rotas ainda não implementadas
│   ├── components/ui/      # componentes gerados pelo shadcn (não editar à mão sem motivo)
│   ├── hooks/               # hooks compartilhados (ex.: use-mobile do shadcn)
│   └── lib/
│       ├── api.ts          # instância Axios (baseURL = VITE_API_URL)
│       └── utils.ts         # helper `cn()` do shadcn
├── components.json          # config do shadcn (style radix-nova, alias @/*)
├── .env.example             # VITE_API_URL
└── vite.config.ts           # plugins react + tailwindcss, alias @ -> ./src
```

Rotas de `/login` e `/consulta` ficam **fora** do `AppLayout` (tela de
quiosque da FE-17, sem sidebar) — mantidas como rotas irmãs no `router.tsx`,
não filhas do layout autenticado.

## Convenções de código

- Alias de import `@/...` aponta para `src/` — configurado tanto em
  `tsconfig.json`/`tsconfig.app.json` (`paths`) quanto em `vite.config.ts`
  (`resolve.alias`). Os dois precisam ficar em sincronia.
- Componentes do shadcn ficam em `src/components/ui/` e são tratados como
  gerados — para adicionar um novo, usar `npx shadcn@latest add <nome>`, não
  copiar código manualmente.
- Toda chamada HTTP para a API passa pelo client `@/lib/api.ts` (Axios com
  `baseURL` vinda de `VITE_API_URL`), nunca `fetch` solto ou uma nova
  instância de Axios por arquivo.
- Dado remoto é buscado com TanStack Query (hooks `use<Entidade>` por
  domínio, a criar conforme cada tela ganha dado real) — nunca `useEffect` +
  `useState` manual para chamada de API.

## Decisões já tomadas

- **shadcn/ui inicializado com base Radix UI, preset `radix-nova`** (não o
  padrão "Base UI" da CLI v4) — mantém compatibilidade com a stack decidida
  no guia raiz (Seção 4 cita `shadcn/ui` no sentido tradicional/Radix).
- **Tailwind v4** via `@tailwindcss/vite` (CSS-first, sem `tailwind.config.js`
  — os tokens de tema vivem em `src/index.css` dentro de `@theme inline`).
- **Bug conhecido do `npx shadcn add`** neste projeto: como o Vite template
  usa `tsconfig.json` só com `references` (sem `paths` própria), a CLI do
  shadcn não resolvia o alias `@/*` e gravava os arquivos num diretório
  literal `@/` na raiz. Corrigido duplicando o bloco `paths` também no
  `tsconfig.json` raiz (além do `tsconfig.app.json`, que é quem o build/IDE
  realmente usa). Se isso voltar a acontecer após um `shadcn add`, checar se
  criou uma pasta `@/` na raiz do `web/` e mover o conteúdo para `src/`.
- Componente `form` do shadcn (wrapper de React Hook Form) não existe mais no
  registry da CLI v4 usada — os formulários usam React Hook Form + Zod +
  `@hookform/resolvers` diretamente, sem o wrapper. Adicionar de volta só se
  precisar dos primitivos de acessibilidade (`FormField`/`FormMessage`) que
  ele oferecia.

- **Design system (FE-01) vive em `src/index.css`, não no Figma** — a equipe
  fechou a paleta/tipografia/movimento direto em código (tokens CSS em
  `:root`/`.dark` dentro de `@theme inline`), sem página separada no Figma.
  Paleta: `--brand-red` #E30613 (ação primária/marca), `--brand-red-dark`
  #B5121B (hover/pressed), preto #1D1D1B (texto), `--border`/`--input`
  #D9D9D9. Cores de status (`--status-disponivel` verde #1B8A4B,
  `--status-em-uso` cinza #575756, `--status-indisponivel` vermelho #E30613,
  `--status-atraso` âmbar #C77700) são exclusivas de badge/KPI/indicador —
  nunca usar verde/âmbar em botão ou área de marca. Espaçamento reaproveita a
  escala padrão do Tailwind (já em múltiplos de 4px, sem token custom).
  Tipografia usa Geist Variable (`--font-sans`) e uma stack mono nativa
  (`--font-mono`, sem dependência nova) para código de patrimônio. Durações de
  movimento (`--motion-state` 140ms, `--motion-screen` 240ms,
  `--motion-stagger` 20ms, `--motion-reduced` 80ms) ficam como tokens prontos
  para a FE-08/FE-06 consumirem.
  A **página de estilos** da issue vive em `src/pages/DesignSystemPage.tsx`
  (rota `/design-system`, link no grupo "Referência" da sidebar): é ela que
  documenta paleta, escala tipográfica, os 4 estados de status, estados de
  botão/campo, KPI cards, movimento e uso dos logos — substitui a página do
  Figma prevista no enunciado da FE-01. Ao mudar um token, atualizar a página
  junto.
  Tokens de tipografia (`--text-display` 40px, `--text-titulo` 25px,
  `--text-secao`/`--text-corpo` 16px, `--text-rotulo` 11px, `--text-kpi` 38px)
  geram utilitários Tailwind (`text-display`, `text-corpo`, ...) — usar esses
  em vez de `text-2xl`/`text-sm` avulsos. Texto corrido nunca abaixo de 14px;
  `text-rotulo` (11px) é exceção só para label caixa-alta.
  Altura mínima de controle: `--control-h` (56px, qualquer ação principal —
  operador de luva) e `--control-h-fluxo` (60px, botões fixos de retirada/
  devolução). Os primitivos do shadcn vêm com alturas menores (`h-8`); os
  wrappers dimensionados são responsabilidade da **FE-08**, até lá aplicar
  `h-(--control-h)` na chamada.
- **`StatusBadge` (`src/components/StatusBadge.tsx`)** é o único jeito de
  exibir status: cada estado tem forma própria além da cor (círculo cheio /
  círculo vazado / quadrado / triângulo) — status nunca é comunicado só por
  cor. `atraso` sempre mostra o número de dias.
- **Logos** ficam em `web/public/brand/` (`soufer-negativo.svg`,
  `soufer-assinatura.svg`, `soufer-industrial.svg`). Negativo = sidebar e
  login; assinatura = documentos/etiquetas em fundo claro; industrial =
  exclusivo do quiosque de consulta. **Os arquivos ainda não foram
  adicionados ao repositório** — a página de estilos mostra o caminho
  esperado como pendente até alguém subir os SVGs.
- **Sidebar/login sempre no visual negativo** (fundo escuro, logo branco) é
  regra de layout, não de tema — implementar na FE-06 (`AppLayout`), não em
  `index.css`.

## Responsividade

Toda tela precisa ser validada em 360px, 768px e 1280px antes de marcar como
concluída (regra do guia raiz, Seção 5).

---

## Requisitos do PI extraídos de `/docs/Orientação PI 2026-2 -DESENVOLVIMENTO DE APLICAÇÃO WEB.pdf`

Este documento é a fonte oficial de avaliação do módulo. As regras abaixo
foram extraídas dele e têm prioridade sobre qualquer suposição própria — em
caso de conflito, releia o PDF (ver `/CLAUDE.md` raiz).

### Unidade "Desenvolvimento de Interfaces de Usuário para Web" (o que vale para `/web`)

O que a avaliação exige explicitamente da interface front-end:

1. **React** como framework — já definido na Seção 4 do guia raiz.
2. **Estruturada em componentes reutilizáveis** — nada de tela monolítica;
   extrair componentes (`StatusBadge`, `DataTable`, `KpiCard`, etc., como já
   planejado no cronograma FE-08) em vez de duplicar markup entre telas.
3. **Navegação entre as funcionalidades** — roteamento real (React Router)
   cobrindo todas as telas do sistema, não só as "prontas".
4. **Formulários com validação** — todo formulário usa React Hook Form + Zod;
   não aceitar submit de dado inválido no client (mesmo a API validando de
   novo no back).
5. **Layout responsivo** — decorre da regra de 360/768/1280px acima; é item
   de nota, não só de boa prática.
6. **Integração com a API RESTful do projeto (/api)** — o front deve **consumir
   dados reais da API**, não mock, permitindo ao usuário realizar as
   operações previstas pela aplicação (CRUD completo do fluxo de retirada/
   devolução). Telas mockadas servem só de esqueleto temporário (Sprint 4),
   nunca como entrega final de uma funcionalidade.

### Regras gerais do PI que afetam como trabalhamos no `/web`

- **Entrega só digital, só dentro do prazo.** Impresso ou atrasado = nota
  zero, sem exceção (já em `/CLAUDE.md` raiz, Seção 3, item 10 — reforçado
  aqui porque vale também para qualquer entrega parcial do front).
- **Repositório GitHub é parte da nota.** Precisa conter código-fonte,
  documentação técnica (README, instruções de instalação/uso) e **histórico
  de commits que evidencie trabalho colaborativo real** — commits
  concentrados de uma pessoa só, sem histórico de todos os integrantes,
  prejudica a nota (checklist final da Seção 9 do guia raiz).
- **Sprint reports são entregáveis avaliados**, não
  burocracia interna — manter atualizados em `/docs/atas/`.

### Fora do escopo de `/web` (mas dependências diretas)

- **API RESTful** (unidade "Tecnologias para Desenvolvimento Web") é quem o
  front consome — GET/POST/PUT/DELETE versionados. Qualquer necessidade nova
  de dado no front vira pedido de endpoint para `/api`, nunca lógica de
  negócio duplicada no client.
- **Camada de integração de dados** (unidade "Integração de Dados") já trata
  validação/qualidade na origem — o front não precisa reimplementar
  sanitização de dado vindo de fonte externa, só validar o que o usuário
  digita.
- **Nuvem (AWS/EC2/S3+CloudFront)** — o build de produção do `/web` será
  publicado em S3 + CloudFront (Seção 4 do guia raiz); local e produção
  precisam ambos funcionar antes da migração final para nuvem.
