# Teste da API — CRUD de Ferramentas (Insomnia)

Este guia explica como subir a API localmente e rodar, no Insomnia, os testes
de todas as rotas de `/v1/ferramentas` (issues API-05 e API-07). A coleção
pronta está em [`soufer-tools-ferramentas.json`](./soufer-tools-ferramentas.json).

Cada requisição da coleção traz, na aba **Docs** (descrição), o que faz, por que
existe, como está configurada e o resultado esperado. Este documento dá a visão
geral e o passo a passo.

## 1. Pré-requisitos

- Node 20 ou superior.
- PostgreSQL rodando na porta 5432, com o banco `soufer_dev`.
- Arquivo `api/.env` preenchido (use `api/.env.example` como base).
- [Insomnia](https://insomnia.rest/download) **11 ou superior** (a coleção usa
  scripts e testes automáticos; foi preparada para a versão 13.1).

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

## 3. Importar a coleção

1. No Insomnia, use **Import** e escolha `docs/insomnia/soufer-tools-ferramentas.json`.
2. Abra a coleção **SOUFER Tools — API**. Ela tem 7 pastas e 40 requisições
   numeradas de 01 a 40.
3. O **Base Environment** já vem com `base_url = http://localhost:3000/v1`.
   Se a API usar outra porta, altere só esse valor.

## 4. Como funciona (sem copiar token nem ids)

A coleção não usa referências entre requisições. Ela usa **variáveis de
ambiente**, preenchidas por um script pós-resposta (aba **Scripts →
After-response**) das requisições que produzem dados:

| Variável | Quem grava | Quem usa |
|---|---|---|
| `token` | 01 Login do almoxarife | todas as rotas de ferramentas |
| `token_consulta` | 02 Login do perfil consulta | 19 (teste de 403) |
| `grupo_id` | 03 Obter um grupoId válido | 04 Cadastrar |
| `ferramenta_id` | 04 Cadastrar | 07, 09 a 12, 24, 37 a 39 |
| `ferramenta_codigo` | 04 Cadastrar | 08 |
| `ferramenta_emprestada_id` | 13 (auxiliar) | 14 |
| `ferramenta_indisponivel_id` | 15 (auxiliar) | 16 |

### Base Environment

As variáveis ficam no **Base Environment** da coleção. Para ver ou editar, abra
**Manage Environments → Base Environment**.

- **Começam vazias, e isso é esperado.** Só `base_url` vem preenchida
  (`http://localhost:3000/v1`). As demais são preenchidas pelos scripts quando
  você roda a pasta 1 e a requisição 04.
- **Não apague nem renomeie as variáveis.** As requisições e os scripts
  dependem desses nomes exatos. Se apagar uma por engano, reimporte a coleção
  para restaurar o ambiente original.
- **Cuidado ao editar `ferramenta_id` à mão.** Essa variável alimenta também o
  `PATCH` (10), a etiqueta (11) e o `DELETE` (37 a 39). Se você a trocar para
  consultar outra ferramenta, essas requisições passam a atuar nela, e não na
  ferramenta de teste. Depois de consultar, rode a 04 de novo para recuperar o
  valor correto antes de usar o Runner.
- **É local a cada pessoa.** O ambiente é gravado no seu Insomnia. Os valores
  (inclusive o `token`) não vão para o repositório e não são compartilhados:
  cada integrante gera os seus rodando a coleção.
- **Se o script não rodar** na sua versão do Insomnia, preencha as variáveis à
  mão com os valores das respostas; as requisições continuam funcionando.

Cada requisição também tem **testes automáticos** (no mesmo script). Eles
conferem o status HTTP, o código de erro e campos da resposta, e aparecem
como aprovados ou reprovados na aba **Tests** e no Runner.

## 5. Como rodar

- **Uma a uma:** clique em **Send** seguindo a numeração. Rode sempre a pasta 1
  antes das outras.
