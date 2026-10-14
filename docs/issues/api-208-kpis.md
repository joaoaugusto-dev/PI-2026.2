# API — KPIs de uso, avarias e perdas com filtros de/ate (registro de execução)

Issue: [#208 — API — KPIs de uso, avarias e perdas com filtros de/ate](https://github.com/joaoaugusto-dev/PI-2026.2/issues/208)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Milestone: Sprint 7
Data da execução: 14/10/2026
Branch: `feat/api-208-kpis-uso-avarias-perdas` (criada a partir da `development`, um commit por etapa)
PR: a abrir

## Objetivo

A gestão consegue responder, em qualquer janela de tempo, perguntas como "qual ferramenta mais saiu no mês?",
"quais categorias mais se avariam?" e "quais mais se extraviam?", com onze KPIs em `GET /v1/kpis/*` (os nove do MVP e, depois, colaboradores e setores que mais retiram). Todo KPI de
período recebe `de` e `ate` (`AAAA-MM-DD`); não existe atalho de semana, mês, trimestre ou ano, o front calcula o intervalo.

## Decisões

| Ponto | Decisão | Motivo |
|---|---|---|
| Filtro de período | `de` e `ate` obrigatórios, inclusivos, calendário de Brasília, até 366 dias | Pedido da issue. O servidor na AWS roda em UTC: uma retirada às 23:30 de 31/03 em Brasília já é 01/04 em UTC, e o KPI do mês tem que contá-la em março |
| Janela máxima | 366 dias | Cobre um ano bissexto; evita consulta sem limite. `de = ate` (um dia) é aceito |
| Categoria | `grupos_ferramentas` (o `grupo_id` da ferramenta) | É o que a API chama de categoria nas rotas `/v1/categorias` |
| Qual data conta | Retiradas: `data_retirada`. Devoluções: `data_devolucao`. Ocorrências: `created_at` | Cada KPI usa só o seu campo. Um empréstimo retirado em março e devolvido em abril entra como retirada de março e devolução de abril |
| Avarias e perdas | Vêm de `ocorrencias` (`tipo` `AVARIA` / `PERDA`), abertas pelo trigger na devolução (Regra 3) | É a fonte de verdade das tratativas. Foi mantido "perda" porque o banco ainda usa esse nome (as issues #180 e #181 tratam do renome para "extravio") |
| Taxa de avaria | Devoluções com `condicao_devolucao = 'avaria'` ÷ devoluções feitas no período | O denominador é o que foi devolvido no período, não o que foi retirado, porque a condição só existe na devolução |
| Acesso | `manutencao` e `admin`; `consulta` recebe `403` | Regra 8: o admin faz tudo o que a manutenção faz, e a consulta nunca vê histórico |
| Dados sensíveis | Nenhum KPI devolve valores. Os dois de pessoas e setores (adicionados depois do MVP) são só do `admin` | Ranking de colaboradores expõe quem retira mais e a matrícula, então fica restrito ao admin, e o de setores acompanha para manter os dois juntos |
| Setor | Setor de destino da retirada (`setor_destino_id`) | É para onde a ferramenta foi; o setor de cadastro do colaborador pode ser outro |
| Coerência dos números | `indisponiveis`, `emprestimos-abertos` e `evolucao` usam o `emSnapshot` do dashboard (`REPEATABLE READ` somente leitura) | Totais e linhas da mesma resposta saem do mesmo retrato do banco |
| Variação percentual | `null` quando o período anterior é 0 | Não existe percentual sem base de comparação; mostrar 0% ou infinito enganaria |

## O que foi feito

Commits, na ordem (um por etapa):

1. `feat(api-208): validar filtros de/ate, limit, agrupar e granularidade dos KPIs` — [kpiValidator.ts](../../api/src/validators/kpiValidator.ts).
   Schemas Zod: `de`/`ate` com formato e data de calendário real (`2001-02-30` e `2001-13-01` são rejeitadas, não
   corrigidas), `de <= ate`, janela de até 366 dias, `limit` (padrão 10, máximo 50), `agrupar` (`categoria` por padrão) e
   `granularidade` (`dia` por padrão). Helpers `diasNoPeriodo` e `somarDias`.
2. `feat(api-208): consultas agregadas dos KPIs e índices de data` — [kpiService.ts](../../api/src/services/kpiService.ts) e
   [0012_indices_kpis.sql](../../api/db/migrations/0012_indices_kpis.sql).
3. `feat(api-208): rotas GET /v1/kpis/* para manutenção e admin` — [kpiController.ts](../../api/src/controllers/kpiController.ts),
   [kpiRoutes.ts](../../api/src/routes/v1/kpiRoutes.ts) (com o Swagger de cada rota) e o registro em `routes/v1/index.ts`.
4. `test(api-208): cobrir KPIs, filtros de/ate e permissões` — [kpi.test.ts](../../api/src/tests/kpi.test.ts).
5. `docs(api-208): documentar os KPIs de gestão` — este arquivo, `docs/backend/api.md` e `docs/backend/arquitetura.md`.
6. `feat(api-208): KPIs de colaboradores e setores que mais retiram` — dois endpoints a mais, só `admin`, com testes e documentação atualizada.

### Endpoints

| KPI | Endpoint | Período |
|---|---|---|
| Ferramentas mais retiradas | `GET /v1/kpis/ferramentas-mais-retiradas` | `de`/`ate` + `limit` |
| Categorias mais utilizadas | `GET /v1/kpis/categorias-mais-utilizadas` | `de`/`ate` + `limit` |
| Tempo médio de posse | `GET /v1/kpis/tempo-medio-posse?agrupar=ferramenta\|categoria` | `de`/`ate` + `limit` |
| Avarias por categoria | `GET /v1/kpis/avarias-por-categoria` | `de`/`ate` |
| Perdas por categoria | `GET /v1/kpis/perdas-por-categoria` | `de`/`ate` |
| Taxa de avaria | `GET /v1/kpis/taxa-avaria?agrupar=ferramenta\|categoria` | `de`/`ate` + `limit` |
| Ferramentas indisponíveis agora | `GET /v1/kpis/indisponiveis` | instantâneo |
| Empréstimos abertos agora | `GET /v1/kpis/emprestimos-abertos` | instantâneo (`limit` dos mais antigos, padrão 5) |
| Evolução temporal | `GET /v1/kpis/evolucao?granularidade=dia\|semana\|mes` | `de`/`ate` |
| Colaboradores que mais retiram (só admin) | `GET /v1/kpis/colaboradores-que-mais-retiram` | `de`/`ate` + `limit` |
| Setores que mais retiram (só admin) | `GET /v1/kpis/setores-que-mais-retiram` | `de`/`ate` + `limit` |

Contrato detalhado (campos, exemplos e regras de cálculo): [docs/backend/api.md](../backend/api.md#kpis-de-gestão-get-v1kpis).

### Exemplos

```
GET /v1/kpis/ferramentas-mais-retiradas?de=2026-10-01&ate=2026-10-31&limit=5
GET /v1/kpis/avarias-por-categoria?de=2026-07-01&ate=2026-09-30        # trimestre
GET /v1/kpis/taxa-avaria?de=2026-01-01&ate=2026-12-31&agrupar=ferramenta
GET /v1/kpis/evolucao?de=2026-10-01&ate=2026-10-31&granularidade=semana
GET /v1/kpis/emprestimos-abertos?limit=10
```

Erro de filtro (`400`):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Erro de validação nos dados enviados",
             "details": [ { "field": "ate", "message": "obrigatório (AAAA-MM-DD)", "rule": "invalid_type" } ] } }
```

### Evolução

`serie` traz um item por dia, semana (começa na segunda) ou mês, com zero nos baldes sem movimento, para o gráfico não
ter buracos. O primeiro e o último balde de semana ou mês podem ser parciais e só contam o que cai dentro de `de`/`ate`.
`periodo_anterior` é a janela imediatamente antes de `de`, com o mesmo número de dias (`2001-03-01` a `2001-03-31`
compara com `2001-01-29` a `2001-02-28`).

### Índices

A issue pedia avaliar índices. `emprestimos(data_retirada)` já existia (migration `0011`). A migration `0012` adiciona:

- `idx_emprestimos_data_devolucao` em `emprestimos (data_devolucao) WHERE data_devolucao IS NOT NULL`: parcial, porque
  empréstimo aberto nunca entra nas consultas por devolução e o índice fica menor.
- `idx_ocorrencias_created_at` em `ocorrencias (created_at)`.

Os filtros de data são escritos como `coluna >= início AND coluna < fim` (e não `coluna::date BETWEEN ...`), justamente
para o Postgres poder usar esses índices. Com o volume atual do banco de desenvolvimento o planejador pode preferir varredura
sequencial; os índices passam a valer quando a tabela crescer. A migration já foi aplicada no banco de desenvolvimento
(`npm run db:migrate`); em produção entra pelo fluxo normal de migrations.

## Testes

[kpi.test.ts](../../api/src/tests/kpi.test.ts), 27 casos, Vitest + Supertest. Os dados são criados pelo próprio teste em
março de 2001 (categoria e ferramentas com o prefixo `ZZTESTE_KPI208_`, apagadas no `afterAll`), então as contas não
dependem do que já existe no banco nem de outros arquivos de teste:

- **Acesso:** `401` sem token e `403` para `consulta` nas nove rotas do MVP; `manutencao` e `admin` recebem `200`.
- **Filtros:** `400` sem `de`, sem `ate` ou sem os dois, em toda rota de período; formato errado, data inexistente, `de`
  depois de `ate`, 367 dias, `limit` fora de 1–50, `agrupar` e `granularidade` desconhecidos. `de = ate` e 366 dias valem.
- **Cálculo, com valores conferidos à mão:** ranking (3 retiradas × 2, com a retirada de 31/03 às 23:30 contada em março),
  `limit`, categoria (5 retiradas), tempo médio (4h, 24h, 2h e 1h dão 7,75 h por categoria e 10 h e 1 h por ferramenta; a
  devolução de 01/04 fica de fora), avarias (2, a de 02/04 fica de fora), perdas (1), taxa (1/4 = 25% por categoria; 33,33% e
  0% por ferramenta).
- **Período vazio:** lista vazia, total 0 e sem divisão por zero.
- **Instantâneos:** indisponíveis (percentual coerente, soma dos motivos igual ao total) e abertos (o mais antigo vem
  primeiro, está atrasado e a resposta não traz colaborador nem matrícula).
- **Evolução:** 31 baldes diários, zeros, totais (5, 4 e 3), período anterior (`2001-01-29` a `2001-02-28`), variação
  (400%, 300% e `null` sem base), semanas começando na segunda, mês, e período sem movimento.

- **Colaboradores e setores (só admin):** `401` sem token, `403` para manutenção e consulta, `200` para admin; `400` sem `de`/`ate`, `de` depois de `ate` e `limit` 51; ordem e contagem (P com 4 retiradas e Q com 1; setor X com 3 e Y com 2, mostrando que o setor vem do destino da retirada, não do cadastro); `limit`; período vazio. Colaboradores e setores são criados no próprio teste (maio de 2002) e apagados no `afterAll`.

Resultado: `kpi.test.ts` 27/27 e `tsc --noEmit` sem erro. Na suíte completa, 36 arquivos passaram (377 testes) e
`ferramentaFoto.test.ts` falhou só no `afterAll`, com `EPERM` ao apagar a pasta temporária `C:\tmp\soufer-uploads-teste-*`
no Windows; os 9 testes dele passam e o erro não tem relação com os KPIs.

## Como testar à mão (Insomnia/Swagger)

1. Login em `/v1/auth/login` com um usuário `manutencao` ou `admin` e copiar o token.
2. Chamar os exemplos acima com `Authorization: Bearer <token>`; o Swagger fica em `/docs`, tag **KPIs**.
3. Casos de erro: tirar `ate`, mandar `de=2026-02-30`, mandar `de` depois de `ate` e usar um token de `consulta` (`403`).

## Documentação atualizada

- [docs/backend/api.md](../backend/api.md): linha na tabela de rotas e a seção "KPIs de gestão".
- [docs/backend/arquitetura.md](../backend/arquitetura.md): seção "KPIs de gestão (fluxo)".
- Swagger: comentários `@openapi` de cada rota em `kpiRoutes.ts`.

## Fora do escopo (se sobrar tempo)

Categorias reincidentes em avaria, vida útil até a primeira avaria, ferramentas ociosas, horários de pico, KPIs de
ocorrências por colaborador ou setor e custo estimado de ocorrências. Os que expõem valores precisam de uma decisão de
permissão antes.

## Pendências e observações

- Quando o renome de "perda" para "extravio" (#180/#181) entrar, `perdas-por-categoria` e o motivo `perda` em
  `indisponiveis` precisam acompanhar o nome novo.
- O front ainda não consome os KPIs; a tela de gestão é uma issue de front à parte.
- Dependências: não há dados de custo nem de data de aquisição usados nesta issue.
