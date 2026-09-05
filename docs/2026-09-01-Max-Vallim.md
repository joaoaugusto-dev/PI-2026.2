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

## O que ainda fica de fora desta entrega

- A segunda fonte externa mencionada em `docs/fluxo-integracao.md` (planilhas
  de inventário legado da manutenção, `.docx`/`.xlsx`) não foi importada —
  ela depende de normalização manual dos dados e está fora do escopo desta
  correção pontual. A BrasilAPI já cobre o requisito mínimo de "pelo menos
  uma fonte externa".
- Testes automatizados (Vitest/Supertest) para os novos endpoints não foram
  criados nesta branch.
