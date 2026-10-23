# Teste da API — Calendário e notificações (Insomnia)

Este guia explica como rodar, no Insomnia, os testes de `GET /v1/emprestimos/calendario`,
`GET /v1/notificacoes`, `PATCH /v1/notificacoes/:id/lida` e `PATCH /v1/notificacoes/lida`
(issue API-17, #61). A coleção pronta está em
[`soufer-tools-notificacoes.json`](./soufer-tools-notificacoes.json).

Cada requisição da coleção traz, na aba **Docs** (descrição), o que faz, por que
existe, como está configurada e o resultado esperado. O contrato completo das rotas
está em [`docs/backend/api.md`](../backend/api.md#calendário-get-v1emprestimoscalendariomesaaaa-mm).

A pasta 4 **altera dados** (marca notificações como lidas); todas as outras só leem.
Os testes conferem estrutura e regras (ordem, tipos, limites) e não números fixos,
porque o banco de teste muda.

## 1. Pré-requisitos

- Node 20 ou superior e PostgreSQL com o banco `soufer_dev` (migrations e seed).
- Arquivo `api/.env` preenchido (use `api/.env.example` como base).
- [Insomnia](https://insomnia.rest/download) **11 ou superior** (a coleção usa
  scripts e testes automáticos; foi preparada para a versão 13.1).

```powershell
cd api
npm run db:migrate
npm run db:seed
npm run dev
```

O seed cria a manutenção `0001` / `123456`, o admin `0053` / `123456` e o colaborador `0003`
(usado na sessão de consulta). Se o seu banco tiver outro admin, troque a matrícula e a senha
do corpo da requisição 02.

Para ter notificações a marcar, o banco precisa de empréstimos que vencem hoje ou atrasados.
A API gera os avisos sozinha na subida e a cada 30 minutos; para gerar na hora, rode no banco
`SELECT fn_gerar_notificacoes();`. O script `api/db/testes-notificacoes.sql` mostra o passo a
passo com dado de teste (e termina em `ROLLBACK`).

## 2. Importar e rodar

1. No Insomnia, **Import** → `docs/insomnia/soufer-tools-notificacoes.json`.
2. Abra **SOUFER Tools — Calendário e notificações**: 6 pastas e 29 requisições numeradas de 01 a 29.
3. Rode a pasta 1 primeiro (ela grava os três tokens) e depois as demais na ordem
   (Collection Runner ou uma a uma). Cada execução completa tem 73 testes automáticos.

Variáveis do Base Environment:

| Variável | Quem preenche | Uso |
|---|---|---|
| `base_url` | já vem (`http://localhost:3000/v1`) | mude só se a porta for outra |
| `mes` | já vem (`2026-10`) | mês do calendário (`AAAA-MM`); edite para testar outro |
| `token` | script da requisição 01 | manutenção |
| `token_admin` | script da requisição 02 | admin |
| `token_consulta` | script da requisição 03 | consulta (expira em 15 minutos) |
| `notificacao_id` | script da requisição 07 | notificação marcada como lida na pasta 4 |

## 3. O que cada pasta prova

| Pasta | Prova |
|---|---|
| 1 · Autenticação | Login da manutenção, login do admin e sessão de consulta. |
| 2 · Calendário de devoluções | Dias do mês pedido, em ordem e sem repetição; campos de cada empréstimo (`ferramenta_codigo` com 6 dígitos, `ramal` nulo); admin vê igual; mês sem devoluções devolve `[]`. |
| 3 · Notificações — listar | Paginação (`meta`), ordem da mais recente para a mais antiga, filtros `lida=false` (sino) e `lida=true` (histórico) e acesso do admin. |
| 4 · Notificações — marcar como lida | Marcar uma, repetir (idempotente), marcar todas (`atualizadas`) e conferir que o contador do sino zera. |
| 5 · Erros de validação e não encontrado | `lida`, `limit` e `mes` inválidos (400), `id` não numérico (400) e notificação inexistente (404). |
| 6 · Permissões (401 e 403) | Sem token (401) e perfil `consulta` (403) no calendário e nas notificações. |

## 4. Observações

- Depois de rodar a pasta 4, o banco de teste fica sem notificações não lidas até a API gerar novas.
- Se a requisição 07 não achar nenhuma notificação, `notificacao_id` fica vazio e a requisição 12 falha:
  gere as notificações (ver pré-requisitos) e repita.
- O dia do calendário é o da previsão de devolução no fuso de Brasília.
