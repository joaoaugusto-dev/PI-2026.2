# API-02 — Healthcheck e conexão com o banco (registro de execução)

Issue: [#37 — API-02 — Healthcheck e conexão com o banco](https://github.com/joaoaugusto-dev/PI-2026.2/issues/37)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-01, DB-05 (ambas concluídas)
Data da execução: 10/09/2026

## Objetivo

`GET /v1/health` respondendo e confirmando que a API conversa com o banco.

## O que já estava pronto antes desta execução

Todo o passo a passo da issue já tinha sido implementado de passagem em outros
commits/PRs, sem que a issue #37 fosse formalmente fechada:

- **Rota implementada**: [`api/src/controllers/healthController.ts`](../api/src/controllers/healthController.ts)
  e [`api/src/routes/v1/healthRoutes.ts`](../api/src/routes/v1/healthRoutes.ts),
  mapeada em `/v1/health` via [`api/src/routes/v1/index.ts`](../api/src/routes/v1/index.ts)
  (commit `4d06059`, PR #109 — setup base da API-01).
- **Consulta real ao banco**: `testConnection()` em
  [`api/src/config/database.ts`](../api/src/config/database.ts) roda
  `SELECT NOW(), current_database()` através do pool `pg`.
- **Coleção Insomnia**: `api/docs/insomnia-collection.json` já contém a
  requisição `GET /v1/health` (commit `6347c0c`, PR #114).
- **Item "se sobrar tempo"**: `docs/nuvem/infra-plano.md` já registra que o
  healthcheck de `/v1/health` é o ponto monitorado pelos alarmes do
  CloudWatch (Sprint 9).

Faltava apenas testar de novo a rota ao vivo e fechar a issue com o registro
de execução.

## O que foi feito nesta rodada

Subida a API localmente (`npm run dev`) contra `soufer_dev` e chamado
`GET /v1/health`:

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "data": {
    "status": "ok",
    "timestamp": "2026-09-10T03:12:26.753Z",
    "uptime": 3.0940675,
    "environment": "development",
    "database": {
      "status": "connected",
      "name": "soufer_dev",
      "serverTime": "2026-09-10T03:12:26.753Z",
      "error": null
    }
  }
}
```

Rota respondeu `200` com o banco conectado, atendendo ao "Pronto quando" da
issue.

## Pontos de atenção (divergências entre o texto da issue e as decisões atuais do projeto)

- A issue pede o formato literal `{ status: "ok", db: "ok" }`. A resposta real
  segue o envelope `{ "data": ... }` definido depois no `CLAUDE.md` (Seção 5,
  convenção geral de resposta da API), com `data.status` e
  `data.database.status` — formato mais rico (inclui `timestamp`, `uptime`,
  `environment`) e coerente com a convenção adotada por toda a API, não com o
  texto literal da issue antiga.
- A issue menciona "confirmando que a API conversa com o **Supabase**" —
  decisão já superada pelo `CLAUDE.md` (PostgreSQL próprio via `pg`, sem
  Supabase), mesmo tipo de divergência já sinalizada nas issues DB-06, DB-07 e
  DB-08.

## Pendências

Nenhuma relacionada ao escopo desta issue. A rota `/v1/health` está pronta
para uso no dia a dia da equipe e para o alarme do CloudWatch no Sprint 9.