- **Tudo de uma vez:** abra o **Collection Runner**, selecione a coleção com todas as pastas
  na ordem e execute. O resultado mostra cada requisição e seus testes.

A ordem importa: a pasta 2 cria a ferramenta de teste, as pastas 3 a 6 a usam
e a pasta 7 dá baixa nela.

## 6. Mapa das requisições

### Pasta 1 — Autenticação e preparação
| # | Requisição | Esperado |
|---|---|---|
| 01 | Login do almoxarife | 200, grava `token` |
| 02 | Login do perfil consulta | 200, grava `token_consulta` |
| 03 | Obter um grupoId válido | 200, grava `grupo_id` |

### Pasta 2 — CRUD, fluxo de sucesso
| # | Requisição | Esperado |
|---|---|---|
| 04 | Cadastrar ferramenta (`POST`) | 201, grava `ferramenta_id` e `ferramenta_codigo` |
| 05 | Listar (paginado) | 200 |
| 06 | Listar com filtros, busca e ordenação | 200 |
| 07 | Buscar por ID | 200 |
| 08 | Buscar por código de identificação | 200 |
| 09 | Consultar histórico | 200 |
| 10 | Atualizar (`PATCH`, campos parciais) | 200 |
| 11 | Marcar etiqueta como impressa (`PATCH`) | 200 |

### Pasta 3 — Regras de negócio
| # | Requisição | Esperado |
|---|---|---|
| 12 | Disponibilizar ferramenta que já está disponível | 409 `FERRAMENTA_JA_DISPONIVEL` |
| 13 | (auxiliar) Localizar ferramenta com empréstimo aberto | 200 |
| 14 | Dar baixa em ferramenta com empréstimo aberto | 409 `FERRAMENTA_COM_EMPRESTIMO_ABERTO` |
| 15 | (auxiliar) Localizar ferramenta indisponível | 200 |
| 16 | Disponibilizar ferramenta após reparo | 200 |

### Pasta 4 — Autenticação e autorização
| # | Requisição | Esperado |
|---|---|---|
| 17 | Listar sem token | 401 `TOKEN_NOT_PROVIDED` |
| 18 | Listar com token inválido | 401 `TOKEN_INVALID` |
| 19 | Listar com perfil consulta | 403 `ACCESS_DENIED` |

### Pasta 5 — Validação de entrada
| # | Requisição | Esperado |
|---|---|---|
| 20 | Cadastrar sem nome | 400 `VALIDATION_ERROR` |
| 21 | Cadastrar com nome de 1 caractere | 400 `VALIDATION_ERROR` |
| 22 | Cadastrar sem grupoId | 400 `VALIDATION_ERROR` |
| 23 | Cadastrar com grupoId inexistente | 400 `FOREIGN_KEY_VIOLATION` |
| 24 | Atualizar com corpo vazio | 400 `VALIDATION_ERROR` |
| 25 | Buscar com ID não numérico | 400 `VALIDATION_ERROR` |
| 26 | Buscar com ID negativo | 400 `VALIDATION_ERROR` |
| 27 | Listar com status inválido | 400 `VALIDATION_ERROR` |
| 28 | Listar com limit acima do máximo | 400 `VALIDATION_ERROR` |
| 29 | Buscar por código 0 | 400 `VALIDATION_ERROR` |
| 30 | Buscar por código 10000 | 400 `VALIDATION_ERROR` |

### Pasta 6 — Recurso inexistente
| # | Requisição | Esperado |
|---|---|---|
| 31 | Buscar ID inexistente | 404 `FERRAMENTA_NOT_FOUND` |
| 32 | Buscar código inexistente | 404 `FERRAMENTA_NOT_FOUND` |
| 33 | Histórico de ID inexistente | 404 `FERRAMENTA_NOT_FOUND` |
| 34 | Atualizar ID inexistente | 404 `FERRAMENTA_NOT_FOUND` |
| 35 | Marcar etiqueta de ID inexistente | 404 `FERRAMENTA_NOT_FOUND` |
| 36 | Disponibilizar ID inexistente | 404 `FERRAMENTA_NOT_FOUND` |

