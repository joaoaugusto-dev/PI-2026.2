# API-07 — Troca de `PUT` por `PATCH` na atualização de ferramentas

Issue de origem: [#43 — API-07 — CRUD completo de Ferramentas](https://github.com/joaoaugusto-dev/PI-2026.2/issues/43)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Data: 19/09/2026

Este documento existe para que quem for trabalhar em outra issue saiba exatamente
o que mudou e o que não mudou, sem precisar ler o histórico.

## Resumo

A rota de atualização de ferramentas passou de `PUT /v1/ferramentas/:id` para
`PATCH /v1/ferramentas/:id`.

**Motivo:** a rota sempre teve comportamento de atualização **parcial** (basta
enviar os campos que mudaram; o schema é `.partial()`), e pela convenção REST
isso é `PATCH`. `PUT` significa substituir o recurso inteiro. O método estava
incoerente com o comportamento.

**Nada mais mudou.** Corpo da requisição, validações, respostas, códigos de erro,
regras de negócio, autenticação (`manutencao`) e a função de serviço são
exatamente os mesmos.

## Antes e depois

| | Antes | Depois |
|---|---|---|
| Método e rota | `PUT /v1/ferramentas/:id` | `PATCH /v1/ferramentas/:id` |
| Corpo | 1 ou mais campos editáveis | igual |
| Sucesso | 200 com a ferramenta atualizada | igual |
| Corpo vazio | 400 `VALIDATION_ERROR` | igual |
| ID inexistente | 404 `FERRAMENTA_NOT_FOUND` | igual |
| Chamar com `PUT` | 200 | **404** (a rota `PUT` deixou de existir) |

Campos editáveis (inalterados): `nome`, `descricao`, `marca`, `modelo`, `grupoId`,
`subgrupoId`, `setorId`, `localizacao`. `status`, `codigo_identificacao` e `ativo`
continuam fora desta rota (têm ações próprias: `disponibilizar` e `DELETE`).

## O que foi alterado nos arquivos

Código da API (apenas 3 linhas):

- [`api/src/routes/v1/ferramentaRoutes.ts`](../api/src/routes/v1/ferramentaRoutes.ts):
  `router.put(` virou `router.patch(`, e a anotação Swagger `put:` virou `patch:`
  (o Swagger em `/docs` já mostra o método novo).
- [`api/src/controllers/ferramentaController.ts`](../api/src/controllers/ferramentaController.ts):
  apenas o comentário do método `atualizar` (`PUT` → `PATCH`).

Não foram alterados: o serviço (`ferramentaService.ts`), o validator
(`ferramentaValidator.ts`), o schema do banco, as migrations e os testes
existentes. O CORS não precisou de ajuste (o `cors` padrão já libera `PATCH`).

Documentação e coleções de teste:

- [`docs/backend/api.md`](backend/api.md): linha da tabela de endpoints.
- [`docs/issues/api-07-crud-ferramentas.md`](api-07-crud-ferramentas.md): descrição da
  rota e exemplos de teste.
- [`api/docs/insomnia-collection.json`](../api/docs/insomnia-collection.json):
  os dois requests de atualização (sucesso e não encontrada) agora usam `PATCH`.
- [`docs/insomnia/`](insomnia/): a coleção nova e o tutorial já usam `PATCH`
  (requisições 10, 24 e 34).

## Atenção: é uma mudança incompatível dentro do `/v1`

O CLAUDE.md diz que qualquer quebra de contrato vai para `/v2`, e nunca edita
`/v1` de forma incompatível. Esta troca é incompatível para quem chama a rota
com `PUT`. Ela foi feita no `/v1` por decisão da equipe, porque ainda não há
consumidor: na busca feita em `web/src`, não existe nenhuma chamada a
`PUT /ferramentas` (o front só tem o cliente Axios base e a página de status).

**Se você for consumir esta rota no front (ou em outra issue), use `PATCH`.**
Qualquer código novo escrito com `PUT` receberá 404.

## Como testar

Com a API rodando (`npm run dev` em `api/`):

```
PATCH /v1/ferramentas/{id}   {"marca":"Makita"}   -> 200
PATCH /v1/ferramentas/{id}   {}                    -> 400 VALIDATION_ERROR
PATCH /v1/ferramentas/999999 {"marca":"X"}         -> 404 FERRAMENTA_NOT_FOUND
PUT   /v1/ferramentas/{id}   {"marca":"Makita"}   -> 404 (rota removida)
```

Pelo Insomnia, importe `docs/insomnia/soufer-tools-ferramentas.json` e rode as
requisições 10, 24 e 34 (ou a coleção inteira; veja o tutorial em
[`insomnia/teste-api-crud-ferramentas.md`](insomnia/teste-api-crud-ferramentas.md)).

Verificações feitas nesta alteração:

- `npm run typecheck` sem erros.
- `npm test`: 69 testes passando (os testes existentes não cobrem esta rota).
- Coleção do Insomnia executada contra a API: 40 requisições, 83 testes
  automáticos sem falhas (a requisição 16 não foi executada nessa rodada por
  alterar dados do seed).
- `PUT /v1/ferramentas/:id` passou a responder 404.

## Pendências (não feitas de propósito)

- Não há teste automatizado (Vitest/Supertest) da rota de atualização; a
  cobertura desta rota é o teste manual acima. Fica para quem quiser cobrir.
- Não foram tocados os outros pontos em que a API foge da convenção REST
  (`DELETE` respondendo 200 em vez de 204, e chave estrangeira inexistente
  respondendo 400). Estão descritos no tutorial do Insomnia, na seção
  "Convenções REST".
