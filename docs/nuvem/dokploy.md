# Guia de Deploy no Dokploy — SOUFER Tools (PI 2026.2)

Este documento descreve o passo a passo completo para hospedar o monorepo **SOUFER Tools** no **Dokploy** (PaaS self-hosted baseado em Docker e Traefik), operando como ambiente de homologação, testes contínuos ou Plano B de infraestrutura.

---

## 1. Arquitetura da Solução no Dokploy

No Dokploy, a melhor prática para monorepos é criar **dois aplicativos separados** vinculados ao mesmo repositório Git, além de um **serviço de banco de dados gerenciado**:

```text
[ Internet / Usuário ]
          │
          ▼
┌─────────────────── Dokploy (Traefik Reverse Proxy) ───────────────────┐
│                                                                       │
│  HTTPS: app.seudominio.com ──► [ Container Web (React SPA) ] (Porta 80)│
│                                           │                           │
│                                           │ (Requisições HTTP / JSON) │
│                                           ▼                           │
│  HTTPS: api.seudominio.com ──► [ Container API (Express) ] (Porta 3000)│
│                                           │                           │
│                                           │ (Pool pg / TCP 5432)      │
│                                           ▼                           │
│                                [ Container PostgreSQL ]               │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Passo 1: Criar o Banco de Dados PostgreSQL

1. No painel do Dokploy, acesse seu Projeto/Ambiente e clique em **Create Service** ➔ **Database** ➔ **PostgreSQL**.
2. Defina os parâmetros:
   - **Name:** `soufer-postgres`
   - **Database Name:** `soufer_dev` (ou `soufer_prod`)
   - **Database User:** `postgres`
   - **Database Password:** Defina uma senha forte.
3. Clique em **Create & Deploy**.
4. Anote o **Internal Host** (geralmente `soufer-postgres` ou o nome do container na rede interna do Docker) e a **porta interna** (`5432`).

---

## 3. Passo 2: Criar e Configurar a Aplicação da API (`/api`)

1. No Dokploy, clique em **Create Service** ➔ **Application**.
2. Preencha as configurações gerais:
   - **Name:** `soufer-tools-api`
   - **Source:** `GitHub` (ou Git Provider configurado)
   - **Repository:** `joaoaugusto-dev/PI-2026.2`
   - **Branch:** `develop` (ou sua branch de sprint)
   - **Build Type:** `Nixpacks`
   - **Base Directory:** `api`
3. Na aba **Environment** (Variáveis de Ambiente), adicione:
   ```env
   NODE_ENV=production
   PORT=3000
   DB_HOST=soufer-postgres
   DB_PORT=5432
   DB_NAME=soufer_dev
   DB_USER=postgres
   DB_PASSWORD=sua_senha_do_postgres
   DB_SSL=false
   # openssl rand -base64 48 — a API não sobe com menos de 32 caracteres
   JWT_SECRET=gere_uma_chave_jwt_secreta_longa_e_aleatoria_aqui
   JWT_EXPIRES_IN=7d
   JWT_CONSULTA_EXPIRES_IN=15m
   CORS_ORIGIN=https://app.seudominio.com
   # obrigatório atrás do Traefik: sem ele todos os usuários aparecem com o IP do proxy
   # e o limite de 10 logins/min passa a valer para a fábrica inteira
   TRUST_PROXY_HOPS=1
   # fotos das ferramentas: aponte para um volume persistente (aba Advanced → Volumes)
   UPLOADS_DIR=/app/data/ferramentas
   ```
   > **Não publique a porta 3000 da API diretamente.** Com `TRUST_PROXY_HOPS=1` a API confia no
   > `X-Forwarded-For`; acessada sem o proxy na frente, qualquer cliente forja o próprio IP e escapa
   > dos limites de tentativa. O único caminho até a API deve ser o domínio do Traefik.
4. Na aba **Domains**:
   - Clique em **Add Domain**.
   - **Host:** `api.seudominio.com`
   - **Path:** `/`
   - **Container Port:** `3000`
   - **HTTPS / SSL:** Habilite o Let's Encrypt.
5. Clique em **Deploy**.

---

## 4. Passo 3: Executar as Migrations e criar o primeiro admin

Após o primeiro deploy da API com o banco conectado:

1. No Dokploy, abra a aplicação `soufer-tools-api` e vá na aba **Terminal / Exec** (ou Console do container).
2. Execute:
   ```bash
   # cria/atualiza tabelas, gatilhos, views e índices (inclui a 0011 de desempenho)
   npm run db:migrate

   # primeiro admin real: imprime um link de uso único para a pessoa definir o próprio PIN
   npm run db:admin -- 0042 "Nome do Responsável" "Manutenção"

   # feriados nacionais (sugestão de previsão de devolução)
   npm run db:feriados
   ```
3. Abra o link impresso pelo `db:admin`, defina o PIN e entre. Pela tela de Cadastros, o admin cria
   setores, categorias e colaboradores (ou importa por CSV) e gera o link de acesso de cada operador.
   Rodar o `db:admin` de novo para uma matrícula que já é admin é **intencional** e serve como reset
   de senha: gera um link novo e invalida o anterior ainda não usado; o PIN atual continua valendo
   até a pessoa usar o link.

> **Não rode `npm run db:seed` em produção.** Ele cria as contas 0001, 0002 e 0053 com a senha
> `123456` e setores/categorias fictícios; com `NODE_ENV=production` o script se recusa a rodar.
> Se o container não tiver o `tsx` (devDependency), use as versões compiladas:
> `node dist/scripts/migrate.js` e `node dist/scripts/criar-admin.js <matrícula> "<nome>" "<setor>"`.

### Carga inicial do inventário

Importe primeiro os colaboradores e depois as ferramentas, pela tela de Cadastros ou por
`POST /v1/importacoes/:recurso` (modelo em `GET /v1/importacoes/:recurso/modelo`). Com a migration
0011 aplicada, 1.000 ferramentas entram em poucos segundos mesmo com o banco vazio; sem ela a
importação fica quadrática e passa do timeout do proxy (auditoria de 09/10/2026).

### Backup

Agende um `pg_dump` diário (Dokploy → banco → **Backups**, ou cron no host) e teste a restauração
uma vez antes de liberar o uso:
```bash
pg_dump -Fc -h <host> -U <usuario> soufer_prod > soufer_$(date +%F).dump
pg_restore -d soufer_restaurado soufer_AAAA-MM-DD.dump
```

---

## 5. Passo 4: Criar e Configurar a Aplicação Front-End (`/web`)

1. No Dokploy, clique em **Create Service** ➔ **Application**.
2. Preencha as configurações:
   - **Name:** `soufer-tools-web`
   - **Source:** `GitHub`
   - **Repository:** `joaoaugusto-dev/PI-2026.2`
   - **Branch:** `develop` (mesma branch)
   - **Build Type:** `Nixpacks`
   - **Base Directory:** `web`
3. Na aba **Environment**:
   ```env
   VITE_API_URL=https://api.seudominio.com/v1
   ```
   > `VITE_API_URL` é lida no **build** (não em tempo de execução): mudou o domínio da API, faça novo deploy.
   > O front sobe com `serve` (dependência fixa, sem download na subida) e os cabeçalhos de segurança
   > (CSP, `X-Frame-Options`, `nosniff`) vêm de `web/public/serve.json`. No S3 + CloudFront, replique-os
   > numa *Response headers policy*.
4. Na aba **Domains**:
   - Clique em **Add Domain**.
   - **Host:** `app.seudominio.com`
   - **Path:** `/`
   - **Container Port:** `80`
   - **HTTPS / SSL:** Habilite o Let's Encrypt.
5. Clique em **Deploy**.

---

## 6. Validação do Deploy

Com os três serviços no ar, teste os seguintes endpoints pelo navegador ou Insomnia:

| Teste | URL | Resultado Esperado |
|---|---|---|
| **Healthcheck da API** | `https://api.seudominio.com/v1/health` | `"status":"ok"` (HTTP 200); em produção sem nome do banco |
| **Documentação Swagger** | `https://api.seudominio.com/docs` | Interface interativa do Swagger UI |
| **Aplicação Front-end** | `https://app.seudominio.com` | Tela de Login do SOUFER Tools |
| **Login do admin** | Link impresso pelo `db:admin` | Define o PIN e entra no Dashboard |
| **Seed bloqueado** | `NODE_ENV=production npm run db:seed` | Recusado, sem criar contas |

---

## 7. Solução de Problemas Comuns (Troubleshooting)

### Erro de Conexão com o Banco (`ECONNREFUSED` / `ETIMEDOUT`)
- **Causa:** `DB_HOST` configurado como `localhost` ou `127.0.0.1`.
- **Solução:** No ambiente Docker do Dokploy, `localhost` refere-se ao próprio container da API. Utilize o nome do serviço/container do banco (ex: `soufer-postgres`).

### Erro de CORS no Front-End (`blocked by CORS policy`)
- **Causa:** O valor de `CORS_ORIGIN` na API não bate exatamente com a URL do front (ex: falta de `https://` ou barra extra no final).
- **Solução:** Configure na API exatamente a origem do front: `CORS_ORIGIN=https://app.seudominio.com`.

### Swagger sem Carregar Rotas em Produção
- **Causa:** Caminhos de arquivos estáticos apontando apenas para `.ts`.
- **Solução:** O `api/src/config/swagger.ts` já foi configurado para buscar em `./dist/src/routes/**/*.js` e `./dist/src/controllers/**/*.js`.
