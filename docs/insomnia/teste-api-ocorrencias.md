# Teste da API — Ocorrências (Insomnia)

Este guia explica como rodar, no Insomnia, os testes de `GET /v1/ocorrencias` e
`PATCH /v1/ocorrencias/:id` (issue API-13, #49). A coleção pronta está em
[`soufer-tools-ocorrencias.json`](./soufer-tools-ocorrencias.json).

Cada requisição da coleção traz, na aba **Docs** (descrição), o que faz, por que
existe, como está configurada e o resultado esperado. O contrato completo das
rotas está em [`docs/backend/api.md`](../backend/api.md).

As duas rotas não criam ocorrência: quem abre é o trigger `fn_abre_ocorrencia`,
disparado pela devolução com avaria ou perda (Regra 3, API-12). Por isso a
pasta 1 desta coleção usa `POST /v1/emprestimos` e
`PATCH /v1/emprestimos/:id/devolucao` só para gerar duas ocorrências reais (A e
B) antes de testar a listagem e a atualização.

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

O seed cria a manutenção `0001` / `123456` e o colaborador `0003` (usado como
quem retira/devolve). A API sobe na porta definida em `PORT` (o Base
Environment da coleção assume `http://localhost:3000/v1`; se a sua porta for
outra, altere só `base_url`).

## 2. Importar e rodar

1. No Insomnia, **Import** → `docs/insomnia/soufer-tools-ocorrencias.json`.
2. Abra **SOUFER Tools — Ocorrências (Tratativa de Avaria/Perda)**: 7 pastas e
   32 requisições numeradas de 01 a 32.
3. Rode a pasta 1 primeiro e depois as demais na ordem (Collection Runner ou uma
   a uma). Cada execução completa tem 72 testes automáticos.

Sem copiar token nem ids: os scripts pós-resposta gravam variáveis de ambiente
(`token`, `token_consulta`, `usuario_nome`, `colaborador_id`, `setor_id`,
`grupo_id`, `ferramenta_a_id`, `ferramenta_b_id`, `emprestimo_a_id`,
`emprestimo_b_id`, `ocorrencia_a_id`, `ocorrencia_b_id`, `data_resolucao_a`) que
as requisições seguintes usam.

## 3. O que cada pasta prova

| Pasta | Prova |
|---|---|
| 1 · Autenticação e preparação | Logins, 2 ferramentas de teste (`ZZINSOMNIA`), e as ocorrências A e B abertas via devolução com avaria, localizadas pelo histórico de cada ferramenta. |
| 2 · Listagem — sucesso | Sem filtro, e cada filtro isolado (`status`, `colaboradorId`, `tipo`, com normalização de maiúsculo/minúsculo). |
| 3 · Listagem — validação e permissões | `status`/`tipo` fora do enum (400), sem token (401), perfil `consulta` (403). |
| 4 · Atualização — ciclo de sucesso | O ciclo mínimo citado no "pronto quando" da issue (`aberta → em_reparo → resolvida`) na ocorrência A, com `custoEstimado`/`observacoesResolucao`, e a prova de que `resolvida_por`/`data_resolucao` vêm do JWT e não são sobrescritos ao reenviar o mesmo status. |
| 5 · Atualização — ciclo estendido e retrocesso | Os 2 estados fora do ciclo de 3 (`cobrada`, `baixada`) na ocorrência B, e a recusa (409) de retroceder o status. |
| 6 · Atualização — validação e inexistente | Corpo vazio, `custoEstimado` vazio (não pode virar `0` silenciosamente) e id de ocorrência inexistente (404). |
| 7 · Atualização — permissões | Sem token (401) e perfil `consulta` (403). |

## 4. Limpeza depois dos testes

As ferramentas A e B ficam com os empréstimos já devolvidos (não ficam
abertos), então a limpeza só precisa apagar as ocorrências, os empréstimos e as
ferramentas de teste:

```sql
DELETE FROM ocorrencias
WHERE ferramenta_id IN (SELECT id FROM ferramentas WHERE nome LIKE 'ZZINSOMNIA%');
DELETE FROM emprestimos
WHERE ferramenta_id IN (SELECT id FROM ferramentas WHERE nome LIKE 'ZZINSOMNIA%');
DELETE FROM ferramentas WHERE nome LIKE 'ZZINSOMNIA%';
```

Use somente em desenvolvimento (`soufer_dev`).
