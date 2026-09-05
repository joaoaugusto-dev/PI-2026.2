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
   JWT_SECRET=gere_uma_chave_jwt_secreta_longa_e_aleatoria_aqui
   JWT_EXPIRES_IN=8h
   JWT_CONSULTA_EXPIRES_IN=15m
   CORS_ORIGIN=https://app.seudominio.com
   ```
4. Na aba **Domains**:
   - Clique em **Add Domain**.
   - **Host:** `api.seudominio.com`
   - **Path:** `/`
   - **Container Port:** `3000`
   - **HTTPS / SSL:** Habilite o Let's Encrypt.
5. Clique em **Deploy**.

---

## 4. Passo 3: Executar as Migrations e o Seed no Banco

Após o primeiro deploy da API com o banco conectado:

1. No Dokploy, abra a aplicação `soufer-tools-api` e vá na aba **Terminal / Exec** (ou Console do container).
2. Execute os comandos de inicialização das tabelas e dados:
   ```bash
   # Executa a migration inicial (11 tabelas, enums, triggers, views e índices)
   npm run db:migrate

   # Executa a carga inicial de setores, categorias, atividades e colaboradores
   npm run db:seed
   ```
3. Verifique se a saída indica sucesso (`✅ Migrations executadas com sucesso!`).

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
| **Healthcheck da API** | `https://api.seudominio.com/v1/health` | `{"status":"ok","db":"ok", ...}` (HTTP 200) |
| **Documentação Swagger** | `https://api.seudominio.com/docs` | Interface interativa do Swagger UI |
| **Aplicação Front-end** | `https://app.seudominio.com` | Tela de Login do SOUFER Tools |
| **Login do Almoxarife** | Via tela de Login | E-mail `almoxarife@soufer.com.br` / Senha `123456` |

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
