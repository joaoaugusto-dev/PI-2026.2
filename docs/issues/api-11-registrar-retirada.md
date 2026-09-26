# API-11 — Registrar retirada (registro de execução)

Issue: [#47 — API-11 — Registrar retirada](https://github.com/joaoaugusto-dev/PI-2026.2/issues/47)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-07, API-09, API-10 e DB-06 (todas concluídas)
Milestone: Sprint 3
Data da execução: 26/09/2026
Branch: `feat/api-11-registrar-retirada` (base: `development`)

## Objetivo

O endpoint central do sistema: registrar a retirada de uma ferramenta por um
colaborador, com o responsável vindo do JWT e o bloqueio de ferramenta
indisponível feito pelo banco.

## Decisões tomadas antes de implementar

O texto original da issue divergia do restante do projeto em alguns pontos; o
time definiu:

- **Atividade opcional.** A issue pedia "retirada sem atividade (400)", mas a
  Regra 4 do `CLAUDE.md` (visita técnica DB-01) e a coluna `atividade_id`
  (nullable) dizem que é opcional. Vale a regra: sem atividade retorna 201, e o
  caso de 400 passou a ser previsão de devolução ausente, no passado ou inválida.
- **Campos em camelCase**, como no resto da API (`setorId`), em vez de
  snake_case: `ferramentaId`, `colaboradorId`, `setorDestinoId`, `atividadeId`,
  `atividadeObservacao` (a issue dizia `detalhe_atividade`; a coluna é
  `atividade_observacao`), `ordemServico` e `previsaoDevolucao`.
- **Kits entram nesta issue** (`itemKitId` opcional): as triggers do banco já
  suportam kit e peça avulsa.
- **409 com código `FERRAMENTA_INDISPONIVEL`**, o mesmo do exemplo de envelope
  de erro do projeto, para todos os bloqueios do banco no INSERT.
- **404 explícito** quando ferramenta, colaborador, setor, atividade ou item de
  kit não existem ou estão inativos (em vez do 400 genérico de chave estrangeira).
- **`previsaoDevolucao` obrigatória e não pode estar no passado.** Data sem
  horário (`YYYY-MM-DD`) vale até 23:59:59 de Brasília.
- **Extras:** `observacoesRetirada` opcional e a rota de sugestão de previsão.

## O que foi feito

- `POST /v1/emprestimos` (perfil `manutencao`): validator Zod, service, controller
  e rota com bloco `@openapi`. `usuario_retirada_id` é descartado do corpo e
  gravado a partir do JWT (Regra 6). Retorna 201 com o empréstimo já com os
  nomes resolvidos (`vw_emprestimos_detalhe`).
- Erros do banco no INSERT (`P0001` das triggers `fn_valida_retirada` e
  `fn_valida_kit_exclusividade`, e `23505` do índice `uq_emprestimo_aberto`)
  viram `409 FERRAMENTA_INDISPONIVEL` no envelope padrão.
- Conferência prévia do item de kit: item inexistente é 404
  `ITEM_KIT_NOT_FOUND` e item de outra ferramenta é 400 `ITEM_KIT_INVALIDO`
  (sem isso a trigger devolveria um 409 enganoso).
- `GET /v1/emprestimos/previsao-sugerida?dias=N`: "hoje + N dias úteis" (fins de
  semana e feriados pulados por `adicionarDiasUteis`), com "hoje" na data de
  Brasília (depois das 21h o UTC já é o dia seguinte). Quem retira escolhe N:
  `dias` é obrigatório (1 a 30), sem prazo padrão.

## Testes

- Vitest + Supertest (`api/src/tests/emprestimoRoutes.test.ts`, 17 testes, banco
  real, prefixo `ZZTESTE_API11_`): retirada normal (201, ferramenta `em_uso`,
  responsável do JWT), ferramenta já emprestada (409), sem atividade (201),
  `usuarioRetiradaId` forjado ignorado, data sem horário, previsão ausente,
  passada ou inválida (400), 404 por recurso, 401/403, kits e sugestão (sexta +
  2 dias = terça e o caso depois das 21h, com `Date` simulado).
- Coleção do Insomnia (`docs/insomnia/soufer-tools-emprestimos.json`, tutorial em
  `docs/insomnia/teste-api-emprestimos.md`): 29 requisições, 68 testes
  automáticos, todos passando contra a API local.
- Suíte completa da API: 215 testes, 18 arquivos, todos passando.

## Documentação atualizada

- `docs/backend/api.md`: contrato de `POST /v1/emprestimos` e da sugestão.
- `docs/backend/arquitetura.md`: seção "Retirada de ferramenta (fluxo)".

## Pendências e observações

- O texto da issue #47 no GitHub ainda diz "retirada sem atividade (400)" e usa
  snake_case; vale registrar a decisão acima na própria issue.
- Ainda não existe API de devolução (API-12): retiradas feitas em teste ficam
  abertas até limpeza manual (SQL no tutorial do Insomnia).
- A sugestão de previsão não tem prazo padrão por decisão do time: o front deve
  pedir `dias` conforme o que a pessoa que retira informar.
