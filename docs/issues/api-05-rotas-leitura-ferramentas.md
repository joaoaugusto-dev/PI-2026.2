# API-05 — Rotas de leitura de ferramentas (registro de execução)

Issue: [#40 — API-05 — Rotas de leitura de ferramentas](https://github.com/joaoaugusto-dev/PI-2026.2/issues/40)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-03, API-04, DB-08 (todas concluídas)
Milestone: Sprint 2
Data da execução: 15/09/2026
PR: [`feat/api-05-rotas-leitura-ferramentas` (#137)](https://github.com/joaoaugusto-dev/PI-2026.2/pull/137)

## Objetivo

O front consegue listar e detalhar ferramentas reais: listagem paginada e
filtrável, detalhe por ID, busca por código de identificação (base para a
leitura de código de barras) e histórico de empréstimos/ocorrências por
ferramenta.

## O que já estava pronto antes desta execução

`GET /v1/ferramentas` (paginação + filtro por `status`), `GET
/v1/ferramentas/:id` e `POST /v1/ferramentas` já existiam em
[`api/src/routes/v1/ferramentaRoutes.ts`](../api/src/routes/v1/ferramentaRoutes.ts),
com o `authorize('manutencao')` já aplicado no `POST`.

## Divergência sinalizada na issue

O passo 1 da issue pedia o filtro `categoria_id`, mas essa entidade não
existe mais no schema atual: a migration `0001_init.sql` renomeou
"categorias" para `grupos_ferramentas` + `subgrupos_ferramentas` (jogo de
chaves — ver comentário no topo do arquivo). O filtro foi implementado como
`grupoId`, equivalente vigente. Mesmo tipo de divergência já sinalizado nas
issues DB-06, DB-07, DB-08, API-02 e API-03. Nota deixada na issue #40
explicando o ponto antes de começar a implementação.

## O que foi feito nesta rodada

**Rotas novas/completadas** em
[`ferramentaRoutes.ts`](../api/src/routes/v1/ferramentaRoutes.ts),
[`ferramentaController.ts`](../api/src/controllers/ferramentaController.ts),
[`ferramentaService.ts`](../api/src/services/ferramentaService.ts) e
[`ferramentaValidator.ts`](../api/src/validators/ferramentaValidator.ts):

- `GET /v1/ferramentas`: filtros `q` (busca textual em nome/descrição/marca/
  modelo via `ILIKE`), `status`, `grupoId` e ordenação opcional `?sort=nome`
  ou `?sort=status` (item "se sobrar tempo" da issue), com desempate por `id`
  para a paginação não repetir/pular registros entre páginas.
- `GET /v1/ferramentas/por-codigo/:codigo`: nova rota, busca pelo
  `codigo_identificacao` (SMALLINT 1-9999) — usada mais adiante pela leitura
  de código de barras (issue FE-09).
- `GET /v1/ferramentas/:id/historico`: nova rota, junta `emprestimos` (via a
  view `vw_emprestimos_detalhe`) e `ocorrencias` da ferramenta, mais recentes
  primeiro.

**Correções aplicadas depois da revisão de código do PR #137:**

- **Segurança:** as 4 rotas GET de `/v1/ferramentas` estavam protegidas só
  por `authenticate`, sem `authorize('manutencao')`. Isso permitia que um
  token de `consulta` (sessão de quiosque de 15 min, sem senha — Regra 8 do
  `CLAUDE.md`) acessasse dados que vão muito além de "só leitura de
  disponibilidade": nome/matrícula de colaboradores, observações de retirada/
  devolução e custos de ocorrências no histórico. Adicionado
  `authorize('manutencao')` nas 4 rotas, alinhado com a classificação já
  documentada em [`docs/backend/api.md`](backend/api.md) (recurso
  `/v1/ferramentas` é exclusivo da manutenção; o perfil consulta usa
  `/v1/consulta/ferramentas`).
- **Paginação instável:** `ORDER BY status` sozinho não é determinístico
  entre páginas, já que a coluna só tem 3 valores possíveis. Passou a ser
  `ORDER BY ${ordenacao}, id`.
- **Documentação desatualizada:** `docs/backend/api.md` ainda listava o path
  antigo `/v1/ferramentas/porcodigo/:codigo` (sem hífen) e não citava
  `:id`/`:id/historico`. Corrigido.
- **Escape de coringas no `q`:** o filtro de busca textual concatenava o
  input do usuário direto no padrão `ILIKE` (`'%' || q || '%'`). Não era uma
  falha de segurança (a query já era parametrizada), mas `%`/`_` digitados
  pelo usuário eram interpretados como coringa. Adicionado escape desses
  caracteres (e de `\`) antes de montar o padrão.
- **Cobertura de testes:** criada
  [`api/src/tests/ferramentaService.test.ts`](../api/src/tests/ferramentaService.test.ts)
  com 12 testes cobrindo `listar` (q, status, grupoId, paginação estável com
  `sort=status`), `buscarPorId`, `buscarPorCodigo` e `historico` (sucesso e
  `NotFoundError`). Os dados usados são criados e removidos pelo próprio
  arquivo de teste (prefixo `ZZTESTE_API05_`), sem depender do conteúdo do
  seed.

```
$ npm test

 Test Files  6 passed (6)
      Tests  58 passed (58)
```

`tsc --noEmit` também rodado sem erros após as mudanças.

Testado manualmente (`npm run dev` local, contra o banco `soufer_dev` com o
seed real) o caso de sucesso e os casos de erro exigidos pelo DoD (Seção 6):

```
[manutenção]
GET /v1/ferramentas?q=Makita&sort=nome&limit=5           -> 200, 3 resultados (Makita)
GET /v1/ferramentas/5                                     -> 200, ferramenta encontrada
GET /v1/ferramentas/por-codigo/2                          -> 200, mesma ferramenta do id 5
GET /v1/ferramentas/por-codigo/9999                       -> 404 FERRAMENTA_NOT_FOUND
GET /v1/ferramentas/por-codigo/abc                        -> 400 VALIDATION_ERROR
GET /v1/ferramentas/42/historico                          -> 200, 1 emprestimo (situacao: atrasado)
GET /v1/ferramentas/999999/historico                      -> 404 FERRAMENTA_NOT_FOUND
GET /v1/ferramentas (sem token)                           -> 401 TOKEN_NOT_PROVIDED

[consulta - sessão de quiosque via matrícula]
GET /v1/ferramentas                                        -> 403 ACCESS_DENIED
GET /v1/ferramentas/5/historico                            -> 403 ACCESS_DENIED
GET /v1/ferramentas/por-codigo/2                           -> 403 ACCESS_DENIED

[paginação sort=status, limit=5]
page=1 -> ids [4, 5, 6, 7, 9]
page=2 -> ids [10, 11, 12, 16, 17]   (sem sobreposição com a página 1)
```

## Issue no GitHub

O corpo original da issue #40 não foi alterado (fica como registro histórico
do que foi pedido). As atualizações foram feitas via comentário na issue
[#40](https://github.com/joaoaugusto-dev/PI-2026.2/issues/40):

- Primeiro comentário: sinalizando a divergência do `categoria_id` e os
  próximos passos antes de começar a implementação.
- Segundo comentário (a fazer): registrando a conclusão, as correções da
  revisão de código e o link para este documento e para o PR #137.

## Pendências

- Aprovação de PR por outro integrante da equipe (item de revisão do DoD).
- Nenhuma pendência de escopo: as 4 rotas da issue estão implementadas e
  testadas, incluindo o item "se sobrar tempo" (`?sort=`).
