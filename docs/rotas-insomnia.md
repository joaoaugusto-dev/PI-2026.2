# Rotas testadas no Insomnia: inventário e revisão

Levantamento das rotas da API (`/v1`) que as duas coleções do Insomnia
exercitam, com uma avaliação de quais fazem sentido e quais são candidatas a
revisão ou remoção. É um levantamento: nenhuma rota foi alterada por este
documento.

- Coleções: [soufer-tools-ferramentas.json](insomnia/soufer-tools-ferramentas.json) e
  [soufer-tools-colaboradores.json](insomnia/soufer-tools-colaboradores.json).
- Passo a passo de execução da coleção de ferramentas:
  [teste-api-crud-ferramentas.md](insomnia/teste-api-crud-ferramentas.md).
- Base do levantamento: código da branch `feat/api-149-auto-cadastro-aprovacao`
  (rotas em `api/src/routes/v1/`), as requisições das duas coleções e as
  chamadas feitas hoje pelo front (`web/src`).

## Como ler

- **Perfil** é quem pode chamar a rota. "manutenção" exige login com papel
  `manutencao`; "público" não exige token; "admin" exige papel `admin`;
  "manutenção e admin" aceita os dois. Escrita nos cadastros auxiliares
  (criar/editar/baixar setor e categoria; editar e inativar colaborador;
  editar e dar baixa em ferramenta) é só do `admin`, e as requisições dessas
  rotas usam o `{{ _.token_admin }}` do ambiente, que se obtém por
  `POST /auth/login` com um usuário admin (Regra 8 do `CLAUDE.md`).
- **Requisições** mostra o número da requisição na coleção e o status
  esperado. `F` é a coleção de ferramentas e `C` a de colaboradores. Só a
  coleção de ferramentas tem requisições para setores, categorias, atividades,
  feriados, opções e health. Na coleção de ferramentas, a numeração é
  contínua nas pastas 1 a 7 (`F04`) e recomeça em 01 nas pastas 8, 9 e 10, que
  aparecem como `F8-01`, `F9-04` e `F10-02` (pasta e número).
- **Front** indica se o front chama a rota hoje. O front ainda é inicial: quase
  nenhuma tela de negócio existe, então "não usa" não significa "inútil" por si
  só.

## Inventário das rotas testadas

### Autenticação e acesso

| Rota | Perfil | Requisições | Front | Avaliação |
|---|---|---|---|---|
| `POST /auth/login` | público | F01, C01 (200) | usa | Necessária. |
| `POST /consulta/sessao` | público | F02, C02 (200) | não | Necessária. É a entrada do quiosque (matrícula, sem senha, 15 min). A tela do quiosque ainda não existe. |

### Ferramentas (`/ferramentas`)

Leitura e criação: manutenção e admin. `por-codigo/:codigo`, `etiqueta-impressa` e
`disponibilizar` (operação de balcão): só manutenção. `PATCH /:id` e `DELETE /:id`: só admin.

