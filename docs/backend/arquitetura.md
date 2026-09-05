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

### Almoxarife

Acesso operacional completo: ferramentas, colaboradores, retiradas, devoluções, ocorrências, setores, categorias, atividades, importação, calendário e notificações.

### Consulta

Modo quiosque sem senha. O usuário informa matrícula ou utiliza o crachá. A API emite um token limitado por 15 minutos. O token permite somente consulta de ferramentas.

## Banco

O banco de dados adotado é o **PostgreSQL** (hospedado na nuvem via AWS RDS ou em infraestrutura dedicada). Todas as tabelas, tipos ENUM, triggers, constraints, views e índices parciais são mantidos nativamente via scripts SQL/migrations.

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
