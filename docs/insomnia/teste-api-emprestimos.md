# Teste da API — Retirada e devolução de ferramenta (Insomnia)

Este guia explica como rodar, no Insomnia, os testes de `POST /v1/emprestimos` e
`GET /v1/emprestimos/previsao-sugerida` (issue API-11, #47) e de
`PATCH /v1/emprestimos/:id/devolucao` (issue API-12, #48). A coleção pronta está
em [`soufer-tools-emprestimos.json`](./soufer-tools-emprestimos.json).

Cada requisição da coleção traz, na aba **Docs** (descrição), o que faz, por que
existe, como está configurada e o resultado esperado. O contrato completo das
rotas está em [`docs/backend/api.md`](../backend/api.md).

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
quem retira). A API sobe na porta definida em `PORT` (o Base Environment da
coleção assume `http://localhost:3000/v1`; se a sua porta for outra, altere só
`base_url`).

## 2. Importar e rodar

1. No Insomnia, **Import** → `docs/insomnia/soufer-tools-emprestimos.json`.
2. Abra **SOUFER Tools — Empréstimos (Retirada e Devolução)**: 13 pastas e 53
   requisições numeradas de 01 a 53 (01-29 são da retirada, API-11; 30-53 são
   da devolução, API-12).
3. Rode a pasta 1 primeiro e depois as demais na ordem (Collection Runner ou uma
   a uma). Cada execução completa tem 114 testes automáticos.

Sem copiar token nem ids: os scripts pós-resposta gravam variáveis de ambiente
(`token`, `token_consulta`, `usuario_nome`, `colaborador_id`, `setor_id`,
`atividade_id`, `grupo_id`, `ferramenta_a_id` a `ferramenta_h_id`,
`previsao_sugerida`, `emprestimo_ok_id`, `emprestimo_avaria_id`,
`emprestimo_perda_id`, `emprestimo_duplicado_id`, `emprestimo_h_id`) que as
requisições seguintes usam.

## 3. O que cada pasta prova

| Pasta | Prova |
|---|---|
| 1 · Autenticação e preparação | Logins e as 3 ferramentas de teste (`ZZINSOMNIA`). |
| 2 · Sugestão de previsão | Hoje + N dias úteis, sem prazo padrão (`dias` é obrigatório, de 1 a 30). |
| 3 · Retirada — sucesso | 201 normal, ferramenta vira `em_uso` e retirada sem atividade (Regra 4). |
| 4 · Regras de negócio (409) | Ferramenta já emprestada (`FERRAMENTA_INDISPONIVEL`) e `usuario_retirada_id` vindo do JWT (Regra 6). |
| 5 · 401 e 403 | Sem token e com perfil `consulta`. |
| 6 · Validação (400) | Previsão ausente, no passado ou inválida; `ferramentaId` ausente ou inválido. |
| 7 · Inexistentes (404) | Ferramenta, colaborador, setor, atividade e item de kit. |
| 8 · Devolução — preparação | Cadastra as ferramentas D a H e retira cada uma, para a devolução ter um empréstimo próprio por cenário. |
| 9 · Devolução — sucesso (200) | Os três casos do "Pronto quando" da API-12: `ok` volta a ferramenta a `disponivel`; `avaria` e `perda` deixam a ferramenta `indisponivel` com o motivo gravado e abrem ocorrência com o colaborador certo (conferida em `GET /v1/ferramentas/:id/historico`, já que `GET /v1/ocorrencias` é da API-13). |
| 10 · Devolução — 409 | Devolver o mesmo empréstimo duas vezes (`EMPRESTIMO_JA_DEVOLVIDO`). |
| 11 · Devolução — 401 e 403 | Sem token e com perfil `consulta`; o empréstimo continua em aberto. |
| 12 · Devolução — Validação (400) | `condicaoDevolucao` ausente ou fora de `ok`/`avaria`/`perda`. |
| 13 · Devolução — Inexistente (404) | Empréstimo com id inexistente (`EMPRESTIMO_NOT_FOUND`). |

Os cenários de kit completos (peça de outro kit, repetir a peça, kit inteiro com
peça aberta, devolução de peça avulsa) e o cálculo com data simulada (sexta + 2
dias = terça) estão nos testes automáticos do Vitest
(`api/src/tests/emprestimoRoutes.test.ts`).

## 4. Limpeza depois dos testes

As pastas 9 e 10 devolvem os empréstimos de D, E, F e G; o de H fica aberto de
propósito (usado nos cenários de 401, 403 e 400, que não chegam a devolver de
verdade), assim como os empréstimos de A, B e C da retirada (API-11). Para
limpar o banco de desenvolvimento:

```sql
DELETE FROM ocorrencias
WHERE ferramenta_id IN (SELECT id FROM ferramentas WHERE nome LIKE 'ZZINSOMNIA%');
DELETE FROM emprestimos
WHERE ferramenta_id IN (SELECT id FROM ferramentas WHERE nome LIKE 'ZZINSOMNIA%');
DELETE FROM ferramentas WHERE nome LIKE 'ZZINSOMNIA%';
```

Use somente em desenvolvimento (`soufer_dev`).
