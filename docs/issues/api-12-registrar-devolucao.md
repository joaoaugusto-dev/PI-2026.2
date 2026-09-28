# API-12 — Registrar devolução (registro de execução)

Issue: [#48 — API-12 — Registrar devolução](https://github.com/joaoaugusto-dev/PI-2026.2/issues/48)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-11 (concluída — PR #159 mergeado em `development` durante a
execução desta issue)
Milestone: Sprint 3
Data da execução: 28/09/2026
Branch: `feat/api-12-registrar-devolucao` (criada a partir da
`feat/api-11-registrar-retirada`, quando a API-11 ainda estava em revisão)
PR: [#160](https://github.com/joaoaugusto-dev/PI-2026.2/pull/160)

## Objetivo

Fechar o ciclo do empréstimo: `PATCH /v1/emprestimos/:id/devolucao` recebe a
condição da devolução e, quando for o caso, deixa o banco abrir a ocorrência
automaticamente.

## Decisões tomadas antes de implementar

Comecei esta issue com a API-11 ainda em revisão (PR aberto, sem aprovação).
Como a API-12 depende diretamente dela, criei a branch a partir da
`feat/api-11-registrar-retirada` em vez da `develop`, para não reimplementar
nada que já estava pronto.

- **Campos em camelCase**, seguindo o mesmo padrão da API-11:
  `condicaoDevolucao` e `observacaoDevolucao` (a issue original usava
  `condicao_devolucao` e `observacao_devolucao`, em snake_case).
- **`usuario_devolucao_id` nunca vem do corpo** (Regra 6): é sempre o usuário
  do JWT, do mesmo jeito que a API-11 trata `usuario_retirada_id`.
- **A lógica de negócio fica no banco.** A API só valida o corpo, confere que
  o empréstimo existe e não foi devolvido ainda, e faz o `UPDATE`. Quem muda o
  status da ferramenta (`fn_sync_status_ferramenta`) e quem abre a ocorrência
  (`fn_abre_ocorrencia`) são os triggers já criados na DB-06 — não dupliquei
  essa lógica na API.
- **Peça avulsa de kit também pode ser devolvida.** O texto da issue não
  falava nisso, mas a retirada (API-11) já aceita `itemKitId`, então a
  devolução precisava aceitar o mesmo cenário. Decidi permitir a devolução da
  peça e deixar os triggers agirem como estão: o status do kit não muda
  (porque o restante dele continua disponível — só o registro do kit inteiro,
  com `item_kit_id` nulo, sincroniza o status do container) e a ocorrência é
  aberta normalmente para a peça. Isso é uma limitação do schema atual (não
  existe "peça indisponível" isolada), que registrei em
  `docs/decisoes-pendentes.md` em vez de mexer nas triggers nesta issue.
- **`GET /v1/ocorrencias` não existe ainda.** É a issue API-13, separada
  desta. Até lá, confirmo a ocorrência aberta pela `GET
  /v1/ferramentas/:id/historico`, que já retorna o histórico de empréstimos e
  ocorrências de uma ferramenta.

## O que foi feito

- `PATCH /v1/emprestimos/:id/devolucao` (perfil `manutencao`): validator Zod,
  service, controller e rota com bloco `@openapi`.
- Validação: `condicaoDevolucao` obrigatória (`ok`, `avaria` ou `perda`, com
  mensagem própria para "ausente" e para "valor inválido") e
  `observacaoDevolucao` opcional (até 500 caracteres). O `:id` da rota é
  validado como inteiro positivo.
- Service `devolver`: roda numa transação com `SELECT ... FOR UPDATE` na linha
  do empréstimo. Confere se o empréstimo existe (404
  `EMPRESTIMO_NOT_FOUND`) e se ainda não foi devolvido (409
  `EMPRESTIMO_JA_DEVOLVIDO`) antes do `UPDATE`. A trava evita que duas
  devoluções simultâneas do mesmo empréstimo passem as duas e a trigger de
  ocorrência dispare em duplicidade.
- Retorno: o empréstimo já com os nomes resolvidos (`vw_emprestimos_detalhe`),
  no mesmo formato da API-11.
- **Extra ("se sobrar tempo") que decidi fazer:** incluí um campo `resumo` na
  resposta, com uma frase pronta para a confirmação no front (ex.: "Chave de
  fenda foi para indisponível por avaria." / "... foi devolvida e está
  disponível."). Para peça avulsa de kit, o resumo usa o nome da peça, não o
  do kit inteiro.

## Testes

- Vitest + Supertest (`api/src/tests/emprestimoRoutes.test.ts`, mais 9 casos
  novos dentro da suíte de empréstimos, banco real, prefixo
  `ZZTESTE_API11_`, reaproveitado por já existir): os três casos do "Pronto
  quando" da issue (devolução `ok` volta a ferramenta a `disponivel`;
  devolução com `avaria` deixa a ferramenta `indisponivel` com o motivo
  gravado e abre ocorrência com o colaborador certo; devolver o mesmo
  empréstimo duas vezes falha com 409), devolução com `perda`, empréstimo
  inexistente (404), condição ausente ou inválida (400), 401/403,
  `usuarioDevolucaoId` forjado no corpo ignorado, e devolução de peça avulsa
  de kit sem mudar o status do kit. Precisei ajustar o `afterAll` da suíte
  para apagar `ocorrencias` antes das `ferramentas` (a FK é `ON DELETE
  RESTRICT`), senão a limpeza dos casos de avaria e perda falhava.
- Coleção do Insomnia (`docs/insomnia/soufer-tools-emprestimos.json`, mesmo
  arquivo da API-11, agora também cobrindo a devolução; tutorial em
  `docs/insomnia/teste-api-emprestimos.md`): acrescentei 6 pastas (8 a 13) e
  24 requisições novas (30 a 53) — preparação (5 ferramentas dedicadas: D
  para o caso `ok`, E para `avaria`, F para `perda`, G para o 409 de
  duplicidade e H para os cenários que falham e não consomem o empréstimo:
  401, 403 e 400), fluxo de sucesso com conferência da ocorrência pelo
  histórico da ferramenta, 409 de duplicidade, 401/403, validação e 404. Além
  de importar no Insomnia, simulei a sequência inteira com um script contra a
  API local (banco `soufer_dev`) antes de considerar pronto: os 30 cenários
  passaram.
- Suíte completa da API: 230 testes, 18 arquivos, todos passando.
  `tsc --noEmit` sem erros. Não sobrou `console.log` no código.

## Documentação atualizada

- `docs/backend/api.md`: contrato de `PATCH /v1/emprestimos/:id/devolucao`.
- `docs/backend/arquitetura.md`: seção "Devolução de ferramenta (fluxo)".
- `docs/insomnia/soufer-tools-emprestimos.json` e
  `docs/insomnia/teste-api-emprestimos.md`: coleção e tutorial atualizados
  para cobrir a devolução, não só a retirada.

## Pendências e observações

- Comecei a branch a partir da `feat/api-11-registrar-retirada` porque o PR
  da API-11 ainda não tinha sido aprovado. Ele foi mergeado em `development`
  antes de eu terminar esta issue, então o PR da API-12 abre direto contra
  `development` — o diff mostra só as mudanças desta issue.
- `GET /v1/ocorrencias` (API-13) ainda não existe — os testes de ocorrência
  desta issue passam pela ferramenta (tabela direto no Vitest, histórico no
  Insomnia), não por uma rota própria de ocorrências.
- A limitação de "peça avulsa de kit avariada não deixa o kit indisponível"
  ficou registrada como decisão pendente, não como bug: o time pode revisar o
  schema mais adiante se decidir que uma peça avariada precisa aparecer como
  indisponível isoladamente.
