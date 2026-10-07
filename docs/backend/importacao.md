# Guia: importação e exportação de planilhas (CSV)

Este guia mostra como carregar dados no sistema a partir de uma planilha e como
tirar dados do sistema para uma planilha, usando as rotas de importação e
exportação da API. Serve para testar as rotas (DoD: caso de sucesso e caso de
erro) e para fazer a carga real do inventário da Soufer.

O que dá para fazer:

| Recurso | Importar | Exportar |
|---|---|---|
| `ferramentas` | Sim | Sim |
| `colaboradores` | Sim | Sim |
| `categorias` | Sim (só admin) | Sim |
| `setores` | Sim (só admin) | Sim |
| `emprestimos` | Não | Sim (histórico, com filtros) |

O contrato técnico completo (regras de cada campo, formato da resposta e códigos
de erro) está em [`api.md`](api.md#importação-e-exportação-csv). Este guia mostra
só o passo a passo.

## 1. Pré-requisitos

- **API rodando.** Localmente, na pasta `api/`:
  ```bash
  npm install         # só na primeira vez
  npm run db:migrate  # cria as tabelas
  npm run db:seed     # categorias, setores e usuários de teste
  npm run dev         # sobe a API em http://localhost:3000
  ```
- **Um usuário com permissão.** No seed: matrícula `0001` (manutenção) ou `0053`
  (admin), senha `123456`. A manutenção importa ferramentas e colaboradores;
  categorias e setores só o admin importa. O perfil `consulta` não importa nem
  exporta nada.
- **A ordem certa.** Importar ferramentas e colaboradores **não cria categoria
  nem setor**: a linha que citar uma categoria ou um setor inexistente é
  rejeitada. Importe primeiro o que os outros usam:
  1. `setores` e `categorias`;
  2. `colaboradores` (usam setor);
  3. `ferramentas` (usam categoria e, opcionalmente, setor).

## 2. Login

Toda rota exige o token. Faça login e copie o valor de `data.token` da resposta:

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"matricula": "0053", "senha": "123456"}'
```

Nos exemplos abaixo, troque `SEU_TOKEN` por esse valor.

## 3. Baixando o modelo da planilha

Cada recurso tem um modelo pronto, com o cabeçalho certo e uma linha de exemplo.
É o jeito mais fácil de começar:

```bash
curl -H "Authorization: Bearer SEU_TOKEN" -OJ \
  http://localhost:3000/v1/importacoes/ferramentas/modelo
```

O arquivo `modelo-ferramentas.csv` é salvo na pasta atual. Troque `ferramentas`
por `colaboradores`, `categorias` ou `setores` para baixar os outros modelos.

## 4. Preparando a planilha

Abra o modelo no Excel, apague a linha de exemplo e preencha **um registro por
linha**. As colunas de cada recurso (\* = obrigatória):

| Recurso | Colunas |
|---|---|
| `ferramentas` | `nome`\*, `categoria`\*, `marca`, `modelo`, `setor`, `localizacao`, `descricao`, `valor` |
| `colaboradores` | `matricula`\*, `nome`\*, `setor`\* |
| `categorias` | `nome`\* |
| `setores` | `nome`\* |

Exemplo de planilha de ferramentas:

| nome | categoria | marca | modelo | setor | localizacao | descricao | valor |
|---|---|---|---|---|---|---|---|
| Furadeira de impacto | Ferramentas Elétricas | Bosch | GSB 13 | Manutenção Geral | Armário 2 | | 1.234,56 |
| Torquímetro | Ferramentas Manuais | Gedore | 80-360 NM | | Bancada 1 | | 890 |

Regras que mais importam:

- **Categoria e setor vão pelo nome**, igual ao que aparece no sistema. Não
  importa maiúscula ou minúscula (`ferramentas manuais` vale), mas o nome precisa
  ser o mesmo, com os acentos.
- **Matrícula do colaborador** tem 4 dígitos (`0001` a `9999`). O Excel costuma
  transformar `0036` em `36`; não tem problema, a API completa os zeros.
- **`valor` da ferramenta vai no formato brasileiro**: `1.234,56`, `1234,56` ou
  `R$ 89,90`. Mais de duas casas decimais (`12,345`) é rejeitado.
- **O cabeçalho é flexível:** `Localização`, `LOCALIZACAO` e `localizacao` valem
  o mesmo. Em ferramentas, `grupo` é aceito no lugar de `categoria`, e
  `valor_aquisicao` no lugar de `valor`.
- **Colunas a mais não atrapalham.** Uma coluna `Observação` ou `Quantidade`, por
  exemplo, é ignorada e aparece em `colunas_ignoradas` no relatório.
- **O nome da ferramenta é gravado em MAIÚSCULAS**, e os espaços repetidos viram
  um só. Não é preciso arrumar isso na planilha.

### Salvando como CSV

No Excel: **Arquivo → Salvar como → CSV (separado por vírgulas) (\*.csv)**. O
Excel em português salva com `;` e com a codificação do Windows, e a API aceita
os dois. Também funcionam o "CSV UTF-8" e arquivos separados por `,`.

Se algum valor tiver o próprio separador dentro (por exemplo, `Paleteira, 2.500 kg`
num arquivo separado por vírgula), ele precisa estar entre aspas. O Excel já faz
isso sozinho. Um arquivo editado à mão sem as aspas tem essa linha rejeitada com
a mensagem "A linha tem N colunas e o cabeçalho tem M".

Limites por arquivo: **5000 linhas e 2 MB**. Acima disso, divida em mais de um
arquivo (ver a seção 7).

## 5. Enviando o arquivo

O recurso vai no fim da URL: `/v1/importacoes/ferramentas`,
`/v1/importacoes/colaboradores` etc. O arquivo vai **direto no corpo da
requisição**, não como formulário (multipart) nem como JSON.

### Pelo terminal (curl)

```bash
curl -X POST http://localhost:3000/v1/importacoes/ferramentas \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @inventario.csv
```

Use `--data-binary`, e não `-d`: o `-d` remove as quebras de linha e o arquivo
chega como uma linha só.

### Pelo Insomnia

1. Crie uma request `POST` para `{{ _.baseUrl }}/v1/importacoes/ferramentas`.
2. Na aba **Auth**, escolha **Bearer Token** e cole o token.
3. Na aba **Body**, escolha **File** (binário) e selecione o `.csv`.
4. Na aba **Headers**, confira se `Content-Type` está como `text/csv`. Se estiver
   outro valor, troque.
5. Clique em **Send**.

### Pelo Swagger

Em `http://localhost:3000/docs`, abra **Importações → POST /importacoes/{recurso}**,
clique em **Authorize** e cole o token, depois em **Try it out**. Escolha o
recurso, cole o conteúdo do CSV no corpo, no lugar do exemplo, e clique em
**Execute**.

