# API-14 — Validação Zod refinada em todas as rotas de escrita (registro de execução)

Issue: [#54 — API-14 — Validação Zod refinada em todas as rotas de escrita](https://github.com/joaoaugusto-dev/PI-2026.2/issues/54)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-07 a API-13 (todas concluídas; API-13 mergeada em
`development` via PR #161 durante a execução desta issue)
Milestone: Sprint 5
Data da execução: 30/09/2026
Branch: `feat/api-14-validacao-zod-refinada`
PR: (preencher após abrir)

## Objetivo

Nenhuma rota de escrita aceita dado incoerente, com mensagem de erro
específica por campo (não um genérico "dado inválido"), e campos sensíveis
vindos do JWT (`usuario_retirada_id`, `usuario_devolucao_id`,
`registrada_por`, `resolvida_por`, `criado_por` etc.) são sempre ignorados
quando enviados no corpo da requisição.

## Decisões tomadas antes/durante a execução

A issue original tinha três pontos em aberto, resolvidos com o time antes de
fechar a issue:

- **`/ferramentas` não tem campo `criado_por`/`atualizado_por`.** A tabela
  `ferramentas` (migration `0001_init.sql`) não guarda quem cadastrou ou
  editou o registro — só `emprestimos.registrada_por` segue o padrão da
  Regra 6 do `CLAUDE.md`. Decisão: em vez de inventar uma coluna só para
  fechar o critério da issue, os testes de "campo proibido" em `/ferramentas`
  cobrem os campos que a rota de fato protege contra o corpo da requisição —
  `status`, `ativo` e `codigoIdentificacao`, todos controlados pelo servidor
  (trigger, rota de disponibilizar, `DELETE`). Decisão registrada em
  comentário no próprio `ferramentaValidator.ts`.
- **`.strip()` explícito vs. comportamento padrão do Zod.** A issue pede
  literalmente que os campos sensíveis sejam "removidos do body com
  `.strip()`", mas nenhum schema de escrita chama `.strip()` — o descarte de
  chaves desconhecidas já acontece pelo modo padrão do `z.object()` (nenhum
  validator usa `.passthrough()`/`.strict()`). Decisão do time: manter o
  padrão em vez de adicionar a chamada redundante em cada schema. Registrada
  em `docs/decisoes-pendentes.md`.
- **Escopo do bônus "se sobrar tempo" (zod-to-openapi).** Em vez de migrar
  todas as rotas de uma vez, o time decidiu fazer uma prova de conceito só em
  `POST`/`PATCH /ferramentas` primeiro, para validar o esforço e os riscos
  antes de estender. Resultado e decisão de estender (ou não) para as demais
  rotas também registrados em `docs/decisoes-pendentes.md`.

Também foi necessário corrigir a base da própria branch no meio da execução:
ela tinha sido criada a partir da `main`, mas a API-13 (dependência direta
desta issue) só estava mesclada na `development` — a base de integração
correta do projeto (`CLAUDE.md`, Seção 5: `main ← development ← feat/*`).
A branch foi reancorada (`git rebase --onto`) duas vezes: primeiro sobre a
branch local da API-13 para destravar o trabalho, depois sobre a
`origin/development` real assim que ficou claro que ela já tinha tudo
mesclado. O segundo rebase expôs uma mudança de regra de negócio feita em
paralelo em `development` (`PATCH /v1/colaboradores/:id` passou a exigir
perfil `admin`, não mais `manutencao`) — o merge automático do Git aplicou um
teste novo desta issue sem atualizar o token usado, causando um 403
inesperado. Corrigido trocando para o token de `admin` no teste afetado.

## O que foi feito

- **Testes de "campo proibido ignorado"** (campo sensível enviado de
  propósito no corpo, confirmando que é descartado e não causa erro) em 7
  rotas: `POST /colaboradores` (já existia), `PATCH /colaboradores/:id`
  (novo — `criado_por`), `POST /ferramentas` e `PATCH /ferramentas/:id`
  (novos — `status`/`ativo`/`codigoIdentificacao`), `POST /emprestimos` e
  `PATCH /emprestimos/:id/devolucao` (já existiam), `PATCH /ocorrencias/:id`
  (já existia) e `POST /auth/registro` (já existia — `papel`/`ativo`/`nome`).
- **Testes de "mensagem específica por campo"** adicionados/reforçados em
  `POST /colaboradores`, `PATCH /colaboradores/:id`, `POST /emprestimos`
  (3 casos de `previsaoDevolucao`), `PATCH /emprestimos/:id/devolucao`
  (3 casos: `condicaoDevolucao` ausente/inválida, `observacaoDevolucao`
  vazia) e `PATCH /ocorrencias/:id` (3 casos de `custoEstimado`).
- **Critério de pronto da issue fechado:** 5 rotas reais têm, ao mesmo tempo,
  teste de campo proibido ignorado e teste de mensagem específica por campo —
  `POST /colaboradores`, `PATCH /colaboradores/:id`, `POST /emprestimos`,
  `PATCH /emprestimos/:id/devolucao` e `PATCH /ocorrencias/:id`.
- **Bônus ("se sobrar tempo") — prova de conceito de `zod-to-openapi`:**
  instalada `@asteasolutions/zod-to-openapi@7.3.4` (última versão compatível
  com Zod 3; a linha 8.x/9.x exige Zod 4). Criado
  `api/src/config/openapiFromZod.ts`, que gera a documentação Swagger de
  `POST`/`PATCH /ferramentas` diretamente a partir de
  `criarFerramentaSchema`/`atualizarFerramentaSchema`. `config/swagger.ts`
  faz o merge desses paths, por método HTTP, com o spec do `swagger-jsdoc` —
  `GET /ferramentas` continua documentado pelo `@openapi` manual, só
  `POST`/`PATCH` foram migrados. Os comentários `@openapi` manuais dessas
  duas operações foram removidos para não ficar documentação duplicada e
  divergente. Funcionou corretamente até para campos com `z.coerce.number()`
  (preprocess), convertidos para `integer` com os limites `min`/`max`
  originais.

## Problema encontrado e corrigido durante a execução

- **Branch na base errada.** Ver "Decisões tomadas antes/durante a
  execução" acima — a branch foi criada a partir da `main` em vez da
  `development`, por engano. Corrigido com dois rebases (`git rebase --onto`)
  no meio da execução, sem perder nenhum commit já feito.
- **Token desatualizado após o segundo rebase.** O merge automático do Git
  aplicou um teste novo (`PATCH /v1/colaboradores/:id`) usando
  `manutencaoToken`, mas a regra de autorização dessa rota tinha mudado para
  exigir `admin` em um commit já presente na `development`. Resultado: 403 em
  vez de 200. Só foi percebido porque a suíte completa foi rodada de novo
  depois do rebase (nenhum conflito de merge foi sinalizado pelo Git nesse
  arquivo). Corrigido trocando o token no teste.

## Testes

- Vitest + Supertest, suíte completa: **277 testes, 23 arquivos, todos
  passando** (`npx vitest run`), rodada depois de cada mudança significativa
  e novamente depois dos dois rebases.
- `tsc --noEmit` sem erros depois de instalar `@asteasolutions/zod-to-openapi`
  e criar `openapiFromZod.ts`.
- Servidor iniciado localmente (`npx tsx src/server.ts`) para confirmar que
  o merge do spec gerado via Zod com o spec do `swagger-jsdoc` não quebra a
  inicialização do Swagger UI (`/docs`, `/v1/docs`).
- Durante a verificação, uma execução anterior interrompida tinha deixado
  registros órfãos (`ZZTESTE_OPC_%`) em `setores` e `grupos_ferramentas`,
  travando `opcoes.test.ts` com violação de índice único; limpos
  manualmente antes de confirmar a suíte completa limpa — não relacionado ao
  código desta issue.

## Documentação atualizada

- `api/src/validators/ferramentaValidator.ts`: comentário documentando por
  que `/ferramentas` não tem campo `criado_por`/`atualizado_por`.
- `docs/decisoes-pendentes.md`: duas seções novas — a decisão sobre
  `.strip()` explícito vs. padrão do Zod, e o resultado da prova de conceito
  de `zod-to-openapi` (com a decisão de estender para as demais rotas ainda
  em aberto).
- Este arquivo (`docs/issues/api-14-validacao-zod-refinada.md`), novo.

## Pendências e observações

- **Zod-to-openapi não foi estendido para as demais rotas** (colaboradores,
  empréstimos, ocorrências, auth) — isso era o bônus opcional da issue, não
  o "pronto quando". A decisão de estender (ou não) fica registrada em
  `docs/decisoes-pendentes.md` para o time decidir depois.
- Nada ficou pendente do escopo obrigatório da issue: os três passos do
  passo a passo e o critério de pronto (5 rotas com os dois tipos de teste)
  foram cumpridos e verificados mais de uma vez contra o código real.
