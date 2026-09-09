# DB-07 — Views de leitura (registro de execução)

Issue: [#33 — DB-07 — Views de leitura](https://github.com/joaoaugusto-dev/PI-2026.2/issues/33)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: DB-06 (concluída)
Data da execução: 09/09/2026

## Objetivo

Deixar `vw_emprestimos_detalhe`, `vw_dashboard_kpis` e `vw_ocorrencias_por_colaborador`
prontas para a API consultar, com os números validados contra dado real.

## O que já estava pronto antes desta execução

As três views já estavam escritas e versionadas em
[`/api/db/migrations/0001_init.sql`](../api/db/migrations/0001_init.sql) (linhas 512–576),
aplicadas em `soufer_dev`/`soufer_prod` pela DB-05, e já documentadas em
[`/docs/banco-de-dados/banco.md`](banco-de-dados/banco.md#views):

- `vw_emprestimos_detalhe` — junta empréstimo, ferramenta (incluindo `codigo_identificacao`
  e `eh_kit`), item de kit (se houver), colaborador, setor, atividade e os usuários de
  retirada/devolução, além da `situacao` calculada (`em_aberto`, `atrasado` ou `devolvido`).
- `vw_dashboard_kpis` — os 6 números: cadastradas, disponíveis, em uso, indisponíveis,
  atrasadas e ocorrências abertas.
- `vw_ocorrencias_por_colaborador` — total de avarias, perdas e custo (real ou estimado)
  agrupado por colaborador e setor.

Faltava apenas o passo 4 da issue: rodar um `select *` de cada view e conferir que os
números batem com dado de teste real.

## O que foi feito nesta rodada

A issue original pede para validar "com os dados de teste inseridos na issue DB-06" —
porém o script [`/api/db/testes-manuais.sql`](../api/db/testes-manuais.sql) termina em
`ROLLBACK`, então nenhum dado daquela execução persiste em `soufer_dev`. Para validar as
views com dado real sem criar um script novo, reaproveitei o mesmo script da DB-06 numa
cópia temporária com `COMMIT` no lugar do `ROLLBACK` (o arquivo versionado não foi
alterado), rodei contra `soufer_dev` e conferi as três views:

- **`vw_emprestimos_detalhe`**: 1 linha, com todos os joins preenchidos (ferramenta,
  colaborador, setor, usuário de retirada e de devolução) e `situacao = 'devolvido'`
  (coerente, já que o empréstimo de teste tinha `data_devolucao` preenchida pelo
  cenário de avaria da DB-06).
- **`vw_dashboard_kpis`**: `total_cadastradas=1, total_disponiveis=0, total_em_uso=0,
  total_indisponiveis=1, total_atrasadas=0, ocorrencias_abertas=1` — bate exatamente com
  o estado esperado após o cenário de devolução com avaria (ferramenta foi para
  `indisponivel` e abriu 1 ocorrência).
- **`vw_ocorrencias_por_colaborador`**: 1 linha para o colaborador de teste, com
  `total_ocorrencias=1`, `total_avarias=1`, `total_perdas=0` e `custo_total=0` (nenhum
  custo foi informado no cenário de teste).

Os três números batem com o dado inserido. Ao final, os dados de teste foram removidos
(`DELETE` em `ocorrencias`, `emprestimos`, `ferramentas`, `colaboradores`, `usuarios`,
`grupos_ferramentas` e `setores` filtrando pelos registros da massa de teste) e
confirmado que `soufer_dev` voltou a ter `0` linhas em `setores`, `emprestimos` e
`ocorrencias` — mesmo estado limpo de antes da validação. O script temporário usado para
a validação foi descartado e não foi versionado.

## Pendências

Nenhuma relacionada ao escopo desta issue. As três views retornam dado coerente e estão
prontas para a API consultar (DB-08 e as issues de API que dependem delas, ex. API-18).
