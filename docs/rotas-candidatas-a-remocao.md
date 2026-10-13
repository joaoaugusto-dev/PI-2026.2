# Rotas candidatas a remoção

Rotas da API (`/v1`) testadas no Insomnia que hoje servem pouco à aplicação:
duplicam outra rota, não têm quem as chame ou dependem de uma decisão que pode
torná-las inúteis. É só um levantamento. Nenhuma rota foi removida.

O inventário completo, com todas as rotas e o motivo de cada avaliação, está em
[rotas-insomnia.md](rotas-insomnia.md).

## Resumo

| # | Rota | Motivo | Sugestão |
|---|---|---|---|
| 1 | `PUT /setores/:id` | Faz o mesmo que `PATCH /setores/:id` | Remover o `PUT` |
| 2 | `PUT /categorias/:id` | Faz o mesmo que `PATCH /categorias/:id` | Remover o `PUT` |
| 3 | `PUT /atividades/:id` | Faz o mesmo que `PATCH /atividades/:id` | Remover o `PUT` |
| 4 | `PATCH /ferramentas/:id/etiqueta-impressa` | Só serve à etiqueta adesiva, que a visita técnica disse não sobreviver ao uso | Aguardar a decisão DB-01 e remover se a etiqueta sair |
| 5 | `GET /feriados/dia-util` | Nada no back-end nem no front chama | Remover, ou manter só se o calendário for feito |
| 6 | `GET /feriados/dias-uteis` | Nada no back-end nem no front chama | Remover, ou manter só se o calendário for feito |
| 7 | `GET /auth/me` | O login já devolve os dados do usuário e o front não chama | Remover, ou manter só se o front precisar revalidar a sessão |

## Detalhes

### 1 a 3. `PUT` duplicado em setores, categorias e atividades

- Cada uma dessas três famílias tem `PUT /:id` e `PATCH /:id` apontando para o
  mesmo controller e o mesmo schema de validação. O schema é parcial (todos os
  campos são opcionais), então o `PUT` já se comporta como `PATCH`.
- O mesmo problema já foi corrigido em ferramentas (ver
  [api-07-put-para-patch.md](issues/api-07-put-para-patch.md)).
- A coleção do Insomnia testa só o `PUT` (requisições F9-04, F9-09 e F9-14).
  O `PATCH` não tem requisição.
- **O que muda ao remover o `PUT`:** as rotas em `api/src/routes/v1/setorRoutes.ts`,
  `categoriaRoutes.ts` e `atividadeRoutes.ts` (com a documentação Swagger de
  cada uma), os testes em `api/src/tests/` que chamam `.put(...)` (por exemplo
  `atividade.test.ts`) e as três requisições da coleção, que passam para `PATCH`.

### 4. `PATCH /ferramentas/:id/etiqueta-impressa`

- Só grava `etiqueta_impressa_em`, a data em que a etiqueta com código de barras
  foi impressa.
- A visita técnica à Soufer (DB-01) levantou que a etiqueta adesiva não
  sobrevive ao uso na manutenção. Se a decisão for o código curto gravado a
  lápis elétrico, não há etiqueta para marcar como impressa.
- **O que muda ao remover:** a rota, o controller e o serviço da ferramenta
  (`marcarEtiquetaImpressa`), o teste em `ferramentaService.test.ts`, as
  requisições F11 e F35 da coleção e, se a coluna também sair, uma migration
  para `etiqueta_impressa_em`.
- **Não remover antes da ata do DB-01.** Ver
  [decisoes-pendentes.md](decisoes-pendentes.md).

### 5 e 6. `GET /feriados/dia-util` e `GET /feriados/dias-uteis`

- São públicas (sem login) e nenhuma regra da API as usa. O front também não.
- Existem para o calendário e o cálculo de prazos (Regra 9, feriados da
  BrasilAPI com cache em tabela própria). Se o calendário do front não for
  implementado, elas só ocupam espaço.
- **O que muda ao remover:** as duas rotas em `feriadoRoutes.ts`, os métodos do
  controller, o validator (`verificarDiaUtilQuerySchema` e
  `calcularDiasUteisQuerySchema`), os casos em `feriado.test.ts` e as
  requisições F8-02 e F8-03.
- `GET /feriados` e `POST /feriados/sincronizar` não entram na lista: a
  primeira alimenta qualquer calendário e a segunda atualiza o cache.

### 7. `GET /auth/me`

- Devolve `{ id, nome, papel, matricula }` do usuário logado. O login e o
  próprio token já trazem esses dados, e o front não chama a rota.
- A rota foi apresentada ao time do front em
  [mudancas-para-o-front.md](mudancas-para-o-front.md). Antes de remover, confirmar
  com o front se ela é usada para revalidar a sessão ao recarregar a página.
- **O que muda ao remover:** `authRoutes.ts`, `authController.ts` e os casos em
  `auth.test.ts`. Não há requisição dela no Insomnia.

## Observações

- "Não usa" olha o front atual, que ainda é inicial. Rotas planejadas para
  telas que não existem (calendário, por exemplo) podem parecer sem uso agora.
- O arquivo antigo `api/docs/insomnia-collection.json` também cita várias
  dessas rotas. Se alguma for removida, decidir se ele é atualizado ou apagado.
