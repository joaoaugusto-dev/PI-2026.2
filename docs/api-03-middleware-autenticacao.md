# API-03 — Middleware de autenticação (registro de execução)

Issue: [#38 — API-03 — Middleware de autenticação](https://github.com/joaoaugusto-dev/PI-2026.2/issues/38)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-02 (concluída)
Milestone: Sprint 2
Data da execução: 11/09/2026

## Objetivo

Todo endpoint protegido consegue saber quem está logado, sem depender do que o
front manda no corpo da requisição.

## O que já estava pronto antes desta execução

O essencial do passo a passo já tinha sido implementado em commits anteriores
(`4d06059`, `15d9b31`, `0177f47`, `057edaa`), sem que a issue #38 fosse
formalmente fechada:

- **Middleware `authenticate`**: [`api/src/middlewares/auth.ts`](../api/src/middlewares/auth.ts)
  — valida o header `Authorization: Bearer <token>`, verifica o JWT com
  `jsonwebtoken` e injeta `req.usuario` (id, nome, papel, email, matrícula).
  Trata token ausente, malformado, expirado e inválido, cada um com um código
  de erro próprio (`TOKEN_NOT_PROVIDED`, `TOKEN_MALFORMATTED`,
  `TOKEN_EXPIRED`, `TOKEN_INVALID`).
- **Middleware `authorize(...papeis)`**: [`api/src/middlewares/authorize.ts`](../api/src/middlewares/authorize.ts)
  — bloqueia com 403 (`ACCESS_DENIED`) se `req.usuario.papel` não estiver
  entre os papéis permitidos; retorna 401 se não houver usuário autenticado.
- **Rota de teste `GET /v1/auth/me`**: [`api/src/routes/v1/authRoutes.ts`](../api/src/routes/v1/authRoutes.ts)
  + [`api/src/controllers/authController.ts`](../api/src/controllers/authController.ts)
  — protegida por `authenticate`, devolve `req.usuario`.
- **`POST /v1/auth/login`**: já implementado em
  [`api/src/services/authService.ts`](../api/src/services/authService.ts),
  com bcrypt para verificar a senha e JWT próprio para emitir o token.
- **Item "se sobrar tempo"**: `AuthService.criarSessaoConsulta` já emite JWT
  com `papel: 'consulta'` e expiração de 15 minutos
  (`env.jwt.consultaExpiresIn`), reaproveitando os mesmos middlewares
  `authenticate`/`authorize` — pronto para o Sprint 6.

Faltavam os testes automatizados e o registro de execução para fechar o DoD.

## Divergência sinalizada na issue

O texto original da issue pede validar "o JWT emitido pelo Supabase Auth".
Essa decisão foi superada pelo `CLAUDE.md` (decisão arquitetural de banco e
autenticação: PostgreSQL próprio + AuthService próprio com `bcryptjs` e
`jsonwebtoken`, sem Supabase/Supabase Auth) — mesmo tipo de divergência já
sinalizada nas issues DB-06, DB-07, DB-08 e API-02. O código implementado
segue corretamente a decisão do `CLAUDE.md`. Comentário deixado na issue #38
explicando o ponto.

## O que foi feito nesta rodada

Criados `api/src/tests/auth.test.ts` e `api/src/tests/authorize.test.ts` com
Vitest + Supertest (dependências adicionadas ao projeto, junto com o script
`npm test`):

- `GET /v1/auth/me`:
  - token válido → `200` com `data.usuario` preenchido
  - sem token → `401 TOKEN_NOT_PROVIDED`
  - header fora do formato `Bearer <token>` → `401 TOKEN_MALFORMATTED`
  - token inválido → `401 TOKEN_INVALID`
  - token expirado → `401 TOKEN_EXPIRED`
- `authorize(...papeis)`:
  - papel permitido → `next()` sem erro
  - papel fora da lista → `next(ForbiddenError)` (403)
  - sem usuário autenticado → `next(UnauthorizedError)` (401)

```
$ npm test

 Test Files  2 passed (2)
      Tests  8 passed (8)
```

`npm run typecheck` também rodado sem erros após as mudanças.

Também testado ao vivo (`npm run dev` local) o caso de erro exigido pelo DoD
(Seção 6, "caso de sucesso e caso de erro"):

```
GET /v1/auth/me (sem token)

HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{
  "error": {
    "code": "TOKEN_NOT_PROVIDED",
    "message": "Token de autenticação não fornecido",
    "details": []
  }
}
```

Adicionada também a requisição `GET /v1/auth/me (sem token)` na coleção do
Insomnia (`api/docs/insomnia-collection.json`), que só tinha o caso de
sucesso.

## Issue no GitHub

O corpo original da issue #38 não foi alterado (fica como registro histórico
do que foi pedido). As atualizações foram feitas via comentário na issue
[#38](https://github.com/joaoaugusto-dev/PI-2026.2/issues/38):

- Primeiro comentário: sinalizando a divergência do Supabase Auth.
- Segundo comentário: registrando a conclusão dos testes automatizados, o
  caso de erro adicionado ao Insomnia e o link para este documento.

## Pendências

Nenhuma relacionada ao escopo desta issue. PR `feat/api-03-middleware-auth`
aberto contra `sprint/02`.
