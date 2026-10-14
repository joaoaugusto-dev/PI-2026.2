# Teste da API — KPIs de gestão (Insomnia)

Este guia explica como rodar, no Insomnia, os testes de `GET /v1/kpis/*` (issue #208).
A coleção pronta está em [`soufer-tools-kpis.json`](./soufer-tools-kpis.json).

Cada requisição da coleção traz, na aba **Docs** (descrição), o que faz, por que
existe, como está configurada e o resultado esperado. O contrato completo das rotas
está em [`docs/backend/api.md`](../backend/api.md#kpis-de-gestão-get-v1kpis).

A coleção **só lê** dados: não cria, altera nem apaga nada no banco, então não há
limpeza depois. Os testes conferem estrutura e regras (ordem, somas, limites, tipos)
e não números fixos, porque o banco de teste muda.

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

1. No Insomnia, **Import** → `docs/insomnia/soufer-tools-kpis.json`.
2. Abra **SOUFER Tools — KPIs de gestão**: 8 pastas e 42 requisições numeradas de 01 a 42.
3. Rode a pasta 1 primeiro (ela grava os três tokens) e depois as demais na ordem
   (Collection Runner ou uma a uma). Cada execução completa tem 125 testes automáticos.

Variáveis do Base Environment:

| Variável | Quem preenche | Uso |
|---|---|---|
| `base_url` | já vem (`http://localhost:3000/v1`) | mude só se a porta for outra |
| `de` e `ate` | já vêm (`2026-01-01` e `2026-12-31`) | período dos KPIs; edite para testar semana, mês, trimestre ou outro intervalo |
| `token` | script da requisição 01 | manutenção |
| `token_consulta` | script da requisição 02 | consulta (expira em 15 minutos) |
| `token_admin` | script da requisição 03 | admin |

## 3. O que cada pasta prova

| Pasta | Prova |
|---|---|
| 1 · Autenticação | Login da manutenção, sessão de consulta e login do admin. |
| 2 · Uso das ferramentas | Ferramentas e categorias mais retiradas (ordem, `limit`) e tempo médio de posse por categoria e por ferramenta. |
| 3 · Avarias, extravios e taxa | Avarias e extravios por categoria (total igual à soma dos itens) e taxa de avaria (taxa entre 0 e 1, `min_devolucoes`). |
| 4 · Colaboradores (só admin) e setores | O ranking de colaboradores (admin) e o de setores (manutenção e admin), o `limit` e a ausência de valores na resposta. |
| 5 · Instantâneos | Indisponíveis agora (soma por motivo e percentual) e empréstimos abertos agora (sem colaborador, em ordem). |
| 6 · Evolução temporal | Série por dia, semana (segunda-feira) e mês (dia 1), totais iguais à soma da série e período anterior. |
| 7 · Erros de filtro (400) | Sem `de`/`ate`, `de` depois de `ate`, data inexistente, formato errado, 367 dias, `limit`, `agrupar`, `granularidade` e `min_devolucoes` inválidos. |
| 8 · Permissões (401 e 403) | Sem token (401), `consulta` (403), manutenção nos KPIs de admin (403) e manutenção e admin nos KPIs de período (200). |

## 4. Observações

- O primeiro e o último balde da evolução por semana ou mês podem ser parciais (só contam
  os dias dentro de `de`/`ate`): a queda do último balde não é tendência.
- O KPI de setores conta pelo **setor de destino** da retirada, não pelo setor de cadastro
  de quem retirou.
- Período sem movimento devolve lista vazia, e os testes passam do mesmo jeito.
