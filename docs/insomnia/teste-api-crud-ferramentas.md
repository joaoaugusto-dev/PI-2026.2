# Teste da API — CRUD de Ferramentas (Insomnia)

Este guia mostra como subir a API localmente e rodar, no Insomnia, os testes
de todas as rotas de `/v1/ferramentas` (issues API-05 e API-07). A coleção
pronta está em [`soufer-tools-ferramentas.json`](./soufer-tools-ferramentas.json).

## 1. Pré-requisitos

- Node 20 ou superior.
- PostgreSQL rodando na porta 5432, com o banco `soufer_dev`.
- Arquivo `api/.env` preenchido (use `api/.env.example` como base).
- [Insomnia](https://insomnia.rest/download) instalado.

## 2. Subir o servidor local

No terminal, a partir da raiz do repositório:

```powershell
cd api
npm install          # primeira vez, ou quando faltar dependência
npm run db:migrate   # cria as tabelas
npm run db:seed      # popula usuários, colaboradores e 50 ferramentas
npm run dev          # inicia a API com recarga automática
```

Quando aparecer `Servidor TypeScript rodando na porta 3000`, a API está no ar.
Deixe esse terminal aberto; `Ctrl+C` encerra o servidor.

Verificações rápidas:

- Saúde: <http://localhost:3000/v1/health>
- Swagger: <http://localhost:3000/docs>

Credenciais criadas pelo seed:

| Perfil | Como entrar |
|---|---|
| Almoxarife | `almoxarife@soufer.com.br` / `123456` |
| Consulta | matrícula `MAT001` |

## 3. Importar a coleção no Insomnia

1. No Insomnia, clique em **Import**.
2. Escolha o arquivo `docs/insomnia/soufer-tools-ferramentas.json`.
3. Abra a coleção **SOUFER Tools — API**. Ela traz a pasta **Ferramentas (CRUD)**
   com 35 requisições numeradas na ordem de execução.

O ambiente **Base Environment** já vem com `base_url = http://localhost:3000/v1`.
Se sua API usa outra porta, altere só esse valor.

## 4. Como rodar

Você não precisa copiar token nem ids. As requisições leem essas informações
das respostas anteriores:

- O token vem do **00 · Login almoxarife**.
- O `id` e o `codigo_identificacao` da ferramenta de teste vêm do
  **10 · Criar ferramenta**.

Duas formas de executar:

- **Uma a uma:** clique em **Send** seguindo a numeração. Rode sempre o `00`
  primeiro e o `10` antes de qualquer requisição que use o id criado.
- **Tudo de uma vez:** clique com o botão direito na pasta **Ferramentas (CRUD)**
  e escolha **Run** (Collection Runner), mantendo a ordem padrão.

Se você rodar uma requisição de id sem ter rodado o `10`, ela vai falhar com 400
(`id` inválido). Rode o `10` e tente de novo.

## 5. Requisições e resultado esperado

O status esperado também aparece no nome de cada requisição.

### Preparação

| # | Requisição | Esperado |
|---|---|---|
| 00 | Login almoxarife | 200, retorna `data.token` |
| 01 | Login consulta (MAT001) | 200, token de perfil `consulta` |
| 02 | (auxiliar) Obter um `grupoId` válido | 200 |

### Casos de sucesso

| # | Requisição | Esperado |
|---|---|---|
| 10 | `POST /ferramentas` | 201, status `disponivel` e `codigo_identificacao` gerado |
| 11 | `GET /ferramentas` | 200, com `meta` (page, limit, total) |
| 12 | `GET /ferramentas?status=&q=&page=&limit=&sort=` | 200, lista filtrada |
| 13 | `GET /ferramentas/:id` | 200 |
| 14 | `GET /ferramentas/por-codigo/:codigo` | 200 |
| 15 | `GET /ferramentas/:id/historico` | 200 |
| 16 | `PUT /ferramentas/:id` | 200, só os campos enviados mudam |
| 17 | `PATCH /ferramentas/:id/etiqueta-impressa` | 200, `etiqueta_impressa_em` preenchido |
| 41 | `PATCH /ferramentas/:id/disponibilizar` | 200, ferramenta volta a `disponivel` |
| 50 | `DELETE /ferramentas/:id` | 200, baixa lógica (`ativo = false`) |

### Casos de erro

| # | Situação | Esperado |
|---|---|---|
| 20 | Sem token | 401 |
| 21 | Token inválido | 401 |
| 22 | Perfil `consulta` | 403 (`ACCESS_DENIED`) |
| 23 | Criar sem `nome` | 400 |
| 24 | Criar com `nome` de 1 caractere | 400 |
| 25 | Criar sem `grupoId` | 400 |
| 26 | PUT com body vazio | 400 |
| 27 | ID não numérico (`abc`) | 400 |
| 28 | ID negativo | 400 |
| 29 | Filtro `status=quebrada` | 400 |
| 30 | Código `0` | 400 |
| 31 | Código `10000` | 400 |
| 32 | Buscar ID inexistente | 404 |
| 33 | Código `9999` inexistente | 404 |
| 34 | PUT em ID inexistente | 404 |
| 35 | Disponibilizar ferramenta já disponível | 409 |
| 37 | Baixar ferramenta com empréstimo aberto | 409 (`FERRAMENTA_COM_EMPRESTIMO_ABERTO`) |
| 51 | Buscar ferramenta já baixada | 404 |
| 52 | Baixar duas vezes | 404 |
| 53 | Baixar ID inexistente | 404 |

Os erros seguem o envelope
`{ "error": { "code": "...", "message": "...", "details": [] } }`.

## 6. Observações sobre os dados

- **Requisição 37** usa a Furadeira de Impacto Bosch GSB 13 RE, que o seed deixa
  com empréstimo aberto. Se você devolver essa ferramenta, o teste passa a
  retornar 200 em vez de 409.
- **Requisição 41** precisa de ao menos uma ferramenta `indisponivel`. O seed
  cria algumas (avaria/perda). Como o teste as libera, elas acabam nas
  execuções seguintes. Para preparar outra, escolha o id de uma ferramenta
  disponível e rode no banco:

  ```sql
  UPDATE ferramentas
  SET status = 'indisponivel', motivo_indisponivel = 'avaria'
  WHERE id = <id da ferramenta>;
  ```

  Se não houver nenhuma indisponível, a requisição 41 falha (não há id para liberar).
- Cada execução completa cria uma ferramenta de teste ("Furadeira Teste Insomnia")
  e a baixa no final (passo 50). Como a baixa é lógica, o registro continua
  no banco com `ativo = false`. Para recomeçar do zero, rode o seed novamente
  ou recrie o banco.
- O ambiente é o de desenvolvimento (`soufer_dev`). Nunca aponte a coleção para
  produção.

## 7. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `Error: connect ECONNREFUSED` | A API não está rodando; execute `npm run dev` na pasta `api` |
| 401 em tudo | Rode o `00 · Login almoxarife` de novo (o token expira em 8h) |
| 400 com "Expected number, received nan" | O id ainda não foi criado; rode o `10` |
| 400 `FOREIGN_KEY_VIOLATION` no `10` | Rode o `02` antes, ou refaça o seed |
| Login retorna 401 | O seed não foi rodado (`npm run db:seed`) |

## 8. Evidência para o PR

A Definition of Done exige testar cada rota com um caso de sucesso e um de erro.
Depois de rodar a pasta pelo Collection Runner, tire um print do resultado
e anexe ao PR.
