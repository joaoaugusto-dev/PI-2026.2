# API — Endpoint de KPIs do dashboard (registro de execução)

Issue: [#69 — API-18 — Endpoint de KPIs do dashboard](https://github.com/joaoaugusto-dev/PI-2026.2/issues/69)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Branch: `feat/api-18-endpoint-kpis-dashboard` (criada a partir da `development`, um commit por etapa)
PR: a abrir

## Objetivo

`GET /v1/dashboard/kpis` devolve os seis contadores da `vw_dashboard_kpis` (cadastradas, disponíveis, em uso,
indisponíveis, atrasadas e ocorrências abertas), sem as listas do `GET /v1/dashboard`.

## Decisões

| Ponto | Decisão | Motivo |
|---|---|---|
| Ordem das rotas | `/kpis` é declarada antes de `/:lista` | Senão `kpis` cairia em `/:lista` e o validator responderia 400 (lista desconhecida) |
| `atrasadas` | Usa a definição do cartão de atrasados (previsão em dia anterior, calendário de Brasília), não a da view (`NOW() > previsao_devolucao`) | A barra de contadores e o cartão do painel mostram o mesmo número; é a mesma escolha já feita no `GET /v1/dashboard` |
| Snapshot | Os contadores e a contagem de atrasadas saem do mesmo `emSnapshot` (`REPEATABLE READ` somente leitura) | Os seis números são coerentes entre si, com 1 conexão do pool |
| Acesso | `manutencao` e `admin`; `consulta` recebe 403 | Regra 8: a consulta nunca vê dados de operação além da disponibilidade |

## O que foi feito

1. `feat(api): rota GET /v1/dashboard/kpis ...` — [dashboardRoutes.ts](../../api/src/routes/v1/dashboardRoutes.ts) (com o Swagger),
   [dashboardController.ts](../../api/src/controllers/dashboardController.ts) e [dashboardService.ts](../../api/src/services/dashboardService.ts).
2. `fix(api): atrasadas ... mesma definição do painel` — `kpis()` em [dashboardService.ts](../../api/src/services/dashboardService.ts).
3. `test(api): cobrir GET /v1/dashboard/kpis ...` — [dashboard.test.ts](../../api/src/tests/dashboard.test.ts): formato dos seis campos,
   401, 403 e conferência com contagem direta nas tabelas.
4. `docs(api): documentar GET /v1/dashboard/kpis` — [docs/backend/api.md](../backend/api.md).

## Conferência manual (critério "Pronto quando")

Em 24/10/2026, no banco de desenvolvimento, a resposta de `kpis()` foi comparada com `SELECT COUNT(*)` escritos direto nas
tabelas `ferramentas`, `emprestimos` e `ocorrencias`:

| Contador | API | Contagem manual |
|---|---|---|
| cadastradas | 81 | 81 |
| disponiveis | 52 | 52 |
| em_uso | 18 | 18 |
| indisponiveis | 11 | 11 |
| atrasadas | 18 | 18 |
| ocorrencias | 5 | 5 |

Os seis números batem. A mesma comparação roda no teste automatizado (só exige igualdade quando nenhum outro teste alterou
o banco entre as duas leituras).

## Se sobrar tempo

`GET /v1/dashboard/atrasos` para o gráfico da FE-21 não foi feito: a issue não define o formato dos dados e depende de
combinar com o front (por exemplo atrasados por setor ou por faixa de dias). Quando entrar, a rota também precisa vir antes de `/:lista`.
