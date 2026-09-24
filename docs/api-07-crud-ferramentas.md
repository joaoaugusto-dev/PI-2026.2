# API-07 — CRUD completo de Ferramentas (registro de execução)

Issue: [#43 — API-07 — CRUD completo de Ferramentas](https://github.com/joaoaugusto-dev/PI-2026.2/issues/43)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-05 (concluída)
Milestone: Sprint 3
Data da execução: 16/09/2026
Branch: `feat/api-07-crud-ferramentas`
PR: a abrir

## Objetivo

Cadastrar, editar, mudar status e baixar uma ferramenta pela API — as 5 rotas
descritas na issue.

## Divergência sinalizada na issue

A issue nomeia o campo gerado no cadastro como `codigo_patrimonio`. Esse nome
foi abandonado na revisão pós visita técnica (ver comentário no topo de
`api/db/migrations/0001_init.sql`): o schema atual usa `codigo_identificacao`,
numérico de 4 dígitos (1-9999), gerado por trigger e reaproveitável quando a
ferramenta é baixada. Mesmo tipo de divergência já sinalizado nas issues DB-06,
DB-07, DB-08, API-02, API-03 e API-05. Confirmado com o responsável do produto
antes de implementar: seguir `codigo_identificacao`.

`POST /v1/ferramentas` já existia (entrou junto da API-05); as outras 4 rotas
eram novas.

## Decisões de negócio confirmadas antes de implementar

- **DELETE (baixa lógica):** só é permitido dar baixa numa ferramenta depois
  que o empréstimo em aberto (se houver) for finalizado — inclusive quando
  finalizado como avaria/perda (a devolução "fecha" o empréstimo mesmo que a
  ferramenta não volte fisicamente à manutenção). Enquanto existir uma linha
  em `emprestimos` com `data_devolucao IS NULL` apontando pra ferramenta, a
  API responde `409 FERRAMENTA_COM_EMPRESTIMO_ABERTO`.
- **PATCH /disponibilizar:** grava o registro **tanto** na tabela `auditoria`
  genérica (dados_anteriores/dados_novos + usuário do JWT) **quanto** resolve
  (`status = 'resolvida'`, `resolvida_por`, `data_resolucao`) qualquer
  ocorrência ainda `aberta`/`em_reparo`/`cobrada` associada à ferramenta.

## O que foi feito

**Migration** (`api/db/migrations/0001_init.sql`): nova coluna
`ferramentas.etiqueta_impressa_em` (TIMESTAMPTZ, nullable) — não existia
suporte a essa marcação no schema anterior.

**Rotas novas** em
[`ferramentaRoutes.ts`](../api/src/routes/v1/ferramentaRoutes.ts) /
[`ferramentaController.ts`](../api/src/controllers/ferramentaController.ts) /
[`ferramentaService.ts`](../api/src/services/ferramentaService.ts) /
[`ferramentaValidator.ts`](../api/src/validators/ferramentaValidator.ts):

- `PATCH /v1/ferramentas/:id`: atualização parcial dos campos editáveis (nome,
  descricao, marca, modelo, grupoId, subgrupoId, setorId, localizacao) — pelo
  menos um campo é obrigatório. `status`, `codigo_identificacao` e `ativo`
  continuam fora daqui (têm ações próprias).
- `PATCH /v1/ferramentas/:id/etiqueta-impressa`: marca
  `etiqueta_impressa_em = NOW()`, sem side-effect no status.
- `PATCH /v1/ferramentas/:id/disponibilizar`: exige status atual
  `indisponivel` (senão `409 FERRAMENTA_JA_DISPONIVEL`); numa única
  transação, zera `motivo_indisponivel`, grava a auditoria e resolve as
  ocorrências pendentes da ferramenta.
- `DELETE /v1/ferramentas/:id`: baixa lógica (`ativo = false`, `status =
  'indisponivel'`, `motivo_indisponivel = 'baixada'`); bloqueia com `409
  FERRAMENTA_COM_EMPRESTIMO_ABERTO` se houver empréstimo aberto.

Todas as rotas usam `authenticate` + `authorize('manutencao')`, seguindo o
padrão já estabelecido nas rotas de leitura (API-05) — perfil `consulta` não
tem acesso.

**Refatoração pequena:** extraída a constante `COLUNAS_FERRAMENTA` no service
(lista de colunas repetida em quase todo `SELECT`/`RETURNING` de
`ferramentas`), já que as novas respostas passaram a expor
`motivo_indisponivel` e `etiqueta_impressa_em` também nas rotas de leitura.

**Cobertura de testes:** os testes de `atualizar`, `marcarEtiquetaImpressa`,
`disponibilizar` e `baixar` foram colocados no mesmo arquivo dos testes de
leitura (`ferramentaService.test.ts`), em vez de um arquivo separado. Motivo:
a trigger `fn_gera_codigo_identificacao` (`SELECT MIN` + `INSERT`, ver
migration) não é atômica sob concorrência — dois arquivos de teste inserindo
em `ferramentas` ao mesmo tempo, em workers diferentes do Vitest, geravam uma
violação esporádica de `uq_ferramenta_codigo_ativo`. Testes do mesmo arquivo
rodam sequencialmente, o que evita a corrida sem mexer na trigger (fora do
escopo desta issue — ver nota abaixo para a issue).

```
$ npm test

 Test Files  6 passed (6)
      Tests  69 passed (69)
```

(rodado 3x seguidas para confirmar que a corrida foi eliminada; `tsc --noEmit`
também sem erros.)

Testado manualmente (`npm run dev` local, banco `soufer_dev` com seed real),
sucesso e os casos de erro exigidos pelo DoD (Seção 6 do `CLAUDE.md`):

```
PATCH /v1/ferramentas/48 {"localizacao":"..."}          -> 200
PATCH /v1/ferramentas/999999 {"localizacao":"..."}       -> 404 FERRAMENTA_NOT_FOUND
PATCH /v1/ferramentas/48 {}                              -> 400 VALIDATION_ERROR (nenhum campo)

PATCH /v1/ferramentas/48/etiqueta-impressa             -> 200, etiqueta_impressa_em preenchido
PATCH /v1/ferramentas/999999/etiqueta-impressa         -> 404 FERRAMENTA_NOT_FOUND

PATCH /v1/ferramentas/48/disponibilizar (indisponivel) -> 200, status=disponivel + linha em auditoria
PATCH /v1/ferramentas/48/disponibilizar (de novo)      -> 409 FERRAMENTA_JA_DISPONIVEL
PATCH /v1/ferramentas/999999/disponibilizar            -> 404 FERRAMENTA_NOT_FOUND

DELETE /v1/ferramentas/13 (emprestimo em aberto)       -> 409 FERRAMENTA_COM_EMPRESTIMO_ABERTO
DELETE /v1/ferramentas/48                              -> 200, ativo=false, motivo_indisponivel=baixada
DELETE /v1/ferramentas/999999                          -> 404 FERRAMENTA_NOT_FOUND
```

Dados de seed alterados durante o teste manual (ferramenta 48) foram
restaurados ao estado original (`ativo=true`, `status='disponivel'`,
`motivo_indisponivel=NULL`) ao final.

## Documentação atualizada

- [`docs/backend/api.md`](backend/api.md): adicionadas as linhas de
  `PATCH .../etiqueta-impressa` e `DELETE /v1/ferramentas/:id` na tabela de
  endpoints (o `PATCH /v1/ferramentas/:id`, antigo `PUT`, e o `PATCH .../disponibilizar` já constavam).
- [`api/docs/insomnia-collection.json`](../api/docs/insomnia-collection.json):
  requests de sucesso e erro para as 4 rotas novas.

## Pendências

- Aprovação de PR por outro integrante da equipe (item de revisão do DoD).
- Nenhuma pendência de escopo: as 5 rotas da issue estão implementadas e
  testadas (incluindo os casos de erro pedidos: disponibilizar ferramenta já
  disponível e baixar ferramenta com empréstimo em aberto).
