# Refatoração do front: PascalCase e componentização

Branch: `refactor/front-pascalcase-componentizacao` (fora de qualquer issue, criada para não interferir no trabalho em andamento).

Este documento resume o que mudou em `web/src`, para quem for mexer no front depois. O comportamento das telas não foi alterado: só a organização do código.

## Avisos importantes

- **Conflitos de merge:** `RetiradaPage.tsx` e `DevolucaoPage.tsx` mudaram bastante (cerca de 335 → 264 e 419 → 265 linhas). Quem tiver branch aberta mexendo nelas (ex.: FE-08, FE-15) provavelmente terá conflito ao integrar. `DashboardPage.tsx`, `StatusPage.tsx` e `AppLayout.tsx` também foram alterados.
- **shadcn:** o comando `npx shadcn@latest add <nome>` gera o arquivo em minúsculo (ex.: `dialog.tsx`). Depois de adicionar, renomeie para PascalCase (`Dialog.tsx`) e use o import `@/components/ui/Dialog`. O `components.json` continua apontando para `@/components/ui`.
- **Case-sensitivity:** no Windows/macOS o Git não percebe renomeações só de maiúscula/minúscula. Se algo quebrar localmente após o merge, apague `node_modules/.vite` e confira se não sobrou o arquivo antigo em minúsculo. No Linux (CI, EC2) imports com a caixa errada falham no build.
- **`web/CLAUDE.md` desatualizado:** ele ainda descreve a estrutura de pastas antiga e os arquivos de `ui/` em minúsculo. Não foi alterado nesta branch, então alguém do time precisa atualizar.
- **`DesignSystemPage`:** não foi mexida. O `Card` declarado localmente nela tem o mesmo nome do `ui/Card`, mas só existe dentro daquele arquivo.

## 1. Arquivos renomeados (PascalCase)

Todos em `web/src/components/ui/`. Os nomes exportados dos componentes já eram PascalCase; mudou o nome do arquivo e, por consequência, o caminho de import.

| Antes | Depois |
|---|---|
| `avatar.tsx` | `Avatar.tsx` |
| `badge.tsx` | `Badge.tsx` |
| `button.tsx` | `Button.tsx` |
| `card.tsx` | `Card.tsx` |
| `dialog.tsx` | `Dialog.tsx` |
| `input.tsx` | `Input.tsx` |
| `label.tsx` | `Label.tsx` |
| `select.tsx` | `Select.tsx` |
| `separator.tsx` | `Separator.tsx` |
| `sheet.tsx` | `Sheet.tsx` |
| `sidebar.tsx` | `Sidebar.tsx` |
| `skeleton.tsx` | `Skeleton.tsx` |
| `sonner.tsx` | `Sonner.tsx` |
| `switch.tsx` | `Switch.tsx` |
| `table.tsx` | `Table.tsx` |
| `tooltip.tsx` | `Tooltip.tsx` |

Exemplo de import: `@/components/ui/button` → `@/components/ui/Button`.

Não foram renomeados: `hooks/use-mobile.ts` e `hooks/use-sidebar-swipe.ts` (são hooks, não componentes) e `lib/*` (utilitários).

Já estavam em PascalCase e ficaram como estavam: `App`, `AppLayout`, `SeletorDataCalendario`, `StatusBadge`, `DashboardPage`, `DesignSystemPage`, `DevolucaoPage`, `PlaceholderPage`, `RetiradaPage`, `StatusPage`.

## 2. Componentes criados

Convenção: nome em PascalCase e em português, como o restante do projeto. Cada pasta agrupa por área de uso.

### `components/fluxo/` (retirada e devolução)

| Componente | Para que serve | Props principais |
|---|---|---|
| `RotuloCampo` | Rótulo em caixa alta acima de um campo | `children` |
| `SecaoFluxo` | Seção numerada com título e descrição | `titulo`, `descricao?`, `children` |
| `BotaoSecundario` | Botão com borda (h-9), no padrão dos botões auxiliares | props de `<button>` (`type="button"` por padrão) |
| `AtalhosDeTeste` | Botões "Simular leitura" das telas mockadas | `atalhos: {codigo, label}[]`, `onSimular(codigo)` |
| `CampoIdentificacao` | Campo com ícone para scanner/digitação (ferramenta e colaborador) | `icone`, `estadoClassName?`, `mono?`, `children` (ícones à direita) e props de `<input>` (aceita o `register()` do React Hook Form) |
| `DicaEnter` (mesmo arquivo do anterior) | Texto "Enter" exibido quando o campo está vazio | nenhuma |
| `CadastroRapidoColaborador` | Cadastro rápido no meio da retirada; guarda o rascunho internamente | `onUsar({nome, matricula})` |
| `DadoRotulado` | Par rótulo + valor no cartão de detalhes | `rotulo`, `children` |
| `DetalhesEmprestimo` | Cartão do empréstimo aberto, com faixa de atraso | `emprestimo`, `saida`, `diasDesdeSaida`, `diasAtraso`, `onBuscarOutra`. Exporta o tipo `EmprestimoAberto` |
| `SeletorCondicao` | Escolha OK / Avaria / Perda. Exporta o tipo `Condicao` | `value`, `onChange` |
| `FormularioOcorrencia` | Descrição, custo estimado e confirmação para avaria/perda | `tipo`, `ferramenta`, `retiradoPor`, `matricula`, `descricaoProps`, `confirmacaoProps` (retornos de `register()`), `custoEstimado`, `onCustoChange(digitos)`, `confirmado` |
| `RodapeFluxo` | Rodapé fixo com responsável logado, pendências e botão de confirmar | `rotuloUsuario`, `usuario`, `faltando: string[]`, `textoBotao`, `comIcones?` |

