# API-13 — Endpoints de ocorrências (registro de execução)

Issue: [#49 — API-13 — Endpoints de ocorrências](https://github.com/joaoaugusto-dev/PI-2026.2/issues/49)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-12 (concluída — PR #160 mergeado em `development` durante a
execução desta issue)
Milestone: Sprint 3
Data da execução: 29/09/2026
Branch: `feat/api-13-endpoints-ocorrencias` (criada inicialmente a partir da
`feat/api-12-registrar-devolucao`, quando a API-12 ainda estava em revisão;
recriada a partir da `development` depois que a API-12 foi mergeada, mantendo
os mesmos commits, um por etapa)
PR: [#161](https://github.com/joaoaugusto-dev/PI-2026.2/pull/161)

## Objetivo

O time de manutenção consegue acompanhar e fechar as tratativas de avaria/perda
só com `GET /v1/ocorrencias` (filtros) e `PATCH /v1/ocorrencias/:id`
(atualização de status, custo e observações).

## Decisões tomadas antes de implementar

Comecei esta issue com a API-12 ainda em revisão (PR aberto, sem aprovação).
Como a API-13 depende diretamente dela, criei a branch a partir da
`feat/api-12-registrar-devolucao` em vez da `development`, para não
reimplementar nada que já estava pronto. A PR da API-12 foi aprovada e
mergeada em `development` no meio da execução desta issue; recriei a branch a
partir da `development` atualizada assim que terminei, para o PR da API-13
não carregar de novo o diff da API-12.

Antes de escrever qualquer código, resolvi três pontos em que o texto da
issue original divergia do schema real ou deixava uma decisão em aberto:

- **Nome do campo de observação da resolução:** a issue pede
  `observacao_tratativa`, mas a coluna real da tabela `ocorrencias`
  (migration `0001_init.sql`) é `observacoes_resolucao`. Usei o nome real.
- **Escopo dos status no PATCH:** o enum `status_ocorrencia` tem 5 valores
  (`aberta`, `em_reparo`, `cobrada`, `resolvida`, `baixada`), mas o "pronto
  quando" da issue só cita o ciclo de 3 (`aberta → em_reparo → resolvida`).
  Decisão do time: o PATCH aceita os 5 valores, já que o banco já os suporta.
- **Ordem para a regra de "sem retrocesso":** como o PATCH aceita os 5
  status, precisava de uma hierarquia para decidir o que é "retroceder".
  Decisão do time: `aberta < em_reparo < cobrada < resolvida < baixada` —
  `cobrada` fica entre `em_reparo` e `resolvida` (cobra o custo do
  colaborador antes de fechar) e `baixada` é o estado final, podendo vir
  depois de `resolvida`.

Também decidi, ao revisar a camada de serviço, que reenviar
`status: "resolvida"` numa ocorrência que já está `resolvida` (por exemplo,
um PATCH só para ajustar `custoEstimado` depois de fechada) não deve
sobrescrever `resolvida_por`/`data_resolucao` — só a primeira transição de
entrada para `resolvida` grava esses campos.

## O que foi feito

- `GET /v1/ocorrencias` (perfil `manutencao`): filtros `status` (os 5 valores
  do enum), `colaboradorId` e `tipo` (`AVARIA`/`PERDA`, aceita minúsculo e
  normaliza para maiúsculo antes de filtrar), com paginação padrão
  (`page`/`limit`, mesmo formato de `GET /v1/ferramentas`).
- `PATCH /v1/ocorrencias/:id` (perfil `manutencao`): atualiza `status`,
  `custoEstimado` (número não negativo; vazio dá erro em vez de virar `0`) e
  `observacoesResolucao`, todos opcionais mas exigindo pelo menos um campo.
  `resolvida_por` e `data_resolucao` nunca vêm do corpo (Regra 6): são
  preenchidos a partir do usuário do JWT só na transição de entrada para
  `resolvida`.
- Validators Zod (`ocorrenciaValidator.ts`), service com transação e
  `SELECT ... FOR UPDATE` na linha da ocorrência (`ocorrenciaService.ts`,
  mesmo padrão de `emprestimoService.devolver`), controller e rotas com bloco
  `@openapi` (`ocorrenciaController.ts`, `ocorrenciaRoutes.ts`), registradas
  em `routes/v1/index.ts`.
- A listagem e a atualização devolvem a ocorrência com os nomes resolvidos
  (`ferramenta_nome`, `colaborador_nome`/`colaborador_matricula`,
  `registrada_por_nome`, `resolvida_por_nome`), via join com `ferramentas`,
  `colaboradores` e `usuarios` → `colaboradores` (ver "Bugs encontrados e
  corrigidos" abaixo — `usuarios` não guarda mais nome/email).
- Regra de "sem retrocesso" do status implementada na API (não no banco),
  comparando o rank do status atual com o de destino; tentativa de retroceder
  devolve `409 OCORRENCIA_TRANSICAO_INVALIDA`.
- **Extra ("se sobrar tempo") implementado:** ao marcar `resolvida` (só na
  transição de entrada, não em reenvios), o service confere o status atual da
  ferramenta e, se ainda estiver `indisponivel`, devolve
  `sugestao_disponibilizar_ferramenta_id` no response — o front decide se
  chama `PATCH /v1/ferramentas/:id/disponibilizar` em seguida; a API não
  chama essa rota por conta própria. Coberto por 2 testes novos em
  `ocorrenciaRoutes.test.ts` (sugestão aparece quando a ferramenta segue
  indisponível; não aparece em reenvio de `resolvida` nem em atualização de
  outro campo).

## Bugs encontrados e corrigidos durante a execução

A issue não pedia nenhuma mudança em código já existente, mas escrever os
testes e testar manualmente revelou 4 problemas reais, todos corrigidos antes
de fechar a issue:

1. **Retrocesso de status sobrescrevia `resolvida_por`/`data_resolucao`.**
   Encontrado numa revisão do próprio service, antes de rodar qualquer teste:
   reenviar `status: "resolvida"` numa ocorrência já resolvida (ex.: PATCH só
   para ajustar `custoEstimado`) sobrescrevia quem/quando resolveu
   originalmente. Corrigido condicionando a gravação à transição de entrada
   (`statusAtual !== 'resolvida'`).
2. **`custoEstimado` vazio virava `0` silenciosamente.** `z.coerce.number()`
   aplica `Number('')`, que em JavaScript vale `0` — então um campo vazio
   passava a validação como um custo válido em vez de dar erro. Corrigido com
   um `preprocess` que só converte string numérica de verdade; qualquer outra
   coisa (incluindo `""`) cai no erro de tipo.
3. **A API inteira quebrava com 500 em qualquer rota.** A descrição Swagger
   do PATCH tinha `(ex.: nenhum campo informado)`, e o `:` depois de "ex."
   quebrava o parser YAML do `swagger-jsdoc` (`Nested mappings are not
   allowed in compact mappings`), derrubando a inicialização do `app.js`
   inteiro em runtime — não só a documentação, a API toda parava de
   responder. Encontrado ao rodar os testes automatizados pela primeira vez
   (todos falhavam com 500). Corrigido reescrevendo a frase sem o `:`
   ambíguo.
4. **`ur.nome`/`us.nome` não existem.** A migration
   `0004_papel_admin_e_auto_cadastro.sql` (de uma issue anterior) já tinha
   removido as colunas `nome` e `email` de `usuarios`, ligando a conta a um
   colaborador por `usuarios.colaborador_id` — o nome agora vem de
   `colaboradores.nome`. O service ainda fazia `JOIN usuarios ur ON ur.id =
   o.registrada_por` e selecionava `ur.nome`, o que gerava
   `coluna ur.nome não existe`. Corrigido seguindo o mesmo padrão já usado em
   `vw_emprestimos_detalhe` (`usuarios → colaboradores`).

Também corrigi, à parte da issue, uma flakiness pré-existente e não
relacionada encontrada ao rodar a suíte completa: `opcoes.test.ts` falhava
sozinho porque uma execução anterior interrompida tinha deixado registros
`ZZTESTE_OPC_...` órfãos no banco (violando o índice único de nome). Limpei o
resíduo e blindei o `beforeAll` do teste para apagar qualquer resíduo do
prefixo antes de inserir, evitando que o problema volte numa próxima execução
interrompida.

## Testes

- Vitest + Supertest (`api/src/tests/ocorrenciaRoutes.test.ts`, 19 casos,
  banco real, prefixo `ZZTESTE_API13_`): listagem sem filtro e com cada
  filtro (`status`, `colaboradorId`, `tipo`, incluindo normalização de
  maiúsculo/minúsculo), o ciclo `aberta → em_reparo → resolvida`, a
  transição extra `cobrada → baixada`, retrocesso bloqueado (409), reenvio de
  `resolvida` sem sobrescrever `resolvida_por` (bug 1 acima), atualização
  parcial de campos, corpo vazio (400), `custoEstimado` vazio (400, bug 2
  acima), id inexistente (404), 401/403, a prova de que `resolvidaPor`
  enviado no corpo é ignorado (Regra 6), e os 2 casos da sugestão de
  disponibilizar (extra "se sobrar tempo" — aparece quando a ferramenta segue
  indisponível, não aparece em reenvio nem em atualização de outro campo).
- Testes manuais com a API local rodando de verdade (`curl`): os mesmos
  cenários de sucesso e erro das duas rotas, incluindo o ciclo completo de
  status e a verificação de que o Swagger spec parseia as duas rotas
  corretamente (bug 3 acima).
- Coleção do Insomnia (`docs/insomnia/soufer-tools-ocorrencias.json`, nova;
  tutorial em `docs/insomnia/teste-api-ocorrencias.md`): 7 pastas, 32
  requisições, 72 testes automáticos. Cria 2 ferramentas de teste
  (`ZZINSOMNIA`), retira e devolve cada uma com avaria (API-11/API-12) para
  abrir 2 ocorrências reais (A e B), localizadas pelo histórico de cada
  ferramenta (`GET /v1/ferramentas/:id/historico`, já que a listagem de
  ocorrências não filtra por ferramenta). Simulei a sequência inteira com um
  script descartável contra a API local antes de considerar pronta: as 32
  requisições e 72 testes passaram.
- Suíte completa da API: 249 testes, 19 arquivos, todos passando
  (sequencial; em paralelo há uma flakiness de infraestrutura pré-existente e
  não relacionada — o caso específico do `opcoes.test.ts` já foi corrigido
  durante esta issue, ver "Bugs encontrados" acima). `tsc --noEmit` sem
  erros. Não sobrou `console.log` no código.

## Documentação atualizada

- `docs/backend/api.md`: seção "Ocorrências (`GET` e `PATCH
  /v1/ocorrencias`)" — query string, corpo, sucesso e tabela de erros das
  duas rotas; atualizada a linha da tabela de endpoints e a nota em
  "Devolução de ferramenta" que dizia que a rota ainda não existia.
- `docs/backend/arquitetura.md`: seção "Ocorrências (fluxo)", documentando
  inclusive a mudança de `usuarios` → `colaboradores` para nomes (bug 4
  acima).
- `docs/insomnia/soufer-tools-ocorrencias.json` e
  `docs/insomnia/teste-api-ocorrencias.md`: coleção e tutorial novos.

## Pendências e observações

- A branch carrega 1 commit de documentação sem relação direta com a API-13
  (sobre o fluxo de aprovação de usuário/admin): a branch foi criada em cima
  de trabalho de documentação pendente de commit de uma sessão anterior, a
  pedido explícito, para não perder o trabalho.
- A limpeza da flakiness pré-existente em `opcoes.test.ts` também está nesta
  branch, num commit à parte: a falha foi encontrada rodando a suíte completa
  durante esta issue e fazia sentido corrigi-la ali mesmo, mesmo sem relação
  direta com ocorrências.
- Nada ficou pendente do pedido original da issue: as duas rotas, o ciclo
  mínimo e o extra "se sobrar tempo" foram implementados e testados.
