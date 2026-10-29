# Teste da API — Dashboard: KPIs e atrasos (Insomnia)

Este guia explica como rodar, no Insomnia, os testes de `GET /v1/dashboard/kpis` e
`GET /v1/dashboard/atrasos` (issue #69, API-18). A coleção pronta está em
[`soufer-tools-dashboard.json`](./soufer-tools-dashboard.json).

Cada requisição da coleção traz, na aba **Docs** (descrição), o que faz, por que
existe, como está configurada e o resultado esperado. O contrato completo das rotas
está em [`docs/backend/api.md`](../backend/api.md#dashboard-get-v1dashboard).

A coleção **só lê** dados: não cria, altera nem apaga nada no banco, então não há
limpeza depois. Os testes conferem estrutura e regras (soma, ordem, tipos) e não
números fixos, porque o banco de teste muda.

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
do corpo da requisição 03.

## 2. Importar e rodar

1. No Insomnia, **Import** → `docs/insomnia/soufer-tools-dashboard.json`.
2. Abra **SOUFER Tools — Dashboard (KPIs e atrasos)**: 5 pastas e 14 requisições numeradas de 01 a 14.
3. Rode a pasta 1 primeiro (ela grava os três tokens) e depois as demais na ordem
   (Collection Runner ou uma a uma). Cada execução completa tem 41 testes automáticos.

Variáveis do Base Environment:

| Variável | Quem preenche | Uso |
|---|---|---|
| `base_url` | já vem (`http://localhost:3000/v1`) | mude só se a porta for outra |
| `token` | script da requisição 01 | manutenção |
| `token_consulta` | script da requisição 02 | consulta (expira em 15 minutos) |
| `token_admin` | script da requisição 03 | admin |
| `kpis_manutencao` | script da requisição 04 | os seis contadores, como texto JSON, para as requisições 05 a 08 conferirem |

## 3. O que cada pasta prova

| Pasta | Prova |
|---|---|
| 1 · Autenticação | Login da manutenção, sessão de consulta e login do admin. |
| 2 · Contadores | `GET /dashboard/kpis` devolve os seis contadores (inteiros, e disponíveis + em uso + indisponíveis = cadastradas) para manutenção e admin, e batem com o `kpis` do painel completo. |
| 3 · Atrasos por setor | `GET /dashboard/atrasos` devolve um item por setor, o setor com mais atrasos primeiro, e a soma de `atrasados` é o `atrasadas` de `/kpis`. |
| 4 · Regressão de `/:lista` | A lista paginada (`/dashboard/atrasados?limit=2`) segue funcionando e um nome desconhecido segue sendo 400. |
| 5 · Permissões (401 e 403) | Sem token (401) e perfil `consulta` (403) nas duas rotas novas. |

## 4. Observações

- As requisições 05 a 08 comparam com a 04. Rode-as em sequência: se alguém registrar uma
  devolução entre elas, um teste de igualdade pode falhar sem ser defeito da API.
- `atrasadas` e `atrasados` seguem a definição do cartão de atrasados do painel (previsão em dia
  anterior, calendário de Brasília), e não a da view (`NOW() > previsao_devolucao`).
- Sem nenhum atraso no banco, `/dashboard/atrasos` devolve `[]` e os testes passam, mas só o
  formato da lista é validado. Use o banco de desenvolvimento, que tem atrasos.
- Cuidado com os nomes: `/dashboard/atrasados` é a lista paginada de empréstimos e
  `/dashboard/atrasos` é o agregado por setor.