| Rota | Requisições | Avaliação |
|---|---|---|
| `GET /ferramentas` | F03, F05, F06, F13, F15 (200); F17, F18 (401); F19 (403); F27, F28 (400) | Necessária (lista com filtros e paginação). |
| `POST /ferramentas` | F04 (201); F20 a F23 (400) | Necessária. |
| `GET /ferramentas/:id` | F07 (200); F25, F26 (400); F31, F38 (404) | Necessária. |
| `GET /ferramentas/por-codigo/:codigo` | F08 (200); F29, F30 (400); F32 (404) | Necessária. É a rota da leitura do código na retirada e na devolução. O `codigo_identificacao` é numérico de 1 a 9999, gerado por trigger e independente do `id`. A decisão pendente (DB-01: scanner ou código gravado a lápis elétrico) muda a etiqueta, mas não a necessidade de buscar por código curto. |
| `GET /ferramentas/:id/historico` | F09 (200); F33 (404) | Necessária, mas hoje só o cenário vazio é testado (ferramenta recém-criada). Sem retirada nem devolução implementadas, não há como testar um histórico com dados. |
| `PATCH /ferramentas/:id` | F10 (200); F24 (400); F34 (404) | Necessária. |
| `PATCH /ferramentas/:id/etiqueta-impressa` | F11 (200); F35 (404) | **Candidata a revisão.** Só grava a data de impressão da etiqueta adesiva. A visita técnica (DB-01) indicou que a etiqueta não sobrevive ao uso na manutenção. Se a decisão for o código gravado a lápis elétrico, a rota e a coluna `etiqueta_impressa_em` perdem o sentido. Aguardar a ata do DB-01. |
| `PATCH /ferramentas/:id/disponibilizar` | F12 (409); F16 (200); F36 (404) | Necessária. Única forma de sair de `indisponivel`, com auditoria e resolução das ocorrências abertas. |
| `DELETE /ferramentas/:id` | F14 (409); F37 (200); F39, F40 (404) | Necessária. Baixa lógica (`ativo = false`), bloqueada com empréstimo aberto. |

### Colaboradores (`/colaboradores`)

Leitura e criação (`POST` é o cadastro rápido da retirada): manutenção e admin.
`identificar` (leitura na retirada): só manutenção. `PATCH /:id` e
`DELETE /:id`: só admin.

| Rota | Requisições | Avaliação |
|---|---|---|
| `GET /colaboradores` | C03, C11, C12 (200); C20 (401) | Necessária (lista paginada com busca). |
| `POST /colaboradores` | C08, C17 (201); C16 (409); C21 (400) | Necessária. É o cadastro rápido no meio da retirada e também o que libera a matrícula para o auto-cadastro de usuário. |
| `GET /colaboradores/identificar` | C04, C05, C09 (200); C06 (404); C07 (400); 409 `COLABORADOR_AMBIGUO` (vários nomes, `details` traz id/nome/matrícula); C18 (401); C19 (403) | Necessária. Identifica por matrícula, nome ou crachá na retirada. Não é redundante com a listagem: devolve um único colaborador (ou 409 listando os candidatos se o nome for ambíguo) e tolera acento e erro de digitação. |
| `GET /colaboradores/:id` | C10 (200); C15, C23 (404) | Necessária. |
| `PATCH /colaboradores/:id` | C13 (200); C22 (400); C24 (404) | Necessária. |
| `DELETE /colaboradores/:id` | C14 (200); C25 (404) | Necessária. Inativação lógica. |

### Cadastros auxiliares (`/setores`, `/categorias`, `/atividades`)

`GET`: manutenção e admin em setores e categorias; escrita: só admin. Atividades
continuam só da manutenção (alimentam o campo de atividade da retirada).

As três famílias têm o mesmo conjunto de rotas: `GET /`, `POST /`, `GET /:id`,
`PUT /:id`, `PATCH /:id` e `DELETE /:id`.

| Rota | Requisições | Avaliação |
|---|---|---|
| `GET` e `POST` na coleção | F9-01 a F9-03 (setores), F9-06 a F9-08 (categorias), F9-11 a F9-13 (atividades) | Necessárias. |
| `GET /:id` | F9-02, F9-07, F9-12 (200) | Necessária. |
| `PUT /:id` | F9-04 (setores), F9-09 (categorias), F9-14 (atividades) (200) | **Duplicada de `PATCH /:id`.** |
| `PATCH /:id` | nenhuma | **Duplicada de `PUT /:id` e sem teste.** |
| `DELETE /:id` | F9-05, F9-10, F9-15 (200) | Necessária. Baixa lógica. |

`PUT` e `PATCH` apontam para o mesmo controller e o mesmo schema de validação,
que é parcial (todos os campos são opcionais), ou seja, o `PUT` já se comporta
como `PATCH`. Isso repete o que já foi corrigido em ferramentas (ver
[api-07-put-para-patch.md](issues/api-07-put-para-patch.md)). Sugestão:
manter só o `PATCH` nas três famílias e mudar as requisições F9-04, F9-09 e F9-14
para `PATCH`.