Observações:
- `RodapeFluxo` desabilita o botão sempre que `faltando` tiver itens; a tela não precisa mais calcular `podeConfirmar`.
- `FormularioOcorrencia` recebe só os dígitos do custo; a máscara de moeda (`formatarMoeda`) continua na tela.
- A regra de negócio 6 continua valendo: o responsável mostrado em `RodapeFluxo` vem do usuário logado, nunca do corpo da requisição.

### `components/dashboard/`

| Componente | Para que serve | Props principais |
|---|---|---|
| `KpiCard` | Card de indicador. Exporta o tipo `TomKpi` | `label`, `valor`, `tom?` |
| `AtalhoAcao` | Card grande de atalho (retirar/devolver) | `to`, `titulo`, `descricao`, `icone`, `variante: 'primario' \| 'escuro'` |
| `EmprestimoAtrasadoItem` | Linha da lista de atrasados. Exporta o tipo `EmprestimoAtrasado` | `item` |
| `BarraSetor` | Barra proporcional de empréstimos por setor | `setor`, `total`, `maximo` |
| `EsqueletoLista` | Linhas de `Skeleton` de carregamento | `linhas`, `linhaClassName`, `className?` |

### `components/status/`

| Componente | Para que serve | Props principais |
|---|---|---|
| `BannerStatus` | Faixa de estado geral (operacional, degradado, offline) | `tom: 'disponivel' \| 'atraso' \| 'indisponivel'`, `icone`, `titulo`, `selo`, `children` |
| `CardServico` | Card de um serviço (API, banco, uptime, latência) | `titulo`, `icone`, `carregando`, `children`, `detalhes` |
| `LinhaDetalhe` (mesmo arquivo do anterior) | Linha rótulo/valor dentro do card | `rotulo`, `children` |
| `LinkExterno` | Botão de link que abre em nova aba | `href`, `icone`, `children` |

### `components/layout/`

| Componente | Para que serve | Props principais |
|---|---|---|
| `CabecalhoApp` | Cabeçalho do `AppLayout` (título, data/hora, status da API, notificações, usuário) | `titulo`, `dataFormatada`, `horaFormatada` |
| `RodapeSidebar` | Rodapé da sidebar (som de confirmação, consulta pública, sair, versão) | nenhuma |

## 3. O que cada tela passou a usar

- `RetiradaPage`: `SecaoFluxo`, `CampoIdentificacao`, `DicaEnter`, `AtalhosDeTeste`, `CadastroRapidoColaborador`, `RotuloCampo`, `RodapeFluxo`.
- `DevolucaoPage`: `SecaoFluxo`, `CampoIdentificacao`, `DicaEnter`, `AtalhosDeTeste`, `DetalhesEmprestimo`, `SeletorCondicao`, `FormularioOcorrencia`, `RodapeFluxo`.
- `DashboardPage`: `KpiCard`, `AtalhoAcao`, `EmprestimoAtrasadoItem`, `BarraSetor`, `EsqueletoLista`.
- `StatusPage`: `BannerStatus`, `CardServico`, `LinhaDetalhe`, `LinkExterno`.
- `AppLayout`: `CabecalhoApp`, `RodapeSidebar`.

## 4. Como reaproveitar nas próximas telas

- Nova tela de fluxo (ex.: outra etapa de cadastro): comece por `SecaoFluxo` + `CampoIdentificacao` + `RodapeFluxo`.
- Antes de escrever um botão com borda, um rótulo em caixa alta ou um card de KPI, confira se já existe um componente acima.
- Componentes novos entram na pasta da área (`fluxo/`, `dashboard/`, `status/`, `layout/`) ou em `components/` quando forem genéricos (como `StatusBadge`). Nomes em PascalCase.
- `components/ui/` continua reservado ao shadcn; componentes do projeto ficam fora dessa pasta.

## 5. Validação

- `tsc -b` e `npm run build` passam.
- `oxlint` mostra apenas warnings que já existiam antes da refatoração.
- Não houve teste manual no navegador nas larguras de 360px, 768px e 1280px (exigência do Definition of Done para tela nova). Como o markup e as classes foram preservados, o esperado é comportamento idêntico, mas vale uma conferência visual das telas de Retirada, Devolução, Dashboard e Status antes do merge.
