# Fonte externa: feriados nacionais da BrasilAPI
# Gerado em: 20/10/2026, 21:22:07 (Brasília)
# Comando: npm run db:feriados -- 2026 · SELECT em feriados · GET /v1/feriados/dia-util
# Ambiente: banco de desenvolvimento (soufer_dev @ 127.0.0.1:5432) · commit 43bf5a5 + alterações ainda não commitadas

## Sincronização (BrasilAPI → tabela `feriados`)

```text
📅 Sincronizando feriados nacionais (BrasilAPI)...
📋 Anos selecionados: 2026

⏳ Sincronizando ano 2026...
✅ Ano 2026: 14 feriados inseridos/atualizados com sucesso!

🎉 Processo finalizado! Total de 14 registros sincronizados na tabela 'feriados'.
```

## Registros gravados (ano 2026)

| Data | Feriado | Tipo |
|---|---|---|
| 01/01/2026 | Confraternização mundial | national |
| 16/02/2026 | Carnaval | national |
| 17/02/2026 | Carnaval | national |
| 03/04/2026 | Sexta-feira Santa | national |
| 05/04/2026 | Páscoa | national |
| 21/04/2026 | Tiradentes | national |
| 01/05/2026 | Dia do trabalho | national |
| 04/06/2026 | Corpus Christi | national |
| 07/09/2026 | Independência do Brasil | national |
| 12/10/2026 | Nossa Senhora Aparecida | national |
| 02/11/2026 | Finados | national |
| 15/11/2026 | Proclamação da República | national |
| 20/11/2026 | Dia da consciência negra | national |
| 25/12/2026 | Natal | national |

Total: 14 feriados.

## Uso no cálculo de dias úteis (GET /v1/feriados/dia-util)

| Data | Resposta |
|---|---|
| 2026-09-07 (Independência, segunda-feira) | `{"data":"2026-09-07","diaUtil":false}` |
| 2026-10-24 (sábado) | `{"data":"2026-10-24","diaUtil":false}` |
| 2026-10-26 (segunda-feira comum) | `{"data":"2026-10-26","diaUtil":true}` |

## Fallback e falha de banco (testes automatizados)

```text
 ✓ src/tests/feriadoFallback.test.ts > feriados: BrasilAPI, cache e fallback (Regra 9) > BrasilAPI fora do ar (erro de rede): cai no fallback de sábado e domingo, sem erro para quem chama 107ms
 ✓ src/tests/feriadoFallback.test.ts > feriados: BrasilAPI, cache e fallback (Regra 9) > BrasilAPI respondendo erro HTTP (503): também cai no fallback 4ms
 ✓ src/tests/feriadoFallback.test.ts > feriados: BrasilAPI, cache e fallback (Regra 9) > fallback traz só fins de semana do ano pedido 3ms
 ✓ src/tests/feriadoFallback.test.ts > feriados: BrasilAPI, cache e fallback (Regra 9) > BrasilAPI no ar: grava no cache (upsert) e as leituras seguintes vêm do cache, sem nova chamada 16ms
 ✓ src/tests/feriadoFallback.test.ts > feriados: BrasilAPI, cache e fallback (Regra 9) > falha de BANCO ao gravar não é mascarada como "API fora": o erro chega a quem chamou 85ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehFimDeSemana > identifica sábado como fim de semana 2ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehFimDeSemana > identifica domingo como fim de semana 0ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehFimDeSemana > identifica dia de semana como não fim de semana 0ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehDiaUtil > retorna false para sábado 1ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehDiaUtil > retorna false para domingo 0ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehDiaUtil > retorna false para feriado nacional (Tiradentes - 2026-04-21) 68ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehDiaUtil > retorna true para dia útil normal (Segunda - 2026-04-20) 2ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehDiaUtil > rejeita data de calendário inexistente (dia fora do intervalo do mês) com INVALID_DATE 2ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > ehDiaUtil > rejeita data de calendário inexistente (mês fora do intervalo) com INVALID_DATE 0ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > Caso 1: soma dias úteis na mesma semana sem feriados (Segunda + 2 dias = Quarta) 4ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > Caso 2: pula fins de semana (Sexta + 1 dia útil = Segunda / Sexta + 3 dias úteis = Quarta) 2ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > Caso 3: pula feriados nacionais cadastrados (Tiradentes 21/04/2026) 1ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > Caso 4: pula múltiplos feriados consecutivos e fins de semana (Carnaval 2026) 1ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > Caso 5: calcula corretamente na virada de ano de 2026 para 2027 (Ano Novo) 1ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > Caso 6: retorna a mesma data quando quantidadeDias for 0 0ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > Caso 7: aceita objeto Date e a função auxiliar adicionarDiasUteis 1ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > diasUteis > rejeita quantidade negativa de dias com AppError 0ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > Rotas HTTP de Feriados > GET /v1/feriados?ano=2026 retorna lista de feriados do cache/banco 24ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > Rotas HTTP de Feriados > GET /v1/feriados/dia-util verifica se data é dia útil 13ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > Rotas HTTP de Feriados > GET /v1/feriados/dias-uteis calcula data final somando dias úteis 6ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > Rotas HTTP de Feriados > GET /v1/feriados/dias-uteis retorna 400 para parâmetros inválidos 6ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > Rotas HTTP de Feriados > GET /v1/feriados/dia-util retorna 400 INVALID_DATE para dia inexistente no mês (2026-02-30) 5ms
 ✓ src/tests/feriado.test.ts > Serviço de Feriados e Cálculo de Dias Úteis > Rotas HTTP de Feriados > GET /v1/feriados/dias-uteis retorna 400 INVALID_DATE para mês inexistente (2026-13-01) 4ms
 Test Files  2 passed (2)
      Tests  28 passed (28)
```

O arquivo feriadoFallback.test.ts simula a rede com um fetch falso e cobre: BrasilAPI com erro de rede e com erro HTTP → fallback de sábado e domingo (104 dias em 2003, sem gravar no cache); BrasilAPI no ar → upsert no cache e leitura seguinte sem nova chamada; e falha de banco → erro repassado, **sem** mascarar como fallback.
