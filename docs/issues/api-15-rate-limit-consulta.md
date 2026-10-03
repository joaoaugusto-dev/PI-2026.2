# API-15 — Rate limit no endpoint de consulta (registro de execução)

Issue: [#55](https://github.com/joaoaugusto-dev/PI-2026.2/issues/55)
Responsável na issue: Guilherme Portilho da Rosa Santi (@TGuiDev); finalizada por Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-14 (concluída) · Bloqueia: API-16
Branch: `feat/api-15-rate-limit-consulta`
Última atualização: 03/10/2026

## Objetivo

Impedir que o modo quiosque (`POST /v1/consulta/sessao`) vire porta de varredura da base de colaboradores. A matrícula tem só 9.999 valores possíveis e não é secreta, então sem limite dá para testar todas até achar as válidas.

Critério de pronto da issue: a 6ª tentativa em menos de um minuto retorna 429.

## Situação antes desta entrega

Já existiam o helper `criarLimiter` e um limite de 30 tentativas por minuto **por IP** na rota. Faltavam o limite **por matrícula tentada** (pedido no passo a passo) e o comportamento do critério de pronto (6ª tentativa → 429).

## Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| Dois limites combinados: **30/min por IP** e **5 falhas/min por matrícula** | O IP freia quem varre muitas matrículas de um lugar só; o limite por matrícula freia quem insiste numa matrícula vindo de vários IPs, e atende o critério "6ª tentativa → 429". |
| O contador por matrícula soma **todos os IPs** | O objetivo é proteger a matrícula, não o cliente. |
| Entradas **bem-sucedidas não contam** (`skipSuccessfulRequests`) | O colaborador legítimo precisa conseguir abrir o quiosque de novo; só falhas (404 etc.) gastam o limite. |
| O limite por matrícula roda **depois do `validate()`** | A chave é a matrícula já validada (4 dígitos): formato inválido (400) não gasta o limite e o número de contadores em memória fica limitado a 9.999. Essas requisições ainda contam no limite por IP. |
| Risco aceito: quem erra de propósito a mesma matrícula bloqueia o quiosque dessa matrícula por 1 minuto | É o preço de impedir a varredura; o bloqueio expira sozinho em 1 minuto. |
| O "se sobrar tempo" (mesmo padrão no login) **já estava atendido** pelo `loginLimiter` (10/min por IP) | Feito na #150; só documentado aqui. |
| Código de crachá **não** entra | O crachá deixou de existir (decisão da #150); o quiosque usa só matrícula. |

## O que foi feito

### API
- [`middlewares/rateLimit.ts`](../../api/src/middlewares/rateLimit.ts): `criarLimiter` ganhou as opções `keyGenerator` e `skipSuccessfulRequests`; novo `consultaMatriculaLimiter` (5 por minuto, chave `matricula:<identificador>`, sem contar sucessos). Resposta `429 TOO_MANY_REQUESTS` no envelope de erro padrão.
- [`routes/v1/consultaRoutes.ts`](../../api/src/routes/v1/consultaRoutes.ts): ordem na rota `/sessao`: `consultaSessaoLimiter` → `validate` → `consultaMatriculaLimiter` → controller. Swagger do 429 atualizado.

### Testes
- [`consultaSessaoRateLimitMatricula.test.ts`](../../api/src/tests/consultaSessaoRateLimitMatricula.test.ts) (novo): 5 × 404 e a 6ª → 429 `TOO_MANY_REQUESTS` na mesma matrícula; outra matrícula não é afetada; formato inválido (400) não gasta o limite da matrícula.
- [`consultaSessaoRateLimit.test.ts`](../../api/src/tests/consultaSessaoRateLimit.test.ts) (existente): 31ª tentativa por IP → 429. Fica em arquivo próprio porque o contador é por módulo.
- Suíte completa: 31 arquivos, 311 testes passando; `tsc --noEmit` limpo.

### Documentação
- [`api/README.md`](../../api/README.md), [`docs/backend/arquitetura.md`](../backend/arquitetura.md), [`docs/mudancas-para-o-front.md`](../mudancas-para-o-front.md) e [`docs/mudancas-para-o-guilherme.md`](../mudancas-para-o-guilherme.md) com os dois limites.
- [`api/docs/insomnia-collection.json`](../../api/docs/insomnia-collection.json): requisição com matrícula bem formada e inexistente, para repetir 6 vezes e ver o 429.

## Como verificar

1. `cd api && npx vitest run`.
2. No Insomnia, enviar 6 vezes `POST /v1/consulta/sessao` com `{"identificador": "9997"}` em menos de 1 minuto: as 5 primeiras devolvem 404 e a 6ª devolve 429.
3. Na mesma janela, `{"identificador": "9996"}` continua devolvendo 404.

## Atenção no deploy

Atrás de Nginx/Traefik, configurar `TRUST_PROXY_HOPS=1`. Sem isso o limite por IP enxerga o IP do proxy e todos os clientes dividem o mesmo contador. O limite por matrícula não depende disso.

## Se sobrar tempo (fora do escopo)

- Persistir os contadores fora da memória do processo (ex.: Redis) se a API passar a rodar em mais de uma instância; hoje cada processo conta o seu.
