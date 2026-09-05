# 🚀 SOUFER Tools — API REST (TypeScript)

Base estruturada da API REST em **TypeScript** do **SOUFER Tools**, sistema de controle de retiradas, devoluções, ocorrências e gestão de ferramentas do almoxarifado da Soufer (Projeto Integrado 2026.2).

---

## 🛠️ Stack Tecnológica

- **Runtime & Linguagem:** Node.js (v20+) com **TypeScript 5**
- **Execução & Hot-Reload:** `tsx` (TypeScript Execute com watch nativo)
- **Framework Web:** Express 4 / Express 5
- **Banco de Dados:** PostgreSQL (driver `pg` / `node-postgres` com Connection Pooling)
- **Segurança:** `helmet`, `cors`, `jsonwebtoken` (JWT), `bcryptjs`
- **Validação de Esquemas:** `zod`
- **Observabilidade & Logs:** `pino` + `pino-http` + `pino-pretty` com rastreamento por `requestId`
- **Documentação Interativa:** Swagger UI (`swagger-ui-express` + `swagger-jsdoc`)

---

## 📁 Estrutura de Pastas

```text
api/
├── .env.example                     # Modelo de variáveis de ambiente
├── .env                             # Configurações locais (ignorado no git)
├── package.json                     # Dependências e scripts
├── tsconfig.json                    # Configuração do TypeScript
├── README.md                        # Este documento
├── db/
│   ├── migrations/
│   │   └── 0001_init.sql            # DDL completo das 11 tabelas, enums, triggers e views
│   └── seed.sql                     # Carga de dados iniciais de teste
├── scripts/
│   ├── migrate.ts                   # Runner de migrations no PostgreSQL
│   └── seed.ts                      # Runner de seed com senhas criptografadas
└── src/
    ├── app.ts                       # Configuração do Express, middlewares e rotas
    ├── server.ts                    # Inicialização do servidor HTTP e graceful shutdown
    ├── config/
    │   ├── database.ts              # Pool PostgreSQL (pg) e helper de query/transação
    │   ├── env.ts                   # Carregamento e validação tipada de variáveis de ambiente
    │   └── swagger.ts               # Configuração OpenAPI/Swagger JSDoc
    ├── types/
    │   └── express.d.ts             # Extensão de tipos do Express para req.usuario
    ├── controllers/                 # Camada de controle (recebe requisição, chama service e responde)
    │   ├── authController.ts        # Login, me e sessão de consulta
    │   └── healthController.ts      # Healthcheck da API e diagnóstico do PostgreSQL
    ├── services/                    # Regras de negócio e acesso ao banco
    │   └── authService.ts           # Lógica de autenticação e emissão de tokens
    ├── middlewares/                 # Middlewares globais e de rota
    │   ├── auth.ts                  # Validação de JWT e injeção de req.usuario
    │   ├── authorize.ts             # RBAC (almoxarife vs consulta)
    │   ├── errorHandler.ts          # Captura central de erros e padronização
    │   ├── logger.ts                # Logging estruturado com Pino e requestId
    │   └── validate.ts              # Validação de esquemas Zod (body, query, params)
    ├── routes/
    │   └── v1/
    │       ├── index.ts             # Agregador de rotas com prefixo /v1
    │       ├── authRoutes.ts        # Rotas /v1/auth
    │       ├── consultaRoutes.ts    # Rotas /v1/consulta
    │       └── healthRoutes.ts      # Rota /v1/health
    ├── validators/                  # Esquemas Zod de entrada
    │   └── authValidator.ts
    └── utils/
        ├── errors.ts                # Classes de erro customizadas (AppError, NotFound, etc.)
        ├── pagination.ts            # Helpers para cálculo de paginação
        └── response.ts              # Helpers sendSuccess() e sendError()
```

---

## ⚙️ Como Rodar Localmente

### 1. Pré-requisitos
- **Node.js:** Versão 20 ou superior (`node -v`)
- **PostgreSQL:** Instância local (PostgreSQL nativo ou Docker) com o banco criado (`soufer_dev`).

### 2. Instalação das Dependências
Entre na pasta `api` e instale os pacotes:
```bash
cd api
npm install
```

### 3. Configuração do `.env`
Copie o modelo de ambiente se ainda não tiver o arquivo `.env`:
```bash
cp .env.example .env
```
Ajuste as credenciais do seu PostgreSQL no arquivo `.env` (usuário, senha, porta e banco).

### 4. Executar Migrations e Seed no Banco
Crie as tabelas, triggers e popule os dados de teste:
```bash
# Executa a migration inicial (11 tabelas, enums, triggers, views e índices)
npm run db:migrate

# Popula setores, grupos de ferramentas, atividades, colaboradores e ferramentas de teste
npm run db:seed
```

### 5. Iniciar o Servidor
```bash
# Modo desenvolvimento (com TypeScript e hot-reload via tsx)
npm run dev

# Checagem de tipos estáticos sem compilar
npm run typecheck

# Compilação para JavaScript puro em /dist
npm run build

# Execução do bundle compilado em produção
npm start
```
O servidor iniciará em `http://localhost:3000`.

