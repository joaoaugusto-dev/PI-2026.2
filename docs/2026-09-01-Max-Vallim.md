# Entrega parcial — Integração e Persistência dos Dados (01/09 — Prof. Max Vallim)

## Contexto

Esta entrega parcial exige: criação do banco de dados, principais tabelas,
consultas básicas e integração inicial com pelo menos uma fonte externa de
dados (API, CSV ou outra fonte relevante).

Uma auditoria do estado do repositório (branch `docs/data-01-fontes-externas`,
commit `d179cae`) mostrou que a modelagem do banco (migration
`api/db/migrations/0001_init.sql`, 13 tabelas, triggers e views) já estava
pronta e documentada, mas três pontos exigidos pelo enunciado ainda faltavam
em código, apenas planejados em `/docs`:

1. A integração com a BrasilAPI (feriados) existia só como documentação e
   como tabela `feriados` vazia no schema — não havia nenhum client HTTP,
   service ou endpoint que de fato buscasse os dados na API externa.
2. Não havia nenhuma rota de consulta básica (SELECT/INSERT) sobre as tabelas
   de negócio — o código só tinha autenticação, health-check e sessão de
   quiosque.
3. `api/db/seed.sql` estava dessincronizado do schema atual (referenciava
   colunas/tabelas removidas na revisão pós-visita técnica de 02/09, como
   `categorias`, `codigo_cracha`, `cargo` e `codigo_patrimonio`), então a
   carga de dados de teste (`npm run db:seed`) falhava.

Esta branch (`fix/db-01-integracao-dados`) endereça os pontos 1 e 2. O ponto 3
(seed dessincronizado) já foi corrigido de forma equivalente por outro PR
mergeado na `main` enquanto esta branch estava em andamento (conflito
resolvido via rebase, mantendo a versão já mergeada de `api/db/seed.sql` —
sem alteração própria desta branch nesse arquivo).

## O que foi alterado

### 1. Integração inicial com fonte externa: BrasilAPI de feriados

Novos arquivos:

- **`api/src/services/feriadoService.ts`** — client HTTP (via `fetch` nativo
  do Node 20, com timeout de 5s) para
  `https://brasilapi.com.br/api/feriados/v1/{ano}`. Responsável por:
  - `sincronizarFeriados(ano)`: busca na BrasilAPI e grava (upsert) na tabela
    `feriados` (cache local).
  - `listarPorAno(ano)`: lê primeiro do cache; se vazio, tenta sincronizar
    com a BrasilAPI; se a fonte externa falhar, aplica o **fallback de
    sábado/domingo** exigido pela Regra 9 do `CLAUDE.md`.
  - `ehDiaUtil(dataISO)`: verifica se uma data é dia útil (nem fim de semana,
    nem feriado nacional).
- **`api/src/validators/feriadoValidator.ts`** — validação Zod de `ano` e
  `data` de query string.
- **`api/src/controllers/feriadoController.ts`** e
  **`api/src/routes/v1/feriadoRoutes.ts`** — endpoints:
  - `GET /v1/feriados?ano=2026` — lista feriados do ano (cache/API/fallback).
  - `GET /v1/feriados/dia-util?data=2026-09-07` — verifica dia útil.
  - `POST /v1/feriados/sincronizar?ano=2026` — força nova sincronização com a
    BrasilAPI (autenticado, papel `almoxarife`).

Rotas registradas em `api/src/routes/v1/index.ts`.

### 2. Consultas básicas sobre tabela de negócio: CRUD mínimo de ferramentas

Novos arquivos:

- **`api/src/services/ferramentaService.ts`** — `listar` (paginado, com
  filtro opcional por `status`, respeitando a Regra 2 do `CLAUDE.md` de nunca
  misturar ferramentas ativas com baixadas), `buscarPorId` e `criar`.
- **`api/src/validators/ferramentaValidator.ts`** — validação Zod de query de
  listagem, parâmetro de ID e corpo de criação.
- **`api/src/controllers/ferramentaController.ts`** e
  **`api/src/routes/v1/ferramentaRoutes.ts`** — endpoints:
  - `GET /v1/ferramentas` — lista paginada (`{ data, meta }`, seguindo o
    envelope padrão da Seção 5 do `CLAUDE.md`).
  - `GET /v1/ferramentas/:id` — busca por ID.
  - `POST /v1/ferramentas` — cadastro (autenticado, papel `almoxarife`).

Rotas registradas em `api/src/routes/v1/index.ts`.

## Verificação

- `npx tsc --noEmit` (dentro de `/api`) rodou sem erros após todas as
  alterações.
- Não foi possível validar as rotas novas ponta a ponta contra um banco
  PostgreSQL local nesta sessão (sem credenciais de acesso ao Postgres
  instalado na máquina) — recomenda-se rodar `npm run db:migrate` seguido de
  `npm run db:seed` e testar manualmente os endpoints acima via
  Insomnia/Swagger (`/docs`) antes de abrir o PR, conforme o Definition of
  Done padrão (Seção 6 do `CLAUDE.md`).