## 6. Lendo o relatório

A resposta é sempre `200` quando o arquivo pôde ser lido, mesmo que algumas
linhas tenham sido recusadas. O que aconteceu com cada linha está no relatório:

```json
{
  "data": {
    "resumo": { "total_linhas": 5, "aceitas": 3, "rejeitadas": 2, "ignoradas": 0 },
    "aceitas": [
      { "linha": 2, "id": 41, "codigo_identificacao": 41, "nome": "FURADEIRA DE IMPACTO" }
    ],
    "rejeitadas": [
      { "linha": 4, "motivos": ["Categoria é obrigatória"], "dados": { "nome": "Grifo", "marca": "Irwin" } },
      { "linha": 6, "motivos": ["Valor inválido (use o formato 1.234,56)"], "dados": { "nome": "Lixa", "valor": "12,345" } }
    ],
    "ignoradas": [],
    "colunas_ignoradas": []
  }
}
```

- **`linha`** é o número da linha no Excel: o cabeçalho é a linha 1, então o
  primeiro registro é a linha 2.
- **`aceitas`**: registros que entraram no banco. Em ferramentas, já vêm com o
  **código de identificação** gerado (o número que vai gravado na ferramenta e
  impresso na etiqueta).
- **`rejeitadas`**: não entraram. `motivos` diz o que corrigir, e `dados` traz a
  linha como veio no arquivo.
- **`ignoradas`**: não entraram porque o registro **já existe**. Não é erro (ver a
  seção 7).
- **`colunas_ignoradas`**: colunas do arquivo que o sistema não usa. Se aparecer
  aqui uma coluna que você queria importar, confira o nome dela no cabeçalho (por
  exemplo, `local` em vez de `localizacao`).

As linhas rejeitadas **não impedem** as outras de entrar. Para corrigi-las, edite
só essas linhas na planilha e envie o arquivo de novo: as que já entraram são
ignoradas, então nada é duplicado.

### Motivos mais comuns de rejeição

| Motivo | O que fazer |
|---|---|
| `Categoria é obrigatória` / `Setor é obrigatório` | Preencher a coluna. |
| `Categoria "X" não cadastrada` / `Setor "X" não cadastrado` | Corrigir a grafia ou importar/cadastrar a categoria ou o setor antes. |
| `Matrícula deve ter exatamente 4 dígitos numéricos (0001 a 9999)` | Corrigir a matrícula (mais de 4 dígitos, letras ou `0000`). |
| `Nome deve ter no mínimo 2 caracteres` | Preencher o nome da ferramenta. |
| `Valor inválido (use o formato 1.234,56)` | Usar vírgula para os centavos, com no máximo 2 casas. |
| `A linha tem N colunas e o cabeçalho tem M` | Colocar entre aspas o valor que contém o separador. |
| `Limite máximo de 9999 ferramentas ativas atingido…` | Os códigos de 4 dígitos acabaram; dar baixa nas ferramentas que saíram de uso. |

### Quando o arquivo inteiro é recusado

Nesses casos nenhuma linha é processada, e a mensagem em `error.message` explica
o motivo:

