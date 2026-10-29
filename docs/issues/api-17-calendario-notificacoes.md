# API-17 — Calendário e notificações (registro de execução)

Issue: [#61 — API-17 — Calendário e notificações](https://github.com/joaoaugusto-dev/PI-2026.2/issues/61)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Milestone: Sprint 6
Data da execução: 22/10/2026
Branch: `feat/api-17-notificacoes-evidencia` (criada a partir da `feat/dados-validacao-qualidade` e rebaseada na `development` depois do merge da #216, um commit por etapa)
PR: [#217](https://github.com/joaoaugusto-dev/PI-2026.2/pull/217)

## Objetivo

Dar suporte às telas FE-18 (calendário) e FE-19 (notificações): devoluções previstas por dia, e avisos de "vence hoje", "atrasado" e, como extra, "ocorrência pendente".

## Situação ao retomar

As rotas e a função já estavam na `development`, entregues em commits anteriores (`GET /v1/emprestimos/calendario`, `GET /v1/notificacoes`, `PATCH /v1/notificacoes/:id/lida`, `PATCH /v1/notificacoes/lida`, `fn_gerar_notificacoes()` na migration `0006` e a limpeza na `0007`). Esta execução fechou o que faltava para o "Pronto quando" e o DoD.

## Decisões

| Ponto | Decisão | Motivo |
|---|---|---|
| Agendamento | O timer do `server.ts` gera os avisos onde não há `pg_cron`; o `pg_cron` fica como reforço onde existir | O PostgreSQL do Dokploy deve usar a imagem padrão, sem `pg_cron` (o `soufer_dev` local também não tem; falta confirmar em produção). Sem a extensão a migration `0006` só emite aviso e nenhum job é criado |
| Limpeza | `fn_limpar_notificacoes()` também roda no timer (na subida e a cada 24 h) | Antes só o `pg_cron` a chamava, então em produção as lidas nunca seriam apagadas |
| Fim de semana | Com o timer, o aviso sai todos os dias | O `pg_cron` rodava só de segunda a sexta |
| Ocorrência pendente: N | 7 dias (constante `dias_pendente` na função) | Uma semana parada já justifica cobrança; fácil de mudar |
| Ocorrência pendente: critério | `status` fora de `resolvida` e `baixada`, aberta há mais de 7 dias de Brasília | `aberta`, `em_reparo` e `cobrada` mantêm a ferramenta parada |
| Ocorrência pendente: deduplicação | Um aviso por ocorrência, pelo `link` `/ferramentas/:id?ocorrencia=:id` | O front não tem página de ocorrência, então o link abre a ferramenta. Se continuar pendente após a limpeza da lida (30 dias), gera novo aviso |
| Reabertura | Não existe: a API recusa retroceder o status da ocorrência | Uma ocorrência encerrada não volta a ficar pendente, então o aviso único por ocorrência (`created_at` fixo) basta |
| Texto do aviso | `PERDA` aparece como "extravio" | É o nome que a tela usa; o valor no banco continua `PERDA` (issues #180 e #181) |
| Log do timer | `logger.info` com a quantidade gerada/apagada, só quando maior que 0 | Dá para conferir em produção sem poluir o log a cada reinício |
| Migration nova | `0015` reescreve a função em vez de editar a `0006` | A `0006` já foi aplicada em outros ambientes |

## O que foi feito

Commits, na ordem (um por etapa):

1. `test(api-17): script e evidência da execução manual de fn_gerar_notificacoes` — [testes-notificacoes.sql](../../api/db/testes-notificacoes.sql) e [01-fn-gerar-notificacoes.txt](../testes/api-17-notificacoes/01-fn-gerar-notificacoes.txt).
2. `feat(api-17): timer do servidor também limpa notificações e vira o mecanismo oficial sem pg_cron` — [server.ts](../../api/src/server.ts) e [arquitetura.md](../backend/arquitetura.md).
3. `docs(api-17): documentar calendário e notificações em api.md` — [api.md](../backend/api.md#calendário-get-v1emprestimoscalendariomesaaaa-mm).
4. `feat(api-17): notificação de ocorrência pendente há mais de 7 dias` — [0015_notificacao_ocorrencia_pendente.sql](../../api/db/migrations/0015_notificacao_ocorrencia_pendente.sql) e testes em [gerarNotificacoes.test.ts](../../api/src/tests/gerarNotificacoes.test.ts).
5. `docs(api-17): coleção do Insomnia e tutorial de calendário e notificações` — [soufer-tools-notificacoes.json](../insomnia/soufer-tools-notificacoes.json) e [teste-api-notificacoes.md](../insomnia/teste-api-notificacoes.md).
6. `docs(api-17): registro de execução e evidências da API-17` — este arquivo e as evidências em [docs/testes/api-17-notificacoes/](../testes/api-17-notificacoes/).
7. `feat(api-17): chamar PERDA de extravio no aviso de ocorrência pendente` — ajuste da `0015` e dos testes, pedido na revisão da PR.
8. `feat(api-17): registrar no log quantas notificações o timer gerou e apagou` — [server.ts](../../api/src/server.ts), pedido na revisão da PR.
9. `docs(api-17): refletir os ajustes da revisão na documentação e nas evidências`.

## Evidências

- **Execução manual da função** (passo 4 da issue): [01-fn-gerar-notificacoes.txt](../testes/api-17-notificacoes/01-fn-gerar-notificacoes.txt). Com retiradas de teste, a função gerou `devolucao_hoje` para a que vence hoje, `atraso` para as de 2 e 10 dias, `ocorrencia_pendente` para a avaria de 10 dias e a perda ("extravio") de 9 dias, e nada para o prazo futuro, a ocorrência de 3 dias e a resolvida; a segunda execução gerou 0.
- **Coleção do Insomnia**: [02-colecao-insomnia.txt](../testes/api-17-notificacoes/02-colecao-insomnia.txt), 29 requisições e 73 testes, sem falhas, contra a API local com o seed. A coleção foi executada por um executor em Node que roda os mesmos scripts de teste dela; falta passar uma vez pelo próprio Insomnia.
- **Testes automatizados**: suíte completa com 42 arquivos e 439 testes passando; `tsc --noEmit` sem erro.

## Pendências

- Confirmar em produção (Dokploy) que não há `pg_cron`: `SELECT * FROM cron.job;` (erro `schema "cron" does not exist` confirma). O timer vale após o próximo deploy da API.
- Revisão da PR por pelo menos um integrante; a PR fecha a issue #61.