---

## 📚 Documentação da API (Swagger UI)

Com o servidor rodando, acesse a documentação interativa no navegador:
👉 **[http://localhost:3000/docs](http://localhost:3000/docs)** (ou `/v1/docs`)

---

## 📐 Padrões de Comunicação

### 1. Padrão de Resposta de Sucesso
Todas as respostas de sucesso seguem a estrutura padronizada com o helper `sendSuccess(res, data, meta)`:
```json
{
  "data": {
    "id": 1,
    "nome": "Furadeira de Impacto Bosch",
    "status": "disponivel"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 2. Padrão de Resposta de Erro
Qualquer falha tratada ou erro disparado segue o envelope padrão:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erro de validação nos dados enviados",
    "details": [
      {
        "field": "email",
        "message": "Formato de e-mail inválido"
      }
    ]
  }
}
```

---

## 🔐 Autenticação e Perfis (RBAC)

O sistema possui dois modos de acesso via JWT:

1. **Almoxarife (`papel: 'almoxarife'`):**
   - Autenticado via `POST /v1/auth/login` com e-mail e senha.
   - Token válido por **8 horas**.
   - Acesso a todas as rotas operacionais.

2. **Consulta Quiosque (`papel: 'consulta'`):**
   - Autenticado via `POST /v1/consulta/sessao` informando matrícula (sem senha). O crachá não é um código à parte: fisicamente é a própria matrícula, por isso `colaboradores` não tem coluna `codigo_cracha` (removida na revisão DB-02) e a busca por matrícula já cobre os dois casos.
   - Token temporário válido por **15 minutos**.
   - Acesso restrito somente a rotas de leitura de disponibilidade.

> ⚠️ **Regra de Segurança Inegociável:**  
> Campos de autoria (`usuario_retirada_id`, `usuario_devolucao_id`, `registrada_por`) **NUNCA** são aceitos no corpo da requisição enviada pelo front-end. O back-end obtém o ID e o papel do usuário diretamente de `req.usuario` (injetado pelo middleware `authenticate`).

---

## 🧭 Como Desenvolver uma Nova Entidade / Módulo em TypeScript

Para manter a coerência e qualidade da arquitetura, siga este passo a passo ao criar um novo CRUD (ex: `ferramentas`):

### Passo 1: Criar o Esquema de Validação (`src/validators/ferramentaValidator.ts`)
```typescript
import { z } from 'zod';

export const criarFerramentaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  grupo_id: z.number().int().positive(),
  setor_id: z.number().int().positive(),
  localizacao: z.string().optional(),
});

export type CriarFerramentaInput = z.infer<typeof criarFerramentaSchema>;
```

### Passo 2: Criar o Service com as Queries SQL (`src/services/ferramentasService.ts`)
```typescript
import { query } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export interface ListarFerramentasParams {
  page: number;
  limit: number;
  offset: number;
  status?: string;
}

export class FerramentasService {
  static async listar({ page, limit, offset, status }: ListarFerramentasParams) {
    let sql = 'SELECT * FROM ferramentas WHERE ativo = true';
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    
    sql += ` ORDER BY nome ASC LIMIT ${limit} OFFSET ${offset}`;
    const result = await query(sql, params);
    return result.rows;
  }
}
```

### Passo 3: Criar o Controller (`src/controllers/ferramentasController.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { FerramentasService } from '../services/ferramentasService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

export class FerramentasController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const ferramentas = await FerramentasService.listar({
        page,
        limit,
        offset,
        status: req.query.status as string,
      });
      return sendSuccess(res, ferramentas, buildPaginationMeta(page, limit, 100));
    } catch (error) {
      return next(error);
    }
  }
}
```

### Passo 4: Criar as Rotas com Middlewares (`src/routes/v1/ferramentasRoutes.ts`)
```typescript
import { Router } from 'express';
import { FerramentasController } from '../../controllers/ferramentasController.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { criarFerramentaSchema } from '../../validators/ferramentaValidator.js';

const router = Router();

// Apenas almoxarifes podem listar ou criar ferramentas
router.use(authenticate, authorize('almoxarife'));

router.get('/', FerramentasController.listar);
router.post('/', validate({ body: criarFerramentaSchema }), FerramentasController.criar);

export default router;
```

### Passo 5: Registrar a Rota no Agregador (`src/routes/v1/index.ts`)
```typescript
import ferramentasRoutes from './ferramentasRoutes.js';

router.use('/ferramentas', ferramentasRoutes);
```

---

## 🧪 Credenciais Iniciais de Teste (após `npm run db:seed`)

| Perfil | Identificador / E-mail | Senha | Finalidade |
|---|---|---|---|
| **Almoxarife** | `almoxarife@soufer.com.br` | `123456` | Acesso operacional completo |
| **Consulta (Quiosque)** | Matrícula `MAT001` | *Sem senha* | Acesso temporário de 15 min |
