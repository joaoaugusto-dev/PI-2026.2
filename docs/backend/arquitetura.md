# Arquitetura

## Visão geral

O sistema é organizado em três camadas principais:

```text
[Usuário]
    |
    v
[React / Front-end]
    |
    | HTTP / JSON
    v
[API Node.js]
    |
    v
[PostgreSQL]
```

Integrações externas:

```text
BrasilAPI ---> API ---> tabela feriados
Leitor Code128 ---> Front-end ---> API
AWS CloudWatch ---> monitoramento
```

## Princípios

- O front-end não acessa diretamente o banco.
- A API é responsável por autenticação, validação e regras de negócio.
- Segredos ficam em `.env`.
- Credenciais e connection strings de banco ficam somente no back-end.
- Autoria das operações críticas é obtida pelo JWT, e não pelo corpo da requisição.
- O prefixo atual da API é `/v1`.

## Perfis

### Manutenção

Acesso operacional completo: ferramentas, colaboradores, retiradas, devoluções, ocorrências, setores, categorias, atividades, importação, calendário e notificações.

**Login (issue API-150):** `POST /v1/auth/login` recebe `{ "matricula": "0001", "senha": "..." }` — não existe e-mail no ambiente fabril. A matrícula tem exatamente 4 dígitos numéricos (`0001` a `9999`) e vive só em `colaboradores` (regra imposta por `CHECK` no banco e por Zod na API); a conta de acesso (`usuarios`) aponta para o colaborador por `colaborador_id`, então uma pessoa tem uma matrícula só. O token JWT (validade de 7 dias) e o objeto `usuario` trazem `id`, `nome`, `matricula` e `papel`. Erros: `401 INVALID_CREDENTIALS` ("Matrícula ou senha inválidos"), `401 USER_INACTIVE` (conta ou colaborador desativado, no login ou no meio da sessão) e `400 VALIDATION_ERROR` (matrícula fora do padrão). O middleware `authenticate` lê nome e matrícula do banco a cada requisição.

### Consulta

Modo quiosque sem senha (só matrícula, sem crachá). O operador informa apenas a matrícula (4 dígitos, sem senha). A API busca a matrícula em `colaboradores`, aceita só colaborador ativo e emite um token limitado por 15 minutos. O token permite somente consulta de ferramentas. Como não há senha, `POST /v1/consulta/sessao` tem limite de 30 tentativas por minuto por IP (429 `TOO_MANY_REQUESTS`).

### Admin

Papel adicional no enum `papel_usuario` (`admin`), separado de `manutencao`
(decisão do time em 22/09/2026, issue API-149 — substitui a alternativa
"qualquer manutenção ativo aprova outro" cogitada na issue original). Só um
`admin` pode aprovar um auto-cadastro pendente via
`PATCH /v1/usuarios/:id/ativar` ou listar os pendentes via
`GET /v1/usuarios?ativo=false`. Nesta primeira versão não existe rota para
promover um usuário a `admin` pela API — a promoção é feita direto no banco,
até o time decidir se cria um fluxo de gestão de admins (ver
`/docs/decisoes-pendentes.md`).

### Auto-cadastro de manutenção (fluxo)

1. `POST /v1/auth/registro` (público) recebe `matricula` (4 dígitos numéricos)
   e `senha`. O nome vem do cadastro do colaborador; `papel`, `ativo` e `nome`
   enviados no corpo são ignorados. A matrícula precisa existir em
   `colaboradores` (ativo) e ainda não ter conta de acesso. Cria a conta com
   `papel = 'manutencao'` e `ativo = false` e retorna 201 sem token — o usuário
   não pode logar ainda. Erros: 404 `COLABORADOR_NOT_FOUND` (matrícula sem
   colaborador ativo), 409 `MATRICULA_JA_CADASTRADA` (a matrícula já tem conta,
   inclusive em cadastros simultâneos, barrados pelo índice único de
   `usuarios.colaborador_id`), 400 (matrícula fora do padrão ou senha curta) e
   429 (mais de 10 tentativas por minuto por IP, porque as respostas 404/409
   revelam quais matrículas existem).
2. `POST /v1/auth/login` com esse usuário retorna 401 `USER_INACTIVE` até a
   aprovação.
3. Um `admin` autenticado lista os pendentes em
   `GET /v1/usuarios?ativo=false` (cada item traz `nome` e `matricula` do
   colaborador) e aprova com
   `PATCH /v1/usuarios/:id/ativar`, que exige papel `admin` (senão 403
   `ACCESS_DENIED`) e retorna 409 `USUARIO_JA_ATIVO` se o usuário já estiver
   ativo.
4. Depois da aprovação, o login volta a funcionar normalmente.

## Banco

O banco de dados adotado é o **PostgreSQL** (hospedado na nuvem via AWS RDS ou em infraestrutura dedicada). Todas as tabelas, tipos ENUM, triggers, constraints, views e índices parciais são mantidos nativamente via scripts SQL/migrations.

As extensões `unaccent` e `pg_trgm` são usadas na identificação de colaborador
(`GET /v1/colaboradores/identificar`, API-09): matrícula exata primeiro e,
se não achar, nome tolerante a acento e erro de digitação via um índice GIN
(`gin_trgm_ops`) sobre uma função `IMMUTABLE` que encapsula `unaccent()`
(exigido pelo Postgres para indexar a expressão). Detalhes em
`docs/banco-de-dados/dicionario-de-dados.md`.

## Infraestrutura prevista

- API: AWS EC2 com Node 20, PM2 e Nginx.
- Front-end: AWS S3 + CloudFront.
- Monitoramento: CloudWatch.
- Banco: PostgreSQL (AWS RDS).

## CI/CD e revisão automatizada

O repositório usa a GitHub Action oficial `anthropics/claude-code-action` em dois
workflows (`.github/workflows/`):

- **`claude.yml`** — assistente sob demanda. Dispara quando alguém menciona
  `@claude` em um comentário de issue, comentário de review, review de PR ou no
  corpo/título de uma issue. Usa o token em `secrets.CLAUDE_CODE_OAUTH_TOKEN`.
- **`claude-code-review.yml`** — revisão automática. Dispara em todo PR aberto,
  atualizado ou reaberto e roda o plugin `code-review` do
  `claude-code-plugins`, postando comentários inline no PR.

Não substitui a aprovação humana exigida na Seção 5/6 do `CLAUDE.md`
(pelo menos um aprovador) — é uma checagem automática adicional antes da
revisão humana.
