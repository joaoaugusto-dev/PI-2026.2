# Importação de CSV pelo front

Como as telas de cadastro devem enviar uma planilha para a API usando a rota de
importação em lote, no lugar do envio linha por linha de hoje.

- Contrato completo da rota: [`api.md`](../api.md#importação-e-exportação-csv).
- Exportação: [`../export/exportacao-front.md`](../export/exportacao-front.md).
- Passo a passo para quem usa a planilha: [`../importacao.md`](../importacao.md).

## O que muda

Hoje o `ImportarCsvDialog` faz tudo no navegador:

1. lê o arquivo com `lerCsv`;
2. confere duplicadas baixando o catálogo inteiro (`conferirDuplicadas`, até 5 mil ferramentas);
3. converte cada linha com `paraPayload` (categoria e setor por nome → id);
4. manda **uma requisição por linha** para `POST /v1/<recurso>` (`importarLinhas`).

Com a rota nova, o front manda **o arquivo inteiro numa requisição só**, e a API
faz a leitura, a validação, a deduplicação, a gravação e o relatório:

| Hoje (front) | Com a rota nova (API) |
|---|---|
| `lerCsv` lê o arquivo | A API lê, inclusive CSV salvo pelo Excel em Windows-1252 (o `arquivo.text()` do navegador estraga os acentos nesse caso) |
| `paraPayload` troca categoria/setor por id | A API resolve pelo nome |
| `conferirDuplicadas` baixa o catálogo | A API confere no banco, dentro da mesma transação |
| Uma requisição por linha, até 500 linhas | Uma requisição, até 5000 linhas e 2 MB |
| Relatório montado no navegador | Relatório pronto na resposta |

**Nada precisa ser removido para começar a usar a rota.** `lerCsv` ainda serve
para a prévia das primeiras linhas no diálogo. O que deixa de ser usado no envio
(`importarLinhas`, `paraPayload` e `conferirDuplicadas` da config) fica a
critério do front.

## A requisição

```
POST /v1/importacoes/:recurso
Content-Type: text/csv
Authorization: Bearer <token>

<conteúdo do arquivo, cru>
```

- **`:recurso`** é `ferramentas`, `colaboradores`, `categorias` ou `setores`. São
  os mesmos nomes da prop `recurso` do `CadastroCrud`, então dá para usar a prop
  direto na URL.
- **O corpo é o próprio `File`** do `<input type="file">`, não `FormData` nem
  JSON.
- **`Content-Type: text/csv` precisa ir explícito.** O navegador rotula `.csv`
  como `application/vnd.ms-excel` no Windows com Office, ou como vazio. A API
  aceita `vnd.ms-excel`, mas com o tipo vazio o corpo não é lido e a resposta é
  `400`.
- **Não leia o arquivo com `arquivo.text()` antes de enviar.** Mande o `File`
  como veio: quem descobre se é UTF-8 ou Windows-1252 é a API.
- **O token** é anexado pelo interceptor de `lib/api.ts`, como em qualquer
  chamada.

```ts
import { api } from '@/lib/api'

export async function importarCsv(recurso: string, arquivo: File, signal?: AbortSignal) {
  const { data } = await api.post<{ data: RelatorioImportacao }>(`/importacoes/${recurso}`, arquivo, {
    headers: { 'Content-Type': 'text/csv' },
    signal,
  })
  return data.data
}
```

O cancelamento com `signal` só funciona antes de a API começar a gravar. A
importação roda numa transação: depois que a requisição chegou, ou tudo que era
válido entra, ou nada entra. Não existe o estado "importou metade" do envio
linha a linha.

## A resposta (`200`)

```ts
interface RelatorioImportacao {
  resumo: { total_linhas: number; aceitas: number; rejeitadas: number; ignoradas: number }
  /** Gravadas. Além do id: ferramentas -> codigo_identificacao, nome; colaboradores -> matricula, nome; categorias/setores -> nome */
  aceitas: ({ linha: number; id: number } & Record<string, unknown>)[]
  /** Recusadas: motivos para mostrar ao usuário; dados = a linha como veio no arquivo */
  rejeitadas: { linha: number; motivos: string[]; dados: Record<string, string> }[]
  /** Já existiam (no banco ou mais acima no próprio arquivo). Não é erro. */
  ignoradas: { linha: number; motivo: string; dados: Record<string, string> }[]
  /** Colunas do arquivo que a API não usa (vale avisar: pode ser nome de coluna digitado errado) */
  colunas_ignoradas: string[]
}
```

- **`linha` já é a linha do Excel**: o cabeçalho é a 1, então o primeiro registro
  é a 2. É a mesma contagem que o `ResultadoLinha` usa hoje (`i + 2`), então não
  precisa somar nada.
- **A resposta é `200` mesmo com linhas rejeitadas.** Rejeição de linha não é
  erro HTTP: o resultado de cada linha está no relatório.
- **Os motivos repetem o que veio na planilha**, por exemplo
  `Categoria "<texto da célula>" não cadastrada`. Renderize sempre como texto
  (`{motivo}` no JSX), **nunca** com `dangerouslySetInnerHTML`: o conteúdo vem do
  arquivo do usuário.
- **Unidades idênticas de ferramenta viram `ignoradas`.** Três `MARTELO` sem
  marca nem modelo resultam em 1 aceita e 2 `Repetida no arquivo`. Vale um aviso
  na tela de resultado: unidades iguais precisam ser diferenciadas na planilha
  (pelo modelo, por exemplo) ou cadastradas pela tela de ferramentas.

### Reaproveitando a tela de resultado atual

O relatório da API se converte direto no `ResultadoLinha[]` que o diálogo já sabe
mostrar:

```ts
import type { ResultadoLinha } from '@/lib/importar-csv'

export function paraResultados(r: RelatorioImportacao): ResultadoLinha[] {
  return [
    ...r.aceitas.map((a) => ({ linha: a.linha })),
    ...r.rejeitadas.map((x) => ({ linha: x.linha, falha: 'rejeitada' as const, erro: x.motivos.join('; ') })),
    ...r.ignoradas.map((x) => ({ linha: x.linha, falha: 'ignorada' as const, erro: x.motivo })),
  ].sort((a, b) => a.linha - b.linha)
}
```

O status `'rede'` deixa de existir por linha: se a rede cair, cai a requisição
inteira (ver os erros abaixo), e nada foi gravado.

### Depois de importar

Invalide o cache do recurso, como o `onImportado` já faz:

```ts
queryClient.invalidateQueries({ queryKey: [recurso] })
```

Importar colaboradores ou ferramentas não cria setor nem categoria, então não é
preciso invalidar `['setores']` ou `['categorias']`.

### CSV de correção (opcional)

`rejeitadas[].dados` traz as colunas que vieram preenchidas na linha, com o valor
original. Para gerar um arquivo só com as rejeitadas, o usuário corrigir e
reenviar:

```ts
import { baixarCsv } from '@/lib/csv'

const colunas = config.colunas // as mesmas do modelo do recurso (ver "Colunas aceitas por recurso")
baixarCsv(
  `rejeitadas-${recurso}.csv`,
  colunas,
  relatorio.rejeitadas.map((r) => colunas.map((c) => r.dados[c] ?? '')),
)
```

Reenviar o arquivo original inteiro também funciona: as linhas que já entraram
voltam como `ignoradas`.

## Erros (o arquivo inteiro foi recusado)

Nesses casos nada é gravado e a resposta vem no envelope de erro padrão. A
mensagem já está pronta para o usuário: use `mensagemDeErro(e, 'Não foi possível
importar o arquivo')` e `avisarErro`, como no resto do sistema.

| Status | Quando | Exemplo de `error.message` |
|---|---|---|
| `400` | Arquivo vazio, só cabeçalho, mais de 5000 linhas, CSV ilegível | `O arquivo tem 6200 linhas; o limite é 5000 por importação. Divida em ondas.` |
| `400` | Faltou uma coluna obrigatória no cabeçalho | `Coluna(s) obrigatória(s) ausente(s) no cabeçalho: categoria` |
| `400` | A mesma coluna duas vezes (inclusive `categoria` e `grupo` juntas) | `Coluna repetida no cabeçalho: categoria` |
| `400` | Corpo vazio ou sem `Content-Type: text/csv` | `Envie o arquivo CSV no corpo da requisição (Content-Type: text/csv)` |
| `401` | Token expirado | (o interceptor já desloga) |
| `403` | Perfil sem permissão (manutenção importando `categorias` ou `setores`) | `Perfil 'manutencao' não possui permissão…` |
| `413` | Arquivo acima de 2 MB | `O arquivo enviado é maior que o limite permitido.` |

Vale barrar no próprio diálogo, antes de enviar, o que dá para saber sem a API:
`arquivo.size > 2 * 1024 * 1024` e mais de 5000 linhas na prévia.

## Modelo de CSV

O botão "Baixar modelo" pode buscar o modelo na API em vez de montá-lo com
`config.colunas` e `config.exemplo`. Assim, a planilha sempre tem as colunas que
a API aceita:

```
GET /v1/importacoes/:recurso/modelo
```

A rota exige token, então não dá para usar um `<a href>` direto. O download é
igual ao da exportação: veja a função `baixarDaApi` em
[`../export/exportacao-front.md`](../export/exportacao-front.md#baixando-o-arquivo).

```ts
await baixarDaApi(`/importacoes/${recurso}/modelo`, `modelo-${recurso}.csv`)
```

## Colunas aceitas por recurso

\* = obrigatória. O cabeçalho não diferencia maiúsculas nem acentos.

| Recurso | Colunas | Perfis |
|---|---|---|
| `ferramentas` | `nome`\*, `categoria`\*, `marca`, `modelo`, `setor`, `localizacao`, `descricao`, `valor` | manutenção, admin |
| `colaboradores` | `matricula`\*, `nome`\*, `setor`\* | manutenção, admin |
| `categorias` | `nome`\* | admin |
| `setores` | `nome`\* | admin |

Diferenças em relação ao CSV que o front aceita hoje:

- **ferramentas** passa a aceitar `setor`, `localizacao`, `descricao` e `valor`
  (`1.234,56`). O nome é gravado em maiúsculas.
- **colaboradores:** a matrícula com 1 a 3 dígitos é completada com zeros
  (`36` → `0036`), porque o Excel apaga o zero à esquerda.
- **Repetidos:** a API devolve como `ignoradas` tudo que já existe. Em
  ferramentas, a chave é nome + marca + modelo, a mesma do `chaveFerramenta`. A
  opção "ignorar duplicadas" do diálogo deixa de fazer diferença: a API sempre
  ignora.