### Pasta 7 — Encerramento (baixa lógica)
| # | Requisição | Esperado |
|---|---|---|
| 37 | Dar baixa na ferramenta criada (`DELETE`) | 200, `ativo = false` |
| 38 | Buscar ferramenta já baixada | 404 |
| 39 | Dar baixa duas vezes | 404 |
| 40 | Dar baixa em ID inexistente | 404 |

Os erros seguem o envelope
`{ "error": { "code": "...", "message": "...", "details": [] } }`.

## 7. Convenções REST: o que a coleção segue e o que difere da API

A coleção reflete o comportamento real da API. A atualização parcial (req. 10)
era `PUT` e foi trocada por `PATCH`, conforme a convenção; veja
[`../api-07-put-para-patch.md`](../api-07-put-para-patch.md). Dois pontos ainda
diferem da convenção REST mais comum e ficam registrados para eventual revisão
futura (`/v2`), sem quebrar o `/v1`:

| Ponto | Convenção usual | Comportamento atual da API |
|---|---|---|
| Resposta do `DELETE` (req. 37) | 204 sem corpo | 200 com a ferramenta baixada |
| Referência inexistente (req. 23) | 422 ou 409 | 400 `FOREIGN_KEY_VIOLATION` |

O que já segue a convenção: `PATCH` para atualização parcial e ações pontuais
(`etiqueta-impressa`, `disponibilizar`), 401 para não autenticado, 403 para sem
permissão, 404 para inexistente, 409 para conflito de estado, e 400 para dados
inválidos.

## 8. Observações sobre os dados

- **Requisição 14** usa a Furadeira de Impacto Bosch GSB 13 RE, que o seed deixa
  com empréstimo aberto. Se ela for devolvida, o teste passa a retornar 200.
- **Requisição 16** precisa de ao menos uma ferramenta `indisponivel` e **altera
  dados do seed**: a ferramenta volta a `disponivel`. Por isso, em execuções
  repetidas as indisponíveis acabam. Para preparar outra, escolha o id de uma
  ferramenta disponível e execute no banco:

  ```sql
  UPDATE ferramentas
  SET status = 'indisponivel', motivo_indisponivel = 'avaria'
  WHERE id = <id da ferramenta>;
  ```

  Se não houver nenhuma indisponível, o teste da requisição 15 aponta isso e a 16 falha.
- Cada execução completa cria uma ferramenta de teste ("Furadeira Teste
  Insomnia") e a baixa no final (req. 37). Como a baixa é lógica, o registro
  continua no banco com `ativo = false`. Para recomeçar do zero, rode o seed de
  novo ou recrie o banco.
- Use apenas o banco de desenvolvimento (`soufer_dev`). Nunca aponte a coleção
  para produção.

## 9. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `connect ECONNREFUSED` | A API não está rodando; execute `npm run dev` na pasta `api` |
| 401 `TOKEN_NOT_PROVIDED` | A variável `token` está vazia; rode a 01 (ou cole o token no ambiente) |
| 401 `TOKEN_INVALID` em tudo | Token expirado (8h); rode a 01 de novo |
| 400 "Expected number, received nan" | A variável `ferramenta_id` está vazia; rode a pasta 2 (req. 04) |
| 400 `FOREIGN_KEY_VIOLATION` na 04 | Rode a 03 antes, ou refaça o seed |
| 401 no login (01) | O seed não foi rodado (`npm run db:seed`) |
| Variáveis não são preenchidas | O script pós-resposta não rodou; use Insomnia 11+ ou preencha o ambiente à mão |
| 403 falha por token expirado | Token de consulta vale 15 minutos; rode a 02 de novo |

## 10. Evidência para o PR

A Definition of Done exige testar cada rota com um caso de sucesso e um de erro.
Depois de rodar todas as pastas pelo Collection Runner, tire um print do
resultado (requisições e testes aprovados) e anexe ao PR.
