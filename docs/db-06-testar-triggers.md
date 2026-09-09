# DB-06 — Testes manuais das triggers de negócio (registro de execução)

Issue: [#32 — DB-06 — Triggers de negócio](https://github.com/joaoaugusto-dev/PI-2026.2/issues/32)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Data da execução: 09/09/2026

## Objetivo

Confirmar, com teste manual real contra um banco vivo (`soufer_dev`), que as três
triggers de negócio da issue #32 funcionam como esperado: validação de retirada,
sincronização de status da ferramenta e abertura automática de ocorrência.

## O que já estava pronto antes desta execução

As três funções e triggers já estavam escritas e versionadas em
[`/api/db/migrations/0001_init.sql`](../api/db/migrations/0001_init.sql), aplicadas em
`soufer_dev`/`soufer_prod` pela DB-05:

- `fn_valida_retirada` + `trg_valida_retirada` (linhas 347–370)
- `fn_sync_status_ferramenta` + `trg_sync_status_ferramenta` (linhas 435–468)
- `fn_abre_ocorrencia` + `trg_abre_ocorrencia` (linhas 471–507)

Faltava apenas o passo 4 da issue: o teste manual em si.

## O que foi feito nesta rodada

1. Criado [`/api/db/testes-manuais.sql`](../api/db/testes-manuais.sql) com os três
   cenários pedidos na issue, cada um com a massa de dados mínima necessária (setor,
   grupo de ferramentas, usuário, colaborador, ferramenta). O script roda tudo dentro
   de uma única transação e termina com `ROLLBACK`, então pode ser executado quantas
   vezes forem necessárias em qualquer ambiente sem deixar dado de teste.

   Nota: a issue original menciona "SQL Editor do Supabase" — como o projeto descartou
   o Supabase em favor de PostgreSQL próprio (decisão registrada no `CLAUDE.md`), o
   teste foi rodado via `psql` (`psql -h 127.0.0.1 -U postgres -d soufer_dev -f
   api/db/testes-manuais.sql`).

2. Executado contra `soufer_dev` e validado:

   - **Cenário 1 — retirada normal:** insert em `emprestimos` aceito; `ferramentas.status`
     mudou de `disponivel` para `em_uso` (via `trg_sync_status_ferramenta`).
   - **Cenário 2 — retirada de ferramenta já emprestada:** insert bloqueado pela
     `fn_valida_retirada` com a mensagem `Ferramenta 2 não está disponível para
     empréstimo (status atual: em_uso)`, capturada via `SAVEPOINT`/`EXCEPTION` sem
     abortar a transação de teste.
   - **Cenário 3 — devolução com avaria:** `UPDATE` em `emprestimos` com
     `condicao_devolucao = 'avaria'` mudou `ferramentas.status` para `indisponivel`
     (`motivo_indisponivel = 'avaria'`) e inseriu automaticamente 1 linha em
     `ocorrencias` (`tipo = 'AVARIA'`, `status = 'aberta'`), via `trg_abre_ocorrencia`.

3. Confirmado que a transação de teste terminou em `ROLLBACK` e que `soufer_dev`
   permanece sem nenhum dado extra (`0` linhas em `setores`, `emprestimos` e
   `ocorrencias` após a execução).

## Item "se sobrar tempo"

Feito: o script ficou versionado em [`/api/db/testes-manuais.sql`](../api/db/testes-manuais.sql),
pronto para ser reaproveitado como base dos testes automatizados (Vitest + Supertest)
do Sprint 10.

## Pendências

Nenhuma relacionada ao escopo desta issue. As três triggers estão funcionando conforme
o esperado nos três cenários exigidos pela issue #32.
