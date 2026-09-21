# DB-05 — Execução do DDL completo (registro de execução)

Issue: [#31 — DB-05 — Executar o DDL completo](https://github.com/joaoaugusto-dev/PI-2026.2/issues/31)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Data da execução: 07/09/2026

## Objetivo

Confirmar, de forma verificável (não só pelo conteúdo do repositório), que a migration
`/api/db/migrations/0001_init.sql` foi de fato executada nos ambientes `soufer_dev` e
`soufer_prod`, com todas as tabelas, enums e índices batendo com o dicionário de dados
atual.

## O que já estava pronto antes desta execução

- Migration versionada em [`/api/db/migrations/0001_init.sql`](../api/db/migrations/0001_init.sql),
  já mergeada em `main` (commits `4a2fe8c` e `a2d4bbc`).
- Script `npm run db:migrate` ([`/api/scripts/migrate.ts`](../api/scripts/migrate.ts)) para
  aplicar essa migration num banco configurado via `.env`.
- Nota de contexto já registrada na issue #31 sobre a divergência entre o texto original da
  issue (11 tabelas, 7 enums, `codigo_patrimonio` no formato `SF000001`) e o schema real
  pós visita técnica (13 tabelas, 6 enums, `codigo_identificacao` numérico de 4 dígitos).

## O que estava faltando

A execução em si contra um banco vivo — item que não dá para confirmar só lendo os
arquivos do repositório. Não havia `soufer_dev` nem `soufer_prod` criados ainda.

## O que foi feito nesta rodada

1. Criados os bancos `soufer_dev` e `soufer_prod` num PostgreSQL 18 local (usuário `postgres`).
2. Rodado `npm run db:migrate` (que executa `0001_init.sql` dentro de uma transação) contra
   cada um dos dois bancos, apontando o `api/.env` (não versionado, conforme `.gitignore`)
   para cada `DB_NAME` na vez.
3. Validado em `soufer_dev`:
   - **13 tabelas** criadas (`setores`, `grupos_ferramentas`, `subgrupos_ferramentas`,
     `atividades`, `usuarios`, `colaboradores`, `ferramentas`, `itens_kit`, `emprestimos`,
     `ocorrencias`, `notificacoes`, `feriados`, `auditoria`) — bate com o
     [dicionário de dados](banco-de-dados/dicionario-de-dados.md).
   - **6 enums** criados (`papel_usuario`, `status_ferramenta`, `motivo_indisponibilidade`,
     `condicao_devolucao`, `status_ocorrencia`, `tipo_notificacao`).
   - Índice único parcial `uq_emprestimo_aberto` existe na tabela `emprestimos`.
   - Teste de inserção: criado um setor e um grupo de ferramentas de teste, depois inserida
     uma ferramenta de teste sem informar `codigo_identificacao` — a trigger
     `fn_gera_codigo_identificacao` gerou `codigo_identificacao = 1` corretamente (primeira
     ferramenta ativa do banco). Os registros de teste foram removidos em seguida para não
     deixar lixo no ambiente.
4. Validado em `soufer_prod`: as mesmas 13 tabelas foram criadas e o banco permanece **sem
   nenhum dado** (`0` linhas em `ferramentas` e `emprestimos`), evitando divergência de
   schema entre os dois ambientes desde já — item que estava listado como "se sobrar tempo"
   na issue.

## Observação à parte

Durante a checagem, foi encontrado um banco local pré-existente chamado `soufer_tools`
(dono `soufer_app`) com um schema **antigo**, de 11 tabelas (`categorias` em vez de
`grupos_ferramentas`/`subgrupos_ferramentas`, sem `itens_kit`) — compatível com a versão
pré-visita técnica descrita originalmente na issue #31. Esse banco não faz parte da
convenção de nomes do projeto (`soufer_dev` / `soufer_prod`, ver `api/.env.example`) e não
foi alterado nem removido nesta execução; ficou só como registro de que existia uma
tentativa anterior, desatualizada, rodada fora do fluxo de migration versionada.

## Pendências

Nenhuma relacionada ao escopo desta issue. Os dois ambientes locais (`soufer_dev` e
`soufer_prod`) estão com o schema atual aplicado e validados. A migração para o ambiente
gerenciado definitivo (AWS RDS ou equivalente, conforme decisão arquitetural registrada no
`CLAUDE.md`) é escopo de outra issue de infraestrutura, não desta.
