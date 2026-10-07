# Exportação de CSV pelo front

Como as telas devem baixar planilhas geradas pela API, no lugar de montar o CSV
no navegador.

- Contrato completo da rota: [`api.md`](../api.md#importação-e-exportação-csv).
- Importação: [`../import/importacao-front.md`](../import/importacao-front.md).

## O que muda

Hoje o "Exportar CSV" da tela de empréstimos (`EmprestimosPage`, função
`exportarCsv`) busca o histórico **página por página** (100 por vez, até 100
páginas) e monta o arquivo com `baixarCsv`. O próprio comentário da função aponta
os problemas:

- se um empréstimo for criado ou devolvido no meio, uma linha sai duplicada ou
  falta;
- são até 100 requisições por exportação.

Com a rota nova, a API gera o arquivo inteiro **numa consulta só**, já
formatado, e o front só baixa. As colunas e o formato são os mesmos de hoje
(datas no fuso de Brasília, código com 6 dígitos, situação por extenso). Os
cadastros, que hoje não exportam nada, ganham exportação também.

**Nada precisa ser removido.** `baixarCsv` continua sendo útil para arquivos
gerados no próprio navegador (por exemplo, o CSV de correção da importação).

## A requisição

```
GET /v1/exportacoes/:recurso[?filtros]
Authorization: Bearer <token>
```

| `:recurso` | O que sai | Filtros |
|---|---|---|
| `emprestimos` | Histórico: Ferramenta, Código, Colaborador, Matrícula, Setor, Retirada, Previsão, Devolução, Situação | `q`, `situacao`, `setorId` (os mesmos do `GET /v1/emprestimos`) |
| `ferramentas` | `codigo`, `nome`, `categoria`, `marca`, `modelo`, `setor`, `localizacao`, `descricao`, `status` | nenhum |
| `colaboradores` | `matricula`, `nome`, `setor` | nenhum |
| `categorias` | `nome` | nenhum |
| `setores` | `nome` | nenhum |

- **Cadastros** saem só com os registros ativos e **com as colunas do modelo de
  importação**, menos o `valor` das ferramentas, que a listagem também não
  expõe. O usuário pode exportar, acrescentar linhas no Excel e importar o mesmo
  arquivo de volta: o que já existia volta como `ignoradas`. Isso serve para
  **incluir** registros, não para editar: mudar uma linha existente na planilha
  não altera nada no banco. Não ofereça isso na tela como "editar em massa".
- **Empréstimos** saem até 50 mil linhas. Acima disso, a última linha do arquivo
  avisa que ele foi cortado. Não há cabeçalho nem campo na resposta indicando
  isso, porque o aviso está dentro do próprio arquivo, como no `exportarCsv` de
  hoje.
- **Perfis:** `manutencao` e `admin`. A resposta é `403` para `consulta`.

A resposta já vem pronta para o Excel: UTF-8 com BOM, separador `;`, tudo entre
aspas, com fórmulas neutralizadas. O front **não deve** processar o conteúdo,
só salvar.

## Baixando o arquivo

A rota exige o token, então um `<a href="…/exportacoes/…">` não funciona: o
navegador não manda o `Authorization`. O jeito é buscar com o `api`, como
`Blob`, e disparar o download, do mesmo jeito que o `baixarCsv` já faz:

```ts
import { api } from '@/lib/api'

/** Baixa um arquivo de uma rota autenticada da API e salva com o nome dado. */
export async function baixarDaApi(caminho: string, nomeArquivo: string, params?: object, signal?: AbortSignal) {
  try {
    const { data } = await api.get<Blob>(caminho, { params, responseType: 'blob', signal })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    throw await lerErroBlob(e)
  }
}
```

### Nome do arquivo: o front decide

A API manda `Content-Disposition: attachment; filename="emprestimos-2026-10-07.csv"`,
mas **o front não consegue ler esse cabeçalho**. A API está em outra origem, e o
CORS não expõe `Content-Disposition`. Por isso o nome vai como parâmetro de
`baixarDaApi`:

```ts
await baixarDaApi('/exportacoes/emprestimos', 'historico-emprestimos.csv', filtros)
await baixarDaApi('/exportacoes/ferramentas', 'ferramentas.csv')
```

### Erros vêm como Blob

Com `responseType: 'blob'`, a resposta de erro também chega como `Blob`, e não
como JSON. Por isso `mensagemDeErro(e, …)` não encontra o `error.message`. É
preciso converter antes:

```ts
import { isAxiosError } from 'axios'

/** Com responseType 'blob', o envelope de erro da API chega como Blob: converte de volta para JSON. */
async function lerErroBlob(e: unknown) {
  if (isAxiosError(e) && e.response?.data instanceof Blob) {
    try {
      e.response.data = JSON.parse(await e.response.data.text())
    } catch {
      // corpo não era JSON (ex.: proxy fora do ar): mantém o erro como veio
    }
  }
  return e
}
```

Depois disso, o tratamento é o de sempre:

```ts
try {
  await baixarDaApi('/exportacoes/emprestimos', 'historico-emprestimos.csv', filtros, signal)
} catch (e) {
  if (!axios.isCancel(e)) avisarErro(mensagemDeErro(e, 'Não foi possível exportar o histórico'))
}
```

| Status | Quando |
|---|---|
| `400` | Recurso desconhecido ou filtro inválido (`situacao=perdido`, `setorId=abc`) |
| `401` | Token expirado (o interceptor já desloga) |
| `403` | Perfil `consulta` |

## Filtros de empréstimos

Passe os filtros que a tela já usa na listagem, **sem `page` e `limit`**:

```ts
const filtros = { q: q || undefined, situacao: situacao || undefined, setorId: setorId || undefined }
await baixarDaApi('/exportacoes/emprestimos', 'historico-emprestimos.csv', filtros)
```

Campo vazio precisa ir como `undefined`, e não como `''`. O Axios descarta
`undefined` da URL, mas manda `situacao=`, e a API recusa com `400`. Os outros
recursos ignoram qualquer filtro.
