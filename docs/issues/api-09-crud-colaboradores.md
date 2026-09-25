# API-09 — CRUD de Colaboradores + identificação (registro de execução)

Issue: [#45 — API-09 — CRUD de Colaboradores + identificação](https://github.com/joaoaugusto-dev/PI-2026.2/issues/45)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-07 (concluída — reaproveita o padrão de validação/rotas)
Milestone: Sprint 3
Data da execução: 21–22/09/2026
Branch: `feat/api-09-crud-colaboradores`
PR: [#151](https://github.com/joaoaugusto-dev/PI-2026.2/pull/151)

## Objetivo

Resolver quem é o colaborador por matrícula ou nome (endpoint mais importante
do fluxo de retirada) e permitir cadastro rápido quando não achar, além do
CRUD completo para a tela de colaboradores.

## Nota de escopo confirmada antes de implementar

A issue original pedia matrícula, **crachá** e **cargo** no cadastro rápido.
Ambos os campos foram descartados antes de começar, confirmado com o
responsável do produto:

- **`codigo_cracha` não existe:** o crachá é fisicamente a própria matrícula
  (decisão já registrada em `0001_init.sql`/Regra 5 do `CLAUDE.md`, revisão
  pós visita técnica DB-02). O `/identificar` testa matrícula exata primeiro
  e cobre os dois casos.
- **`cargo` não faz parte do modelo** e não foi criado. O cadastro rápido usa
  só `nome`, `matricula` e `setorId`.

Duas decisões de método/autorização, também confirmadas antes de codar:

- **Edição por `PATCH`, não `PUT`** (a issue original pedia `PUT`) — mantém a
  convenção já adotada em ferramentas na API-07.
- **`GET /identificar` restrito ao perfil `almoxarife`** — é quem opera a
  retirada; o perfil consulta só lê disponibilidade (Regra 8 do `CLAUDE.md`).

## O que foi feito

**Migration** (`api/db/migrations/0003_colaboradores_identificacao.sql`):
- `colaboradores.criado_por` (FK `usuarios`, `ON DELETE SET NULL`, nullable),
  preenchido a partir do JWT no cadastro (Regra 6).
- Função `f_unaccent(text)`, wrapper `IMMUTABLE` de `unaccent()` — o Postgres
  exige função imutável para indexar uma expressão.
- Índice `idx_colaboradores_nome_trgm` (GIN, `gin_trgm_ops`) sobre
  `f_unaccent(lower(nome))`, para a busca por nome tolerante a acento e erro
  de digitação.

> Essas três mudanças nasceram dentro de `0001_init.sql` e foram **movidas**
> para o arquivo `0003` depois que a API-08 (mergeada em paralelo, PR #148)
> introduziu o rastreamento de migrations já aplicadas via tabela
> `schema_migrations` — editar `0001` deixaria de ter efeito em qualquer
> banco onde ele já tivesse sido marcado como aplicado. Numerada `0003`
> porque a API-08 já tinha ocupado a `0002`.

**Seed** (`api/db/seed.sql`): ampliado de 20 para 50 colaboradores
(`MAT001`–`MAT050`), para dar massa realista ao teste de desempenho da busca
por nome.

**Validator** (`colaboradorValidator.ts`): `identificarColaboradorQuerySchema`
(`termo` obrigatório) novo; `criarColaboradorSchema`/`editarColaboradorSchema`/
`listarColaboradoresQuerySchema` já estavam no escopo final, só documentados.

**Rotas novas** em
[`colaboradorRoutes.ts`](../../api/src/routes/v1/colaboradorRoutes.ts) /
[`colaboradorController.ts`](../../api/src/controllers/colaboradorController.ts) /
[`colaboradorService.ts`](../../api/src/services/colaboradorService.ts), registradas
em `routes/v1/index.ts`:

- `GET /v1/colaboradores/identificar?termo=`: matrícula exata e, se não
  achar, nome via `unaccent`/`pg_trgm`. `404 COLABORADOR_NOT_FOUND` se não
  encontrar nada. Registrada **antes** de `/:id` para não colidir com o
  parâmetro numérico.
- `POST /v1/colaboradores`: cadastro rápido; `criado_por` vem sempre de
  `req.usuario.id` (JWT), nunca do corpo — o schema Zod nem aceita esse
  campo, então uma tentativa de forjá-lo no corpo é descartada em silêncio.
  Matrícula duplicada cai no índice único e vira `409 DUPLICATE_ENTRY` pelo
  `errorHandler` global (Postgres `23505`).
- `PATCH /v1/colaboradores/:id`: atualização parcial (nome/matrícula/setor).
- `DELETE /v1/colaboradores/:id`: inativação lógica (`ativo = false`), nunca
  apaga o registro.
- `GET /v1/colaboradores`: busca (`q`, `setorId`) e paginação no envelope
  `{ data, meta }`.

Todas as rotas exigem `authenticate` + `authorize('almoxarife')`.

## Cobertura de testes

`colaboradorRoutes.test.ts` (Vitest + Supertest, mesmo padrão de
`auth.test.ts`/`feriado.test.ts`), 19 testes novos cobrindo sucesso e erro de
cada rota:

```
$ npm test

 Test Files  3 passed (3)   # colaboradorRoutes + ferramentaService + ferramentaValidation
      Tests  56 passed (56)
```

Casos cobertos: matrícula exata, nome sem acento (critério de aceite: "joao
augusto" acha "João Augusto"), `404` do `/identificar`, `400` sem `termo`,
`401` sem token, `403` do perfil `consulta` em `/identificar`, `criado_por`
ignorando um valor forjado no corpo, `409` de matrícula duplicada, `PATCH`/
`DELETE` com sucesso e `404`, e listagem paginada.

Dados de teste (prefixo `ZZTESTE_API09_`) removidos no `afterAll` e
conferidos zerados no banco após a execução.

## Medição de desempenho (item "se sobrar tempo" da issue)

Com os 50 colaboradores do seed, a busca por nome leva **~1ms** em média
(20 execuções, round-trip incluso). `EXPLAIN ANALYZE` mostrou o planner do
Postgres preferindo `Seq Scan` a `idx_colaboradores_nome_trgm` nesse volume —
comportamento esperado para tabela pequena, não sinal de índice mal
configurado. Forçando o uso do índice (`SET enable_seqscan = off`), o tempo
de execução ficou equivalente (~0.5ms) e confirmou que o índice é válido.
**Índice mantido como está**, sem necessidade de revisão. Detalhes no
comentário de `colaboradorService.identificar`.

## Validação manual de ponta a ponta

Rodada duas vezes contra o servidor real: uma vez logo após a implementação
(reproduzindo a coleção via `curl`) e outra vez no próprio Insomnia
(Collection Runner), com o seed populado:

```
GET  /v1/colaboradores/identificar?termo=MAT001            -> 200
GET  /v1/colaboradores/identificar?termo=jose carlos ...   -> 200 (sem acento)
GET  /v1/colaboradores/identificar?termo=ZZINEXISTENTE     -> 404 COLABORADOR_NOT_FOUND
GET  /v1/colaboradores/identificar                         -> 400 VALIDATION_ERROR (sem termo)
GET  /v1/colaboradores/identificar (sem token)              -> 401 TOKEN_NOT_PROVIDED
GET  /v1/colaboradores/identificar (token consulta)          -> 403 ACCESS_DENIED
POST /v1/colaboradores {nome,matricula,setorId}              -> 201, criado_por = id do JWT
POST /v1/colaboradores (matricula repetida)                  -> 409 DUPLICATE_ENTRY
POST /v1/colaboradores {criadoPor: 999999, ...}               -> 201, criado_por != 999999
PATCH /v1/colaboradores/:id {nome}                            -> 200
DELETE /v1/colaboradores/:id                                  -> 200, ativo=false
GET  /v1/colaboradores/:id (após o DELETE)                    -> 404 COLABORADOR_NOT_FOUND
GET  /v1/colaboradores?q=...&page=1&limit=5                   -> 200, envelope { data, meta }
```

Coleção Insomnia rodada pelo Collection Runner: **56/56 asserções passando**
(25 requisições).

## Documentação atualizada

- [`docs/backend/api.md`](../backend/api.md): linha nova para `GET
  /identificar` e correção de `PUT` para `PATCH` na edição de colaboradores.
- [`docs/backend/arquitetura.md`](../backend/arquitetura.md): nota sobre
  `unaccent`/`pg_trgm` e o índice GIN usados na identificação.
- [`docs/banco-de-dados/dicionario-de-dados.md`](../banco-de-dados/dicionario-de-dados.md),
  [`der.dbml`](../banco-de-dados/der.dbml) e
  [`der-documentacao.md`](../banco-de-dados/der-documentacao.md):
  `criado_por`, o índice de nome e a migration `0003` documentados.
- [`api/README.md`](../../api/README.md): árvore de pastas com os arquivos
  novos e a regra de segurança sobre campos de autoria citando `criado_por`.
- [`docs/insomnia/soufer-tools-colaboradores.json`](../insomnia/soufer-tools-colaboradores.json):
  coleção nova, 25 requisições em 7 pastas numeradas (autenticação,
  identificação, cadastro rápido ponta a ponta, conflitos 409, autorização
  401/403, validação 400, 404), sem tags de resposta salvas.
- Swagger (JSDoc): já nasceu completo junto com as rotas — auditado
  importando o `swaggerSpec` gerado, as 6 operações de `/colaboradores`
  (mesma cobertura das 9 de `/ferramentas`) aparecem com `summary` e os
  códigos de resposta corretos. Nenhuma rota nova precisou ser adicionada.

## Impacto do merge paralelo da API-08 (PR #148)

O `main` avançou durante o desenvolvimento desta issue com o merge da API-08
(CRUD de setores/categorias/atividades + `/v1/opcoes`). Ao sincronizar:

- **Conflito de merge** em `routes/v1/index.ts` (as duas branches registraram
  rotas novas no mesmo ponto do arquivo) — resolvido mantendo as duas listas.
- **Convenção de migrations mudou** (ver seção "O que foi feito" acima) — as
  mudanças de colaboradores foram realocadas de `0001` para `0003`.
  Validado simulando o cenário de risco: banco com `0001`+`0002` já
  aplicados e sem a `0003` registrada em `schema_migrations` — rodar
  `db:migrate` aplicou só a `0003`, como esperado.
- **Texto desatualizado corrigido:** o JWT do almoxarife passou de 8 horas
  para 7 dias em outro PR (API-03, #147) mergeado em paralelo; o README da
  API e a coleção Insomnia de colaboradores citavam o valor antigo.
- **Achado não relacionado a esta issue, só reportado:** depois do merge, 46
  testes de `setor.test.ts`/`categoria.test.ts`/`atividade.test.ts`/
  `opcoes.test.ts` passaram a falhar com `401` num banco de dev já
  resseedado várias vezes — eles fixam `usuario id: 1` no token de teste, e
  o middleware `authenticate` (mudança do PR #147) passou a revalidar
  `ativo` contra a tabela `usuarios` a cada requisição; como o `SERIAL` de
  `usuarios` já tinha avançado, o id 1 não existe mais. Não é causado por
  esta issue nem por esta branch — os arquivos de teste não foram alterados.

## Pendências

- Aprovação de PR por outro integrante da equipe (item de revisão do DoD).
- Nenhuma pendência de escopo: os 7 pontos do checklist da issue (banco,
  validator, API, testes, documentação, validação/entrega e a medição de
  desempenho do "se sobrar tempo") estão concluídos.
