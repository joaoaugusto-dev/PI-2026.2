# Guia — Como testar o CRUD de ferramentas no Insomnia

Este guia ensina o passo a passo para testar as rotas de `/v1/ferramentas` no
Insomnia, usando a collection já pronta do projeto. Serve tanto para validar o
DoD de uma issue (Seção 6 do `CLAUDE.md`: "rota nova testada no Insomnia/
Swagger com caso de sucesso e caso de erro") quanto para qualquer pessoa da
equipe que precise conferir se a API está respondendo como esperado.

Não é preciso saber programar para seguir este guia — só instalar o Insomnia,
importar um arquivo e clicar em "Send".

## 1. Pré-requisitos

- **Insomnia** instalado ([insomnia.rest](https://insomnia.rest/download)) —
  a versão gratuita (desktop) é suficiente.
- **API rodando localmente.** Na pasta `api/`:
  ```bash
  npm install        # só na primeira vez
  npm run db:migrate  # cria as tabelas no Postgres (soufer_dev)
  npm run db:seed     # popula com dados de teste (ferramentas, colaboradores, etc.)
  npm run dev          # sobe a API em http://localhost:3000
  ```
- **PostgreSQL** rodando e configurado no arquivo `api/.env` (copie de
  `api/.env.example` se ainda não existir).

Se `npm run dev` mostrar `"database":{"status":"connected"}` ao acessar
`http://localhost:3000/v1/health` no navegador, está tudo certo para começar.

## 2. Importando a collection no Insomnia

A collection já vem pronta com todas as rotas e os casos de erro mais comuns
— não é preciso criar nenhuma request do zero.

1. Abra o Insomnia.
2. No canto superior esquerdo, clique em **Application → Preferences** não é
   necessário; em vez disso, use **Create → Import From File** (ou arraste o
   arquivo direto para a janela do Insomnia).
3. Selecione o arquivo
   [`api/docs/insomnia-collection.json`](../../api/docs/insomnia-collection.json).
4. Uma nova collection chamada **"SOUFER Tools API"** vai aparecer na barra
   lateral, já com as pastas de requests (health, auth, consulta,
   ferramentas).

## 3. Selecionando o ambiente (Environment)

A collection usa variáveis (`{{ _.baseUrl }}`, `{{ _.token }}`,
`{{ _.tokenConsulta }}`) em vez de valores fixos, para não precisar editar
cada request na mão.

1. No canto superior esquerdo do Insomnia (abaixo do nome da collection), tem
   um seletor de ambiente — normalmente mostra **"No Environment"**.
2. Clique nele e selecione **"Base Environment"**.
3. Ele já vem com:
   ```json
   {
     "baseUrl": "http://localhost:3000",
     "token": "",
     "tokenConsulta": ""
   }
   ```
   Se a sua API estiver rodando em outra porta, edite `baseUrl` aqui (clique
   em **Manage Environments** no mesmo seletor).

## 4. Autenticando (pegando o token)

Quase todas as rotas de `/v1/ferramentas` exigem um token JWT de um usuário
com perfil `almoxarife` no cabeçalho `Authorization: Bearer <token>`. A
collection não faz isso sozinha — você precisa logar uma vez e colar o token
manualmente no ambiente.

1. Na sidebar, abra a request **`POST /v1/auth/login`**.
2. Clique em **Send**. O corpo já vem preenchido com um usuário de seed
   (`almoxarife@soufer.com.br` / `123456` — se o seu seed usa outro e-mail/
   senha, ajuste o corpo da request antes de enviar).
3. A resposta deve ser `200`, parecida com:
   ```json
   {
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "usuario": { "id": 3, "nome": "Almoxarife Principal", "papel": "almoxarife" }
     }
   }
   ```
4. Copie o valor de `data.token` (sem as aspas).
5. Volte em **Manage Environments** (passo 3) e cole esse valor no campo
   `token`. Salve.

A partir daqui, toda request que usa `Authorization: Bearer {{ _.token }}`
já vai autenticar automaticamente como almoxarife.

> **Token expira em 8h** (Regra 6 do `CLAUDE.md` — sessão de almoxarife). Se
> começar a receber `401 TOKEN_EXPIRED` depois de um tempo parado, repita
> este passo para pegar um token novo.

### Opcional: testando o perfil "consulta"

Algumas requests (ex.: `GET /v1/ferramentas (perfil consulta, 403)`) usam
`{{ _.tokenConsulta }}` de propósito, para provar que o perfil de quiosque
**não** pode acessar rotas de escrita/gestão. Para preencher essa variável:

1. Abra **`POST /v1/consulta/sessao`** e envie com um `identificador`
   (matrícula) que exista no seed.
2. Copie o `token` da resposta e cole em `tokenConsulta` no ambiente.
3. Esse token expira em **15 minutos** (Regra 8 do `CLAUDE.md`) — é normal
   precisar gerar de novo.

## 5. Testando as rotas de ferramentas

A sidebar tem uma request para cada cenário — sucesso e erro já vêm
separados por nome, então não é preciso adivinhar o que testar. A tabela
abaixo resume o que existe hoje na collection:

| Rota | Request de sucesso | Requests de erro já prontas |
|---|---|---|
| `GET /v1/ferramentas` | `GET /v1/ferramentas` | `(perfil consulta, 403)`, `(sem token)` |
| `GET /v1/ferramentas/:id` | `GET /v1/ferramentas/{id}` | `(nao encontrada)` |
| `GET /v1/ferramentas/por-codigo/:codigo` | `GET /v1/ferramentas/por-codigo/{codigo}` | `(nao encontrada)` |
| `GET /v1/ferramentas/:id/historico` | `GET /v1/ferramentas/{id}/historico` | — |
| `POST /v1/ferramentas` | `POST /v1/ferramentas` | `(sem nome/grupoId)` |
| `PUT /v1/ferramentas/:id` | `PUT /v1/ferramentas/{id}` | `(nao encontrada)` |
| `PATCH /v1/ferramentas/:id/etiqueta-impressa` | `PATCH .../etiqueta-impressa` | `(nao encontrada)` |
| `PATCH /v1/ferramentas/:id/disponibilizar` | `PATCH .../disponibilizar` | `(ja disponivel, 409)`, `(nao encontrada)` |
| `DELETE /v1/ferramentas/:id` | `DELETE /v1/ferramentas/{id}` | `(emprestimo em aberto, 409)`, `(nao encontrada)` |

Para cada uma: clique na request na sidebar → confira o método/URL/corpo já
preenchidos → clique **Send** → confira o status HTTP e o corpo da resposta
no painel da direita.

### Lendo a resposta

Toda resposta da API segue o mesmo envelope (Seção 5 do `CLAUDE.md`):

- **Sucesso:** `{ "data": {...}, "meta": {...} }` — `meta` só aparece em
  listas paginadas (como `GET /v1/ferramentas`).
- **Erro:** `{ "error": { "code": "...", "message": "...", "details": [] } }`
  — o `code` é o que você compara ao esperado (ex.: `FERRAMENTA_NOT_FOUND`,
  `FERRAMENTA_JA_DISPONIVEL`, `FERRAMENTA_COM_EMPRESTIMO_ABERTO`).

## 6. Testando o ciclo de vida completo de uma ferramenta

Para não mexer nos dados do seed (que outras pessoas da equipe também usam),
o ideal é criar uma ferramenta de teste e seguir o ciclo completo nela, do
cadastro até a baixa. Passo a passo com as requests da collection:

1. **Criar:** abra `POST /v1/ferramentas`, ajuste o corpo se quiser (troque
   o `nome` para algo identificável, tipo `"ZZTESTE Furadeira Manual"`) e dê
   **Send**. Anote o `id` que voltou em `data.id` — você vai reaproveitar
   esse número.
2. **Editar:** abra `PUT /v1/ferramentas/{id}`, troque o `1` da URL pelo `id`
   anotado, ajuste o corpo (ex.: `localizacao`) e envie. Confira que só o
   campo enviado mudou na resposta.
3. **Marcar etiqueta impressa:** troque o `1` da URL de
   `PATCH .../etiqueta-impressa` pelo seu `id` e envie. O campo
   `etiqueta_impressa_em` da resposta deve vir preenchido com a data/hora
   atual.
4. **Disponibilizar (testando o erro esperado primeiro):** como a ferramenta
   recém-criada já está `disponivel`, enviar
   `PATCH .../disponibilizar` nesse momento **deve dar erro** —
   é exatamente o caso de erro que o DoD da issue API-07 pede
   ("tentar disponibilizar uma ferramenta que já está disponível"). Troque o
   `1` da URL pelo seu `id` e confirme que a resposta é `409
   FERRAMENTA_JA_DISPONIVEL`.
   - Para testar o caminho de sucesso dessa rota, é preciso que a ferramenta
     esteja `indisponivel` primeiro — isso normalmente acontece via
     devolução com avaria/perda (fora do escopo deste guia, ver
     `docs/backend/processos.md`). Se estiver testando localmente e quiser
     forçar esse estado só para o teste, peça para alguém do time com acesso
     ao banco rodar:
     ```sql
     UPDATE ferramentas SET status = 'indisponivel', motivo_indisponivel = 'avaria' WHERE id = <seu id>;
     ```
     e então repita o `PATCH .../disponibilizar` — agora deve vir `200`,
     com `status: "disponivel"` e `motivo_indisponivel: null`.
5. **Baixar:** troque o `1` da URL de `DELETE /v1/ferramentas/{id}` pelo seu
   `id` e envie. A resposta deve vir `200` com `ativo: false`, `status:
   "indisponivel"` e `motivo_indisponivel: "baixada"`. A partir daqui, essa
   ferramenta não aparece mais em `GET /v1/ferramentas` (ela continua no
   banco, só marcada como baixada — nunca é apagada de verdade).
6. **Confirmar que sumiu da listagem:** abra `GET /v1/ferramentas/{id}` com o
   mesmo `id` — deve voltar `404 FERRAMENTA_NOT_FOUND`, provando que a baixa
   lógica funcionou.

> Se em algum passo você quiser testar o erro de "empréstimo em aberto" do
> `DELETE`, use a request `DELETE /v1/ferramentas/{id} (emprestimo em
> aberto, 409)` já pronta na collection (aponta para uma ferramenta do seed
> que tem retirada sem devolução) em vez de tentar isso na sua ferramenta de
> teste, que nunca teve empréstimo.

## 7. Erros comuns ao testar

| Sintoma | Causa provável | Como resolver |
|---|---|---|
| `401 TOKEN_NOT_PROVIDED` | Ambiente errado selecionado, ou `token` vazio | Confirme que "Base Environment" está selecionado e que você colou o token (Seção 4) |
| `401 TOKEN_EXPIRED` | Token JWT passou de 8h (almoxarife) ou 15min (consulta) | Refaça o login e cole o token novo |
| `403 ACCESS_DENIED` | Token é de perfil `consulta` numa rota exclusiva de `almoxarife` | Use `{{ _.token }}` (almoxarife), não `{{ _.tokenConsulta }}` |
| `ECONNREFUSED` / Insomnia não conecta | API não está rodando, ou porta errada em `baseUrl` | Confira `npm run dev` na pasta `api/` e o valor de `baseUrl` no ambiente |
| `400 VALIDATION_ERROR` num corpo que parecia certo | Campo obrigatório faltando ou tipo errado (ex.: `grupoId` como texto) | Leia `error.details` na resposta — ele aponta o campo e a regra que falhou |

## 8. Referências

- Collection: [`api/docs/insomnia-collection.json`](../../api/docs/insomnia-collection.json)
- Lista completa de endpoints: [`docs/backend/api.md`](api.md)
- Regras de negócio (avaria/perda, disponibilizar, baixa lógica):
  [`docs/backend/processos.md`](processos.md)
- Execução e decisões da issue que introduziu editar/status/baixa:
  [`docs/api-07-crud-ferramentas.md`](../api-07-crud-ferramentas.md)
