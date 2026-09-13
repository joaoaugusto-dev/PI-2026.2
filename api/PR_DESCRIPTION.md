## 📌 Descrição

Implementa os endpoints de consulta, listagem, detalhamento e histórico de ferramentas da API (`API-07`), permitindo que a aplicação Web liste e detalhe ferramentas reais com filtros avançados, suporte a leitor de código de barras e visualização de movimentações.

### O que foi feito:
- **`GET /v1/ferramentas`**:
  - Filtros por busca textual `q` (nome, código de tombamento, número de série, fabricante, modelo), `status`, `categoria_id` / `grupo_id` e `setor_id`.
  - Ordenação dinâmica flexível via `sort` (`nome`, `nome:asc`, `status:desc`, `codigo:asc`, `created_at`, etc.).
  - Paginação padronizada com envelope `{ dados, meta: { page, limit, total, total_paginas, ... } }`.
- **`GET /v1/ferramentas/:id`**:
  - Detalhamento completo com categoria/grupo e setor.
  - Para ferramentas do tipo `kit`, traz a lista de componentes vinculados (`itens`).
  - Se a ferramenta estiver com status `em_uso`, retorna os dados do empréstimo ativo (`emprestimo_atual`) com colaborador e data/hora.
- **`GET /v1/ferramentas/por-codigo/:codigo`** (e alias `/porcodigo/:codigo`):
  - Consulta rápida voltada para leitores de código de barras e busca manual por tombamento.
  - Suporta códigos com zeros à esquerda ou prefixos (`0045`, `SF000045`, `45`).
- **`GET /v1/ferramentas/:id/historico`**:
  - Retorna o histórico consolidado de empréstimos (`emprestimos`) com dados de quem retirou, datas e devolução.
  - Retorna o histórico de ocorrências (`ocorrencias`) registradas para a ferramenta (avarias, manutenções, etc.).
- **Suíte de Testes Automatizados**:
  - 16 testes de integração no Vitest cobrindo todos os cenários de sucesso, filtros, ordenação, parsing de código de barras e respostas de erro 404 / 401.

---

## 🎯 Tipo de Mudança

- [x] `feat`: Nova funcionalidade
- [ ] `fix`: Correção de bug / problema
- [ ] `refactor`: Refatoração sem alteração de comportamento
- [ ] `docs`: Documentação / markdown
- [ ] `chore`: Configurações, dependências, infraestrutura
- [x] `test`: Testes automatizados

---

## 🏢 Área / Módulo Afetado

- [x] Back-end (`/api`)
- [ ] Front-end (`/web`)
- [ ] Infraestrutura / Cloud (`AWS / PostgreSQL / Nuvem`)
- [ ] Documentação / Banco de Dados (`/docs`)

---

## 🧪 Como Testar e Validar

1. **Executar a suíte de testes automatizados:**
   ```bash
   cd api
   npm test
   # ou npx vitest run src/tests/ferramenta.test.ts
   ```
2. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
3. **Autenticar e testar as rotas no Insomnia / Swagger / cURL:**
   - Obter o token JWT via `POST /v1/auth/login`.
   - `GET /v1/ferramentas?q=Furadeira&status=disponivel&page=1&limit=10&sort=nome:asc`
   - `GET /v1/ferramentas/1`
   - `GET /v1/ferramentas/por-codigo/0001`
   - `GET /v1/ferramentas/1/historico`

---

## 📸 Evidências (Screenshots / Insomnia / Swagger / Logs)

```text
✓ src/tests/pagination.test.ts (6 tests)
✓ src/tests/authorize.test.ts (3 tests)
✓ src/tests/errorHandler.test.ts (9 tests)
✓ src/tests/auth.test.ts (5 tests)
✓ src/tests/ferramenta.test.ts (16 tests)

Test Files  5 passed (5)
     Tests  39 passed (39)
```

---

## ✅ Definition of Done (DoD)

- [x] **Revisão:** Código pronto e formatado para revisão de PR.
- [x] **Limpeza & Segurança:** Sem credenciais expostas, utilizando Zod para validação rigorosa de parâmetros.
- [ ] **Responsividade (Front-end):** N/A (alteração exclusiva de API).
- [x] **Testes de API (Back-end):** 4 rotas testadas cobrindo cenários de sucesso, filtros e 404.
- [x] **Documentação:** Documentação OpenAPI / Swagger anotada em `ferramentaRoutes.ts`.
- [x] **Rastreabilidade:** Commits e branch seguem o padrão `feat(api-07)`.

---

## 🔗 Issues Relacionadas

Closes #
