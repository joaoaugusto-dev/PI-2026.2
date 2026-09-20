# DB-08 — Seed de dados de teste (registro de execução)

Issue: [#34 — DB-08 — Seed de dados de teste](https://github.com/joaoaugusto-dev/PI-2026.2/issues/34)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: DB-07 (concluída)
Data da execução: 09/09/2026

## Objetivo

Deixar `soufer_dev` populado com dado suficiente para o front trabalhar sem
precisar cadastrar tudo na mão — cadastros base completos e um dashboard que
não nasce vazio.

## O que foi feito

Reescrito [`/api/db/seed.sql`](../api/db/seed.sql), que já tinha uma versão
mínima (5 setores, 5 grupos, 10 atividades, 1 usuário, 5 colaboradores, 8
ferramentas, sem nenhum empréstimo), para cobrir o que a issue pede:

1. **Setores (5)** e **grupos de ferramentas / categorias (5)** — mantidos como
   já estavam (acima do mínimo de 4 e 5 pedido).
2. **Atividades (10)** — mantidas como já estavam, marcadas no próprio arquivo
   como "já ajustadas na DB-01". Não existe `docs/requisitos.md` versionado
   com a lista final da DB-01 para conferência cruzada; essa foi a única fonte
   disponível.
3. **Usuários almoxarife (2)** — adicionado um segundo usuário
   (`almoxarife2@soufer.com.br`). Os hashes de senha (senha de teste `123456`)
   foram gerados com `bcryptjs` de verdade (mesma lib do `AuthService`),
   substituindo o hash de exemplo que estava na versão anterior do seed.
4. **Colaboradores (20)** — de 5 para 20, com nomes plausíveis (alguns
   propositalmente longos, ex. "Gustavo Henrique Batista da Silva", "Eduardo
   Henrique Nascimento Barros") distribuídos entre os 5 setores.
5. **Ferramentas (50)** — de 8 para 50, 10 por categoria, com nome, marca,
   modelo, descrição e localização plausíveis (marcas reais como Bosch,
   Makita, DeWalt, Mitutoyo, Starrett, Esab, Ingersoll Rand etc.), incluindo
   nomes longos de propósito para pegar problema de layout antes da hora
   (item "se sobrar tempo" da issue).
6. **Empréstimos de exemplo (16)**, para o dashboard não nascer vazio:
   - 6 em aberto (2 propositalmente atrasados, para a KPI `total_atrasadas`
     não nascer zerada).
   - 6 devolvidos com condição `ok`, sem ocorrência.
   - 4 devolvidos com ocorrência automática (3 avarias + 1 perda), cobrindo o
     pedido de "com e sem ocorrência".

   Cada devolução é feita em duas etapas (`INSERT` em aberto, depois `UPDATE`
   fechando) em vez de um único `INSERT` já devolvido, porque
   `fn_sync_status_ferramenta` e `fn_abre_ocorrencia` só disparam a lógica de
   fechamento (status da ferramenta e abertura de ocorrência) em `UPDATE`, não
   em `INSERT` — o mesmo comportamento já validado manualmente na DB-06.

7. **Idempotência**: os blocos de cadastro (setores, grupos, atividades,
   usuários, colaboradores) usam `ON CONFLICT DO NOTHING` na chave natural; o
   de ferramentas usa `WHERE NOT EXISTS (SELECT 1 FROM ferramentas)`, como já
   era antes; o de empréstimos usa uma guarda `\if` do `psql` (`SELECT NOT
   EXISTS (SELECT 1 FROM emprestimos) ... \gset`) em vez de `WHERE NOT
   EXISTS` em cada instrução, já que a seção é um fluxo de várias etapas
   (`INSERT` + `UPDATE`) que só faz sentido rodar do zero.

## Execução em `soufer_dev`

Rodado com `psql -h 127.0.0.1 -U postgres -d soufer_dev -f api/db/seed.sql`.
Números confirmados após a execução:

| Tabela | Linhas |
|---|---|
| `setores` | 5 |
| `grupos_ferramentas` | 5 |
| `atividades` | 10 |
| `usuarios` | 2 |
| `colaboradores` | 20 |
| `ferramentas` | 50 |
| `emprestimos` | 16 |
| `ocorrencias` | 4 |

`vw_dashboard_kpis` (DB-07) refletiu corretamente o dado inserido:

```
total_cadastradas=50, total_disponiveis=40, total_em_uso=6,
total_indisponiveis=4, total_atrasadas=2, ocorrencias_abertas=4
```

`vw_emprestimos_detalhe` agrupado por `situacao`: 10 `devolvido`, 2
`atrasado`, 4 `em_aberto` (total 16, bate com a tabela `emprestimos`).
`vw_ocorrencias_por_colaborador` mostrou as 4 ocorrências vinculadas aos
colaboradores e tipos corretos (3 avaria, 1 perda).

Também foi confirmado que rodar o script uma segunda vez contra o mesmo banco
não duplica nada: todos os `INSERT`s de cadastro retornaram `0` linhas
afetadas e o bloco de empréstimos foi pulado inteiro pela guarda `\if`.

## Pendências

Nenhuma relacionada ao escopo desta issue. `soufer_dev` está populado o
suficiente para as telas de dashboard, listagem de ferramentas, colaboradores
e histórico de empréstimos/ocorrências trabalharem com dado real desde já.
