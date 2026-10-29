# Processos e regras de negócio

## Retirada

1. Identificar a ferramenta por código de barras, patrimônio ou nome.
2. Identificar o colaborador por matrícula ou nome.
3. Se o colaborador não existir, abrir cadastro rápido.
4. Informar a atividade.
5. Informar detalhe e ordem de serviço, quando aplicável.
6. Definir setor de destino.
7. Calcular previsão de devolução em dias úteis.
8. Registrar o usuário logado automaticamente.
9. Confirmar a retirada.

A mesma ferramenta não pode possuir dois empréstimos abertos.

## Devolução

1. Buscar o empréstimo aberto.
2. Exibir dados da retirada.
3. Informar condição:
   - OK;
   - avaria;
   - perda.
4. Se OK, a ferramenta volta para `disponivel`.
5. Se avaria/perda, uma ocorrência é aberta automaticamente.
6. A ferramenta passa para `indisponivel`.

## Indisponíveis

Uma ferramenta indisponível fica em seção própria e não aparece como disponível ou em uso.

O fluxo da ocorrência pode ser:

```text
aberta
  ↓
em_reparo
  ↓
cobrada
  ↓
resolvida / baixada
```

Após o reparo, a disponibilização deve ser uma ação explícita e auditável.

## Auditoria

Toda alteração real em `ferramentas`, `emprestimos` e `ocorrencias` gera uma linha em `auditoria` por trigger do banco (migration `0014`), sem depender de a API lembrar de gravar:

- `INSERT` grava o registro inteiro em `dados_novos`;
- `UPDATE` grava **só as colunas que mudaram**, antes em `dados_anteriores` e depois em `dados_novos`. Um `UPDATE` que só mexeu em `updated_at` não gera linha;
- `DELETE` grava o registro apagado em `dados_anteriores`.

Quem fez a alteração vem do JWT: a API informa o `usuario_id` ao banco no começo da transação (`definirUsuarioAuditoria`), nunca a partir do corpo da requisição. O IP de origem (`req.ip`, que respeita `trust proxy`) segue o mesmo caminho, por um contexto da requisição (`AsyncLocalStorage`), e vai para `ip_origem`. Escritas fora da API (script, `psql`) ficam com `usuario_id` e `ip_origem` nulos.

Uma devolução com avaria deixa três trilhas encadeadas pelas triggers de negócio: o empréstimo (`UPDATE`), a ferramenta (`UPDATE` para `indisponivel`) e a ocorrência aberta automaticamente (`INSERT`). A consulta é `GET /v1/auditoria` (só admin).

`usuarios` fica fora da auditoria automática de propósito (tem `senha_hash`).

## Verificação de consistência dos dados

`npm run data:check` (em `api/`) roda 19 consultas somente de leitura e aponta dado incoerente antes que vire bug:

| Verificação | Gravidade |
|---|---|
| Ferramenta "em uso" sem empréstimo aberto; empréstimo aberto de ferramenta que não está "em uso" | erro |
| Indisponível sem motivo; código de identificação repetido entre ferramentas ativas | erro |
| Matrícula repetida (ignorando maiúsculas e espaços) | erro |
| Previsão de devolução ou devolução anterior à retirada | erro |
| Subgrupo de outro grupo; valor de aquisição negativo; nome em branco | erro |
| Trigger de auditoria ausente ou desabilitada | erro |
| Motivo de indisponibilidade em ferramenta que não está indisponível | aviso |
| Indisponível por avaria/perda sem ocorrência em andamento; ocorrência em andamento com a ferramenta disponível | aviso |
| Devolvido sem a condição; empréstimo aberto de colaborador inativo | aviso |
| Ocorrência de empréstimo sem o colaborador responsável | aviso |
| Foto cadastrada cujo arquivo não existe no disco | aviso |
| Registro criado depois da auditoria entrar em vigor mas sem nenhuma linha de auditoria | aviso |

Saída `0` quando não há **erro** (aviso não reprova), `1` quando há erro e `2` se o comando não conseguiu rodar. `--json` imprime só o JSON (para CI) e `--so-erros` esconde o que passou. O comando **nunca corrige** nada: só lê.

## Consulta

O operador informa a matrícula (4 dígitos, sem senha).

A API valida o colaborador e emite token limitado por 15 minutos.

A consulta permite visualizar somente:

- nome;
- categoria;
- status;
- localização padrão.

Não permite:

- escrita;
- histórico;
- valores;
- identificação de quem está usando a ferramenta.

## Notificações

O timer do servidor (`api/src/server.ts`) gera as notificações: `fn_gerar_notificacoes()`
roda ao subir a API e a cada 30 minutos, sem depender do `pg_cron` (o PostgreSQL do
Dokploy não traz a extensão). Os avisos são da equipe toda e cobrem:

- `devolucao_hoje`: empréstimo aberto com devolução prevista para hoje;
- `atraso`: empréstimo aberto com a previsão em dia anterior;
- `ocorrencia_pendente`: ocorrência não encerrada (fora de `resolvida` e `baixada`) aberta
  há mais de 7 dias. `PERDA` aparece no texto como "extravio".

Há um aviso por empréstimo e por ocorrência: rodar de novo não duplica. A limpeza
(`fn_limpar_notificacoes()`, ao subir e a cada 24 horas) apaga as notificações lidas com mais
de 30 dias; se a situação continuar, nasce um novo aviso, como um lembrete mensal. Falha do
timer vira `logger.warn` e a próxima rodada tenta de novo; o log informa quantos avisos foram
gerados ou apagados, só quando maior que zero.

O sino do cabeçalho apresenta o contador de não lidas (`meta.total` de
`GET /v1/notificacoes?lida=false`). Regras e rotas em
[`../regras-negocio.md`](../regras-negocio.md#complemento--calendário-e-notificações-derivados-das-regras-1-e-3)
e [`api.md`](api.md#notificações-v1notificacoes).

## Código de barras

O patrimônio é gerado automaticamente no formato `SF000000`.

O código é impresso em etiqueta de 50 x 25 mm com:

- código de barras Code128;
- código legível;
- nome abreviado da ferramenta.
