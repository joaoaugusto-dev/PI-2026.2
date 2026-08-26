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
[PostgreSQL / Supabase]
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
- A `service_role key` fica somente no back-end.
- RLS deve permanecer ativo nas tabelas.
- Autoria das operações críticas é obtida pelo JWT, e não pelo corpo da requisição.
- O prefixo atual da API é `/v1`.

## Perfis

### Almoxarife

Acesso operacional completo: ferramentas, colaboradores, retiradas, devoluções, ocorrências, setores, categorias, atividades, importação, calendário e notificações.

### Consulta

Modo quiosque sem senha. O usuário informa matrícula ou utiliza o crachá. A API emite um token limitado por 15 minutos. O token permite somente consulta de ferramentas.

## Banco

A arquitetura mantém duas possibilidades:

1. PostgreSQL próprio hospedado em infraestrutura da Soufer.
2. Supabase como alternativa rápida para o projeto.

A decisão depende da autorização do TI da Soufer.

## Infraestrutura prevista

- API: AWS EC2 com Node 20, PM2 e Nginx.
- Front-end: AWS S3 + CloudFront.
- Monitoramento: CloudWatch.
- Banco: Supabase/PostgreSQL.