## Linha do tempo do processo (registro de apoio para o relatório da entrega)

Este registro serve de base para o relatório da atividade a ser anexado na
entrega parcial — documenta não só o código produzido, mas o processo (branch,
PR, conflito e revisão) pelo qual ele passou até ficar pronto para merge.

1. **05/09, ~10:40–10:41** — Criada a branch `fix/db-01-integracao-dados` a
   partir da `main` e feitos 4 commits: correção do `api/db/seed.sql`,
   integração com a BrasilAPI de feriados, CRUD básico de ferramentas e a
   primeira versão deste `.md`.
2. **05/09, ~11:05** — Aberto o PR #115 direcionando para `main`, mas com uma
   descrição livre, fora do template oficial do repositório
   (`.github/pull_request_template.md`) e sem referenciar as issues do board
   do GitHub.
3. **05/09, ~11:09** — A pedido, o PR #115 foi **fechado** e reaberto como
   **PR #116**, agora seguindo à risca o template oficial: seções de
   Descrição, Tipo de Mudança, Área Afetada, Como Testar, Evidências e
   Definition of Done, além de referenciar as issues reais do board
   (`Ref #35` DATA-02, `Ref #34` DB-08, `Ref #40` API-05, `Ref #43` API-07)
   com `Ref` em vez de `Closes`, já que o escopo implementado é parcial em
   relação ao "pronto quando" de cada uma dessas issues.
4. **Conflito de merge detectado no PR #116.** Enquanto esta branch estava em
   andamento, João Augusto de Freitas mergeou o PR #114
   (`chore/nivaldo-01-09-setup-ambiente-api` — nome de branch referente ao
   relatório da atividade de extensão do dia 01/09 para o Prof. Nivaldo, não
   ao conteúdo técnico do PR) na `main`, às 10:58. Esse PR incluía, entre
   outras coisas, o commit `fix(api-02): corrigir seed.sql para o schema pos
   revisao DB-02` (10:11) — uma correção **equivalente** à que esta branch já
   havia feito de forma independente no mesmo arquivo (`api/db/seed.sql`),
   já que ambos os commits corrigiam a mesma dessincronização com o schema
   pós-revisão de 02/09. Resultado: dois colaboradores corrigiram o mesmo
   arquivo em paralelo, e o PR #116 passou a aparecer como `CONFLICTING`
   contra a `main` atualizada.
5. **Resolução do conflito:** a branch foi rebaseada sobre a `main`
   atualizada. No conflito em `api/db/seed.sql`, o commit próprio desta
   branch foi descartado (`git rebase --skip`) em favor da versão já mergeada
   pelo PR #114, por ser equivalente e já estar em `main` — evitando reverter
   ou duplicar o trabalho do colega. Este `.md` foi atualizado para refletir
   que o ponto do seed não é mais parte desta branch, e a branch foi
   atualizada no remoto com `git push --force-with-lease` (seguro porque é
   uma branch de feature individual, sem outros colaboradores commitando
   nela).
6. **Revisão automatizada do bot `claude[bot]` no PR #116** apontou dois
   problemas no código de `api/src/services/feriadoService.ts` e
   `api/src/validators/feriadoValidator.ts`:
   - O `catch` de `listarPorAno` tratava **qualquer** erro (inclusive falha
     do Postgres no `INSERT`/upsert da tabela `feriados`, não só falha da
     BrasilAPI) como "fonte externa fora do ar", respondendo `200` com o
     fallback de fim de semana e mascarando um problema de infraestrutura.
   - `GET /v1/feriados/dia-util` aceitava qualquer ano na data (sem a mesma
     faixa 2000–ano atual+5 já usada em `GET /v1/feriados`), o que permite
     repetir chamadas de saída à BrasilAPI para anos fora de alcance a cada
     requisição anônima — o projeto ainda não tem `express-rate-limit`
     configurado em nenhuma rota.
   - Ambos os apontamentos foram avaliados como válidos (o segundo, só
     parcialmente — a sugestão de exigir autenticação nessa rota **não**
     fazia sentido, já que é informação pública equivalente a
     `GET /v1/feriados`) e corrigidos no commit `fix(data-02): nao mascarar
     falha de banco como fallback de feriados`. As duas threads de revisão
     foram respondidas e marcadas como resolvidas.
7. PR #116 permanece aberto, `MERGEABLE`, aguardando aprovação de pelo menos
   um integrante da equipe conforme o fluxo de PR do `CONTRIBUTING.md`.

## O que ainda fica de fora desta entrega

- A segunda fonte externa mencionada em `docs/fluxo-integracao.md` (planilhas
  de inventário legado da manutenção, `.docx`/`.xlsx`) não foi importada —
  ela depende de normalização manual dos dados e está fora do escopo desta
  correção pontual. A BrasilAPI já cobre o requisito mínimo de "pelo menos
  uma fonte externa".
- Testes automatizados (Vitest/Supertest) para os novos endpoints não foram
  criados nesta branch.