### Feriados (`/feriados`)

| Rota | Perfil | Requisições | Avaliação |
|---|---|---|---|
| `GET /feriados` | público | F8-01 (200) | Mantida, com ressalva abaixo. |
| `GET /feriados/dia-util` | público | F8-02 (200) | **Sem consumidor hoje.** |
| `GET /feriados/dias-uteis` | público | F8-03 (200) | **Sem consumidor hoje.** |
| `POST /feriados/sincronizar` | manutenção | F8-04 (200) | Mantida. Sincroniza com a BrasilAPI sob demanda. |

Nenhuma regra da API usa essas três rotas de consulta e o front também não. Elas
existem para o calendário e para o cálculo de prazos (Regra 9, feriados da
BrasilAPI com cache). Se o calendário do front (responsável: João) continuar no
escopo, mantê-las. Se não, são candidatas a remoção. Vale também decidir se
devem continuar públicas, já que as demais rotas de negócio exigem login.
Existe ainda o script `npm run db:feriados`, que faz a mesma sincronização
fora da API.

### Outras

| Rota | Perfil | Requisições | Front | Avaliação |
|---|---|---|---|---|
| `GET /opcoes` | qualquer usuário logado | F10-02 (200) | não | Necessária. Devolve setores, grupos e atividades numa chamada para preencher os formulários de retirada. |
| `GET /health` | público | F10-01 (200) | usa | Necessária (monitoramento e tela de status). |

## Rotas que existem e não estão em nenhuma coleção

Não há requisição no Insomnia para estas rotas. Elas só são cobertas pelos
testes automáticos (`npx vitest run` em `api`).

| Rota | Perfil | Front | Avaliação |
|---|---|---|---|
| `POST /auth/registro` | público | usa | Necessária (auto-cadastro, cria conta inativa). **Falta requisição.** |
| `GET /usuarios` (`?ativo=false`) | admin | usa | Necessária (lista pendentes). **Falta requisição.** |
| `PATCH /usuarios/:id/ativar` | admin | usa | Necessária (aprova o cadastro). **Falta requisição.** |
| `GET /auth/me` | qualquer usuário logado | não | **Candidata a revisão.** O login já devolve os dados do usuário e o front não chama esta rota. Mantê-la só se o front precisar revalidar a sessão ao recarregar a página. **Falta requisição.** |

## Resumo

| Situação | Rotas |
|---|---|
| Precisam de decisão do time | `PATCH /ferramentas/:id/etiqueta-impressa` (depende do DB-01) |
| Redundantes | `PUT /setores/:id`, `PUT /categorias/:id`, `PUT /atividades/:id` (ou os três `PATCH`, mantendo um só) |
| Sem consumidor hoje | `GET /feriados/dia-util`, `GET /feriados/dias-uteis`, `GET /auth/me` |
| Sem teste no Insomnia | `POST /auth/registro`, `GET /usuarios`, `PATCH /usuarios/:id/ativar`, `GET /auth/me` |
| Necessárias e cobertas | demais rotas de ferramentas, colaboradores, cadastros auxiliares, opções, health, login e sessão de consulta |

## Limites deste levantamento

- A avaliação de "sem consumidor" olha só o back-end e o front atuais. Rotas
  planejadas para telas ainda não construídas (retirada, devolução, quiosque,
  calendário) podem parecer sem uso agora.
- Não existem rotas de retirada, devolução nem ocorrências. O histórico da
  ferramenta e a regra de avaria na devolução ainda não têm como ser testados
  pelo Insomnia.
- Decisões que afetam a lista: DB-01 (etiqueta e código) e o fluxo de usuário e
  funções do admin, registrados em
  [decisoes-pendentes.md](decisoes-pendentes.md).
