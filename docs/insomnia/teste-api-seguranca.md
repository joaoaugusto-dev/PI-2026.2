# Teste da API — Segurança do JWT e dos middlewares (Insomnia)

Este guia explica como rodar, no Insomnia, os testes de invasão simulada da issue #78 (API-19).
A coleção pronta está em [`soufer-tools-seguranca.json`](./soufer-tools-seguranca.json).

Cada requisição da coleção traz, na aba **Docs** (descrição), o que faz, por que
existe, como está configurada e o resultado esperado. Os mesmos cenários rodam como testes
automáticos da API (`api/src/tests/segurancaRotas.test.ts`, `invasaoSimuladaJwt.test.ts` e
`jwtHardening.test.ts`); a coleção serve para ver o bloqueio acontecer na mão e para mostrar na apresentação.
O registro da issue está em [`docs/issues/api-19-hardening-jwt-middlewares.md`](../issues/api-19-hardening-jwt-middlewares.md).

Os testes esperam **recusas** (401 e 403): "passar" aqui significa que o sistema bloqueou certo.
A coleção só lê dados e não grava nada; a única escrita tentada (`POST /v1/emprestimos`) é barrada com 403 antes de a API ler o corpo.

## 1. Pré-requisitos

- Node 20 ou superior e PostgreSQL com o banco `soufer_dev` (migrations e seed).
- Arquivo `api/.env` preenchido (use `api/.env.example` como base), com `NODE_ENV=development`.
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

## 2. Gerar os tokens forjados

Cinco pastas usam tokens que só existem se alguém souber o segredo da API (vencidos, com algoritmo
ou `aud` trocado). O Insomnia não consegue assiná-los, então um script gera os sete valores. Na raiz do repositório:

```powershell
node --env-file=api/.env docs/insomnia/gerar-tokens-invasao.mjs
```

A saída tem uma linha `nome=valor` por token. Cole cada valor na variável de mesmo nome do **Base Environment** da coleção.
O script lê o `JWT_SECRET` do seu `api/.env` e **nunca o imprime**; use só contra a API local.

| Variável | O que é | Resposta esperada |
|---|---|---|
| `token_vencido_manutencao` | token de manutenção com o segredo certo, já vencido | 401 `TOKEN_EXPIRED` |
| `token_vencido_consulta` | token de consulta já vencido | 401 `TOKEN_EXPIRED` |
| `token_alg_none` | sem assinatura (`alg: none`), payload de admin | 401 `TOKEN_INVALID` |
| `token_hs512` | admin com segredo e `aud` certos, mas algoritmo HS512 | 401 `TOKEN_INVALID` |
| `token_aud_consulta_em_balcao` | papel `manutencao` com o `aud` do quiosque | 401 `TOKEN_INVALID` |
| `token_aud_sessao_em_consulta` | papel `consulta` com o `aud` da sessão de balcão | 401 `TOKEN_INVALID` |
| `token_sem_aud` | manutenção válida, mas sem `aud` (sessão de antes da API-19) | 401 `TOKEN_OUTDATED` |

Os tokens forjados valem 1 hora (os vencidos já nascem vencidos). Se ficarem velhos, gere de novo.

## 3. Importar e rodar

1. No Insomnia, **Import** → `docs/insomnia/soufer-tools-seguranca.json`.
2. Abra **SOUFER Tools — Segurança do JWT e dos middlewares**: 5 pastas e 26 requisições numeradas de 01 a 26.
3. Cole os tokens forjados no Base Environment (seção 2).
4. Rode a pasta 1 primeiro (ela grava os três tokens válidos) e depois as demais na ordem
   (Collection Runner ou uma a uma). Cada execução completa tem 68 testes automáticos.

Variáveis do Base Environment:

| Variável | Quem preenche | Uso |
|---|---|---|
| `base_url` | já vem (`http://localhost:3000/v1`) | mude só se a porta for outra |
| `token` | script da requisição 01 | manutenção |
| `token_admin` | script da requisição 02 | admin |
| `token_consulta` | script da requisição 03 (expira em 15 minutos) | consulta |
| as sete de tokens forjados | você, a partir da saída do script | pastas 4 e 5 |

## 4. O que cada pasta prova

| Pasta | Prova |
|---|---|
| 1 · Autenticação | Login da manutenção e do admin e sessão do quiosque; grava os três tokens válidos. |
| 2 · Token de consulta e perfis errados (403) | O token de consulta é barrado em `GET /v1/ferramentas`, `POST /v1/emprestimos`, `GET /v1/auditoria`, `GET /v1/opcoes` e `GET /v1/dashboard`; manutenção e admin também são barrados na rota exclusiva do quiosque. É o primeiro cenário do "pronto quando" da issue. |
| 3 · Acessos que devem passar (200) | O contraponto: o quiosque lê a própria lista e `/auth/me`; manutenção e admin leem as opções; a manutenção lê as ferramentas. |
| 4 · Sem token e token vencido (401) | Sem token, cabeçalho malformado, texto que não é JWT e tokens vencidos (de manutenção e de consulta, em rota de balcão e do quiosque). É o segundo cenário do "pronto quando". |
| 5 · Tokens forjados (401) | `alg: none`, outro algoritmo, `aud` trocado nos dois sentidos e token sem `aud`. |

## 5. Observações

- Se a pasta 2 ou a 3 falhar com 401 no token de consulta, ele expirou (15 minutos): rode a requisição 03 de novo.
- Se `GET /v1/opcoes` com o token de consulta (requisição 07) devolver 200, a API está numa versão anterior à API-19.
- Se os tokens da pasta 1 derem 401 depois de atualizar a API, o login antigo ficou sem `aud`: rode a pasta 1 de novo.
- A sessão de consulta e o login têm limite de tentativas por minuto (429): não rode a coleção em laço contínuo.