- `400`: recurso que não existe na URL; arquivo vazio ou só com o cabeçalho;
  cabeçalho sem uma coluna obrigatória; a mesma coluna duas vezes (inclusive
  `categoria` e `grupo` juntas); mais de 5000 linhas; corpo enviado sem o
  `Content-Type: text/csv` (por exemplo, como formulário).
- `403`: o seu perfil não pode importar esse recurso (por exemplo, a manutenção
  importando categorias).
- `413`: arquivo maior que 2 MB.

## 7. Carga em ondas e reenvio

Na visita técnica de 01/09, a Soufer pediu para cadastrar o inventário aos
poucos, começando pelos itens de maior valor ou giro (máquinas e equipamentos
maiores primeiro, chaves depois). A importação foi feita para isso:

1. Separe a planilha em ondas (uma aba ou um arquivo por onda).
2. Importe uma onda, leia o relatório e corrija as rejeitadas.
3. Pode reenviar a mesma onda quantas vezes precisar: o que já foi cadastrado
   volta como `ignoradas`.
4. Passe para a próxima onda.

Como o sistema reconhece um registro que já existe:

| Recurso | Considera repetido quando |
|---|---|
| `ferramentas` | o **nome + marca + modelo** são iguais aos de uma ferramenta ativa (sem diferenciar maiúsculas e espaços) |
| `colaboradores` | a **matrícula** já existe, mesmo de um colaborador inativo |
| `categorias`, `setores` | o **nome** já existe (sem diferenciar maiúsculas), mesmo inativo |

A mesma combinação repetida dentro do próprio arquivo também é ignorada, com o
motivo `Repetida no arquivo (mesma da linha N)`.

**Atenção às unidades iguais.** Três linhas `MARTELO` sem marca nem modelo são,
para o sistema, a mesma ferramenta: a primeira entra e as outras duas voltam como
`Repetida no arquivo`. Para cadastrar várias unidades idênticas, diferencie as
linhas (por exemplo, no modelo) ou cadastre as demais pela tela de ferramentas
(ver a seção 9).

## 8. Exportando

A exportação devolve um `.csv` pronto para abrir no Excel (com acentos e
separado por `;`):

```bash
curl -H "Authorization: Bearer SEU_TOKEN" -OJ \
  http://localhost:3000/v1/exportacoes/ferramentas
```

O arquivo é salvo como `ferramentas-AAAA-MM-DD.csv`. Troque `ferramentas` por
`colaboradores`, `categorias`, `setores` ou `emprestimos`. Pelo Swagger, use
**Exportações → GET /exportacoes/{recurso}** e o link "Download file" da resposta.

- **Cadastros** saem só com os registros ativos e **com as colunas do modelo de
  importação**, menos o `valor` das ferramentas (ver a seção 9). Dá para
  exportar, acrescentar linhas novas no Excel e importar o arquivo inteiro de
  volta: o que já existia volta como `ignoradas` e só o que é novo entra. Em
  ferramentas, as colunas `codigo` e `status` são só informativas e são
  ignoradas na volta.
- **Células que começam com `=`, `+`, `-` ou `@`** saem com um `'` na frente,
  para o Excel não executar como fórmula. Na reimportação, esse `'` é removido.
- **Empréstimos** saem com as mesmas colunas do botão "Exportar CSV" da tela de
  histórico e aceitam os mesmos filtros da listagem:

  ```bash
  # só os atrasados de um setor, com busca por nome/matrícula/código
  curl -H "Authorization: Bearer SEU_TOKEN" -OJ \
    "http://localhost:3000/v1/exportacoes/emprestimos?situacao=atrasado&setorId=1&q=furadeira"
  ```

  `situacao` aceita `em_aberto`, `atrasado` ou `devolvido`. O limite é de 50 mil
  linhas; acima disso, o arquivo termina com uma linha avisando que foi cortado.

Editar um registro que já existe (trocar o setor de um colaborador, por exemplo)
**não** funciona pela importação: a linha volta como `ignoradas`. Edições são
feitas pela tela de cadastro.

## 9. Limitações conhecidas

- **Unidades idênticas de ferramenta.** Cinco chaves Allen iguais têm o mesmo
  nome, marca e modelo, então só a primeira entra e as outras quatro são
  ignoradas. Para cadastrar todas, diferencie as linhas (por exemplo, o modelo
  `Nº 5`, `Nº 6`) ou cadastre as unidades restantes pela tela de ferramentas.
- **Sem datas.** A planilha de ferramentas não tem coluna de data de aquisição,
  porque o cadastro de ferramenta não tem esse campo.
- **Sem foto e sem kit.** A foto é enviada depois, pela tela da ferramenta. Toda
  ferramenta importada entra como `disponivel` e fora de kit.
- **O valor de aquisição não sai na exportação**, porque a listagem de
  ferramentas também não o mostra.
- **O front ainda não usa estas rotas.** Os botões "Importar CSV" das telas de
  cadastro enviam as linhas uma a uma para as rotas de criação, e o "Exportar
  CSV" do histórico monta o arquivo no navegador. Até o front ser trocado, use
  estas rotas pelo curl, pelo Insomnia ou pelo Swagger.
