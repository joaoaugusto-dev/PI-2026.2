# API

## Base

A API utiliza o prefixo:

```text
/v1
```

## Autenticação

O middleware de autenticação decodifica o JWT e injeta o usuário em `req.usuario`.

Os campos de autoria não devem ser aceitos pelo cliente:

- `usuario_retirada_id`
- `usuario_devolucao_id`
- `registrada_por`
- `criado_por`

Esses valores são determinados pelo back-end.

## Endpoints principais

Na coluna Perfil, "Manutenção" vale também para o `admin` (a manutenção com recursos a mais), exceto edição e inativação de cadastros, que são só do `admin`. O `consulta` só acessa as rotas de `/v1/consulta`.

| Método | Rota | Perfil | Função |
|---|---|---|---|
| GET | `/v1/health` | Público | Healthcheck |
| POST | `/v1/auth/login` | Público | Login |
| POST | `/v1/auth/registro` | Público | Auto-cadastro por matrícula (cria conta inativa, aguardando aprovação) |
| GET | `/v1/auth/me` | Autenticado | Usuário atual |
| POST | `/v1/consulta/sessao` | Público | Token limitado de consulta |
| GET | `/v1/consulta/ferramentas` | Consulta | Busca somente leitura; cada item traz só `id`, `nome`, `categoria`, `status`, `localizacao` e `codigo_identificacao` (nunca colaborador, histórico nem valores). Consulta registrada no log |
| GET | `/v1/ferramentas` | Manutenção | Lista de ferramentas (filtros `q`, `status`, `grupoId`, `sort`) |
| GET | `/v1/ferramentas/:id` | Manutenção | Detalhe de uma ferramenta |
| GET | `/v1/ferramentas/por-codigo/:codigo` | Manutenção | Leitura do código |
| GET | `/v1/ferramentas/:id/historico` | Manutenção | Histórico de empréstimos e ocorrências |
| POST | `/v1/ferramentas` | Manutenção | Cadastro |
| PATCH | `/v1/ferramentas/:id` | Manutenção | Atualização parcial |
| PATCH | `/v1/ferramentas/:id/etiqueta-impressa` | Manutenção | Marca a etiqueta como impressa |
| PATCH | `/v1/ferramentas/:id/disponibilizar` | Manutenção | Retorno de reparo |
| DELETE | `/v1/ferramentas/:id` | Manutenção | Baixa lógica (ativo = false) |
| GET | `/v1/colaboradores/identificar` | Manutenção | Identifica por matrícula exata ou nome (unaccent + pg_trgm), 404 se não achar |
| GET/POST/PATCH/DELETE | `/v1/colaboradores` | Manutenção | CRUD (edição parcial via `PATCH /v1/colaboradores/:id`; `DELETE` é inativação lógica) |
| GET/POST/PUT/DELETE | `/v1/setores` | Manutenção | CRUD |
| GET/POST/PUT/DELETE | `/v1/categorias` | Manutenção | CRUD |
| GET/POST/PUT/DELETE | `/v1/atividades` | Manutenção | CRUD |
| GET | `/v1/emprestimos` | Manutenção | Consulta de empréstimos |
| POST | `/v1/emprestimos` | Manutenção | Retirada (ver [Retirada de ferramenta](#retirada-de-ferramenta-post-v1emprestimos)) |
| GET | `/v1/emprestimos/previsao-sugerida` | Manutenção | Sugestão de previsão de devolução em dias úteis |
| PATCH | `/v1/emprestimos/:id/devolucao` | Manutenção | Devolução (ver [Devolução de ferramenta](#devolução-de-ferramenta-patch-v1emprestimosiddevolucao)) |
| GET/PATCH | `/v1/ocorrencias` | Manutenção | Ocorrências (ver [Ocorrências](#ocorrências-get-e-patch-v1ocorrencias)) |
| GET/PATCH | `/v1/notificacoes` | Manutenção | Notificações |
| GET | `/v1/dashboard` | Manutenção/Admin | Tela inicial: contadores e listas de pendências (ver [Dashboard](#dashboard-get-v1dashboard)) |
| POST | `/v1/importacoes/:recurso` | Manutenção/Admin (categorias e setores: Admin) | Importação CSV de ferramentas, colaboradores, categorias e setores (ver [Importação e exportação CSV](#importação-e-exportação-csv)) |
| GET | `/v1/importacoes/:recurso/modelo` | Igual ao da importação | Modelo de CSV do recurso |
| GET | `/v1/exportacoes/:recurso` | Manutenção/Admin | Exportação CSV de cadastros e do histórico de empréstimos |
| GET | `/v1/usuarios?ativo=false` | Admin | Lista cadastros pendentes de aprovação |
| PATCH | `/v1/usuarios/:id/ativar` | Admin | Aprova um cadastro pendente |

## Retirada de ferramenta (`POST /v1/emprestimos`)

Endpoint central do sistema (issue API-11). Perfis `manutencao` e `admin` acessam.

Corpo (JSON, camelCase):

| Campo | Obrigatório | Regra |
|---|---|---|
| `ferramentaId` | Sim | Inteiro positivo; a ferramenta precisa existir e estar ativa. |
| `colaboradorId` | Sim | Inteiro positivo; colaborador ativo. |
| `setorDestinoId` | Sim | Inteiro positivo; setor ativo. |
| `previsaoDevolucao` | Sim | Data e hora (ISO 8601) ou só a data (`YYYY-MM-DD`, vale até 23:59:59). Texto sem offset (sem `Z` nem `±HH:MM`), como o de um `datetime-local` (`2026-10-05T10:00`), é interpretado como horário de Brasília. Não pode estar no passado. |
| `atividadeId` | Não | Atividade é opcional (Regra 4); se informada, precisa existir e estar ativa. |
| `atividadeObservacao` | Não | Texto livre complementar da atividade (até 500 caracteres). |
| `ordemServico` | Não | Até 50 caracteres. |
| `observacoesRetirada` | Não | Até 500 caracteres. |
| `itemKitId` | Não | Peça avulsa de um kit; omitir para ferramenta simples ou para o kit inteiro. |

`usuario_retirada_id` **não é aceito** no corpo (Regra 6): o campo é descartado e o responsável é o usuário do JWT.

Sucesso: `201` com o empréstimo já com os nomes resolvidos (`ferramenta_nome`, `colaborador_nome`, `setor_nome`, `atividade_nome`, `usuario_retirada_nome`, `situacao`), no mesmo formato de `vw_emprestimos_detalhe`. A ferramenta passa para `em_uso` (trigger `fn_sync_status_ferramenta`).

Erros:

| Status | `error.code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campo obrigatório ausente, tipo inválido, `previsaoDevolucao` inválida ou no passado (`details` lista os campos). |
| 400 | `ITEM_KIT_INVALIDO` | `itemKitId` não pertence à ferramenta ou a ferramenta não é kit. |
| 401 | `TOKEN_NOT_PROVIDED` | Sem token. |
| 403 | `ACCESS_DENIED` | Perfil sem permissão (diferente de `manutencao` e `admin`, por exemplo `consulta`). |
| 404 | `FERRAMENTA_NOT_FOUND`, `COLABORADOR_NOT_FOUND`, `SETOR_NOT_FOUND`, `ATIVIDADE_NOT_FOUND`, `ITEM_KIT_NOT_FOUND` | Recurso inexistente ou inativo. |
| 409 | `FERRAMENTA_INDISPONIVEL` | Ferramenta ou kit fora de `disponivel` (`em_uso` ou `indisponivel`, inclusive para peça avulsa de kit indisponível — Regra 2), já com empréstimo em aberto, kit inteiro com peça emprestada (ou o inverso). A mensagem informa o motivo. |

O bloqueio de disponibilidade fica no banco (trigger `fn_valida_retirada`, `fn_valida_kit_exclusividade` e índice único parcial `uq_emprestimo_aberto`); a API traduz o erro para o envelope padrão. Como o trigger não confere o status de kit, a API confere `status = 'disponivel'` para kit e peça avulsa, e trava a linha da ferramenta durante a retirada (ver `arquitetura.md`).

## Devolução de ferramenta (`PATCH /v1/emprestimos/:id/devolucao`)

Fecha o ciclo do empréstimo (issue API-12). Perfis `manutencao` e `admin` acessam.

Corpo (JSON, camelCase):

| Campo | Obrigatório | Regra |
|---|---|---|
| `condicaoDevolucao` | Sim | `ok`, `avaria` ou `perda`. |
| `observacaoDevolucao` | Não | Até 500 caracteres. |

`usuario_devolucao_id` **não é aceito** no corpo (Regra 6): o campo é descartado e o responsável é o usuário do JWT.

Sucesso: `200` com o empréstimo já com os nomes resolvidos (mesmo formato de `vw_emprestimos_detalhe`) e um campo extra `resumo`, uma frase pronta para a confirmação no front (ex.: "Chave de fenda foi para indisponível por avaria."). A trigger `fn_sync_status_ferramenta` muda o status da ferramenta (`disponivel` na condição `ok`; `indisponivel`, com o motivo gravado, em `avaria` ou `perda`); em `avaria` ou `perda` a trigger `fn_abre_ocorrencia` também abre uma ocorrência, herdando o `colaborador_id` do empréstimo (Regra 3). Peça avulsa de kit devolvida com avaria ou perda abre a ocorrência normalmente, mas não muda o status do kit — o restante dele continua disponível (decisão em `docs/decisoes-pendentes.md`).

Erros:

| Status | `error.code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `condicaoDevolucao` ausente ou fora de `ok`/`avaria`/`perda` (`details` lista o campo). |
| 401 | `TOKEN_NOT_PROVIDED` | Sem token. |
| 403 | `ACCESS_DENIED` | Perfil sem permissão (diferente de `manutencao` e `admin`, por exemplo `consulta`). |
| 404 | `EMPRESTIMO_NOT_FOUND` | Id de empréstimo inexistente. |
| 409 | `EMPRESTIMO_JA_DEVOLVIDO` | O empréstimo já tem `data_devolucao` preenchida. |

O `UPDATE` roda numa transação com `SELECT ... FOR UPDATE` na linha do empréstimo: duas devoluções simultâneas do mesmo empréstimo são serializadas, e a segunda encontra `data_devolucao` já preenchida e recebe 409, em vez de as duas passarem e a trigger abrir a ocorrência duas vezes.

A ocorrência aberta na devolução pode ser acompanhada por `GET /v1/ferramentas/:id/historico` ou por `GET /v1/ocorrencias` (issue API-13, ver abaixo).

## Sugestão de previsão (`GET /v1/emprestimos/previsao-sugerida?dias=N`)

Calcula "hoje + N dias úteis", pulando sábados, domingos e feriados nacionais. Quem escolhe N é quem retira a ferramenta: não existe prazo padrão. Ex.: retirada na sexta por 2 dias devolve na terça. O front usa o resultado como valor inicial editável de `previsaoDevolucao`.

- `dias`: obrigatório, inteiro de 1 a 30 (senão `400 VALIDATION_ERROR`).
- "Hoje" é a data em Brasília.
- Resposta `200`: `{ "data": { "previsaoDevolucao": "2026-10-06", "diasUteis": 2 } }`.
- Perfis `manutencao` e `admin` (`401` sem token, `403` para `consulta`).

## Dashboard (`GET /v1/dashboard`)

Tudo que a tela inicial mostra, numa chamada só. Perfis `manutencao` e `admin`.

| Campo | Conteúdo |
|---|---|
| `kpis` | Contadores: `cadastradas`, `disponiveis`, `em_uso`, `indisponiveis`, `atrasadas`, `ocorrencias` (abertas). |
| `cobrar_hoje` | Empréstimos com devolução prevista para hoje (data de Brasília). |
| `atrasados` | Previsão em dia anterior, o mais antigo primeiro (`dias` = dias de atraso). |
| `proximos_do_prazo` | Previsão nos próximos 3 dias (`dias` = dias que faltam). |
| `indisponiveis` | Ferramentas indisponíveis com a ocorrência em andamento (`etapa`, `tipo`) e `dias_parada`. |

Cada lista é `{ "total": n, "itens": [...] }` e traz só as 4 primeiras linhas (as do cartão). O "Mostrar tudo" pagina por `GET /v1/dashboard/:lista` (`cobrar_hoje`, `atrasados`, `proximos_do_prazo` ou `indisponiveis`), com `page` e `limit` (padrão 15, máximo 50) e o `meta` padrão de paginação; lista desconhecida é `400`. `dias_parada` conta desde a abertura da ocorrência em andamento; para ferramenta marcada indisponível à mão, sem ocorrência, cai na última alteração da ferramenta (`updated_at`), que muda a cada edição dela. `page` (1 a 100000) e `limit` (1 a 50) fora do intervalo ou não numéricos devolvem `400`. Contadores e as quatro listas saem de uma conexão só e do mesmo snapshot do banco (transação `REPEATABLE READ` somente leitura), então o painel é coerente entre si e a requisição ocupa 1 conexão do pool; cada página de `GET /v1/dashboard/:lista` também é um snapshot próprio, com total e linhas batendo. `kpis.atrasadas` usa a mesma definição da lista de atrasados (previsão em dia anterior), e não a da view de contadores (já passou do horário), para a barra e o cartão mostrarem o mesmo número.

## Ocorrências (`GET` e `PATCH /v1/ocorrencias`)

Acompanhamento e fechamento das tratativas de avaria/perda (issue API-13). A ocorrência em si não é criada por aqui — quem abre é o trigger `fn_abre_ocorrencia`, disparado pela devolução com avaria ou perda (Regra 3, ver [Devolução de ferramenta](#devolução-de-ferramenta-patch-v1emprestimosiddevolucao)). Perfis `manutencao` e `admin` acessam as duas rotas.

### `GET /v1/ocorrencias`

Query string:

| Parâmetro | Obrigatório | Regra |
|---|---|---|
| `status` | Não | Um de `aberta`, `em_reparo`, `cobrada`, `resolvida`, `baixada`. |
| `colaboradorId` | Não | Inteiro positivo. |
| `tipo` | Não | `AVARIA` ou `PERDA` (aceita minúsculo; é normalizado para maiúsculo antes do filtro). |
| `page`, `limit` | Não | Paginação padrão (`limit` até 100). |

Sem filtro nenhum, traz o histórico completo (inclusive já resolvidas ou baixadas) — o objetivo é acompanhar e fechar as tratativas, não só listar as pendentes.

Sucesso: `200` com a lista paginada, cada item já com `ferramenta_nome`, `colaborador_nome`/`colaborador_matricula`, `registrada_por_nome` e `resolvida_por_nome` resolvidos (join com `ferramentas`, `colaboradores` e `usuarios` → `colaboradores`, já que `usuarios` não guarda nome — ver `docs/backend/arquitetura.md`).

Erros:

| Status | `error.code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `status` ou `tipo` fora dos valores aceitos. |
| 401 | `TOKEN_NOT_PROVIDED` | Sem token. |
| 403 | `ACCESS_DENIED` | Perfil sem permissão (diferente de `manutencao` e `admin`, por exemplo `consulta`). |

### `PATCH /v1/ocorrencias/:id`

Corpo (JSON, camelCase; todos opcionais, mas pelo menos um precisa vir):

| Campo | Regra |
|---|---|
| `status` | Um de `aberta`, `em_reparo`, `cobrada`, `resolvida`, `baixada`. Não é possível retroceder (ver abaixo). |
| `custoEstimado` | Número não negativo. Vazio (`""`) dá erro em vez de virar `0`. |
| `observacoesResolucao` | Até 500 caracteres. |

**Limitação conhecida:** não é possível limpar `custoEstimado` ou `observacoesResolucao` já gravados. O `UPDATE` usa `COALESCE($n, coluna)`, então enviar `null` (ou omitir o campo) preserva o valor atual em vez de zerá-lo — o validator também rejeita `null` explícito. Um custo ou observação gravados errados só podem ser corrigidos com outro valor, nunca removidos.

`resolvida_por` e `data_resolucao` **não são aceitos** no corpo (Regra 6): são preenchidos a partir do usuário do JWT só na transição de entrada para `resolvida` (reenviar `status: "resolvida"` numa ocorrência já resolvida não sobrescreve quem/quando resolveu).

A ordem para a regra de "sem retrocesso" é `aberta < em_reparo < cobrada < resolvida < baixada`: `cobrada` fica entre `em_reparo` e `resolvida` (cobra o custo do colaborador antes de fechar) e `baixada` é o estado final, podendo vir depois de `resolvida`. O ciclo mínimo citado na issue (`aberta → em_reparo → resolvida`) é só um caminho possível; pular direto de `em_reparo` para `resolvida`, ou passar por `cobrada`/`baixada`, também é aceito, desde que sempre para a frente.

Sucesso: `200` com a ocorrência atualizada, mesmo formato do `GET`, mais o campo `sugestao_disponibilizar_ferramenta_id` (extra "se sobrar tempo" da issue, ver abaixo).

Erros:

| Status | `error.code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Corpo vazio, `status`/`custoEstimado`/`observacoesResolucao` inválidos. |
| 401 | `TOKEN_NOT_PROVIDED` | Sem token. |
| 403 | `ACCESS_DENIED` | Perfil sem permissão (diferente de `manutencao` e `admin`, por exemplo `consulta`). |
| 404 | `OCORRENCIA_NOT_FOUND` | Id de ocorrência inexistente. |
| 409 | `OCORRENCIA_TRANSICAO_INVALIDA` | Tentativa de retroceder o status. |

O `UPDATE` roda numa transação com `SELECT ... FOR UPDATE` na linha da ocorrência, mesmo padrão da devolução: dois `PATCH` simultâneos na mesma ocorrência são serializados.

**Extra implementado ("se sobrar tempo"):** ao marcar `resolvida` (só na transição de entrada, não em reenvios), se a ferramenta ainda estiver `indisponivel`, o response traz `sugestao_disponibilizar_ferramenta_id` com o id dela — uma sugestão para o front chamar `PATCH /v1/ferramentas/:id/disponibilizar` em seguida, sem essa chamada acontecer automaticamente. Se a ferramenta já estiver `disponivel` (por exemplo, outra ocorrência dela já foi resolvida por essa rota, que também disponibiliza a ferramenta), o campo vem `null`.


### `PATCH /v1/ocorrencias/:id/avancar`

Anda uma etapa da tratativa: `aberta → em_reparo → cobrada → resolvida`. Sem corpo. A etapa de destino é calculada no servidor, com a linha travada (`FOR UPDATE`), então dois cliques seguidos não pulam duas etapas. Ao chegar em `resolvida` grava `resolvida_por`/`data_resolucao` do JWT (Regra 6) e traz `sugestao_disponibilizar_ferramenta_id`, como o `PATCH /:id`. `baixada` fica fora do ciclo (decisão sobre a ferramenta, feita pelo `PATCH /:id`). Perfis `manutencao` e `admin`.

| Status | Código | Quando |
|---|---|---|
| 404 | `OCORRENCIA_NOT_FOUND` | Ocorrência inexistente. |
| 409 | `OCORRENCIA_TRANSICAO_INVALIDA` | Já está `resolvida` ou `baixada`. |

## Importação e exportação CSV

Toda entrada e saída de planilha passa por três rotas genéricas, escolhendo o recurso pela URL. O passo a passo para quem vai usar está em [`importacao.md`](importacao.md).

| Rota | Recursos |
|---|---|
| `POST /v1/importacoes/:recurso` | `ferramentas`, `colaboradores`, `categorias`, `setores` |
| `GET /v1/importacoes/:recurso/modelo` | os mesmos quatro |
| `GET /v1/exportacoes/:recurso` | os quatro acima e `emprestimos` |

Recurso fora da lista devolve `400 VALIDATION_ERROR`.

### Importação (`POST /v1/importacoes/:recurso`)

Origem: issue DATA-03. Cada recurso exige **os mesmos perfis da rota de cadastro dele**:

- `ferramentas` e `colaboradores`: `manutencao` e `admin`;
- `categorias` e `setores`: só `admin`, com `403` para a manutenção.

O corpo é o **arquivo CSV cru**, não JSON nem multipart:

- `Content-Type: text/csv` (também aceita `application/csv`, `application/vnd.ms-excel` e `text/plain`);
- até 2 MB e 5000 linhas;
- separador `;` ou `,`, detectado pelo cabeçalho como no front (`lib/csv.ts`);
- codificação UTF-8 (com ou sem BOM) ou Windows-1252, que é como o Excel em português salva CSV.

Colunas de cada recurso (\* = obrigatória):

| Recurso | Coluna | Regra |
|---|---|---|
| `ferramentas` | `nome`\* | 2 a 150 caracteres. Gravado em **maiúsculas**. |
| | `categoria`\* (ou `grupo`) | Nome de uma categoria ativa. |
| | `marca`, `modelo` | Até 100 caracteres. |
| | `setor` | Nome de um setor ativo. |
| | `localizacao` | Até 150 caracteres. |
| | `descricao` | Até 2000 caracteres. |
| | `valor` (ou `valor_aquisicao`) | Formato brasileiro: `1.234,56`, `1234,56`, `R$ 89,90` (também aceita `89.90`). Vai para `valor_aquisicao`. |
| `colaboradores` | `matricula`\* | 4 dígitos (`0001` a `9999`). Com 1 a 3 dígitos, completa com zeros (`36` vira `0036`), porque o Excel apaga o zero à esquerda. |
| | `nome`\* | Até 150 caracteres. |
| | `setor`\* | Nome de um setor ativo. |
| `categorias`, `setores` | `nome`\* | Até 100 caracteres. |

Regras comuns a todos os recursos:

- **Cabeçalho:** não diferencia maiúsculas nem acentos (`Localização` vale `localizacao`). A mesma coluna duas vezes, inclusive por apelido (`categoria` e `grupo`), devolve `400`, em vez de uma sobrescrever a outra.
- **Proteção contra fórmula:** um `'` inicial que a exportação acrescentou (célula começando com `=`, `+`, `-` ou `@`) é removido. Assim, reimportar um arquivo exportado não grava o `'` no nome.
- **Colunas desconhecidas:** são ignoradas e listadas em `colunas_ignoradas`.
- **Espaços:** em todo campo, os das pontas são removidos e os repetidos viram um só.
- **Nomes de categoria e setor:** comparados sem diferenciar maiúsculas.
- **Validação:** cada linha passa pelo Zod, com as mesmas regras da rota de cadastro, e **linha inválida não bloqueia as válidas**.
- **Transação:** a carga roda numa transação, com um `SAVEPOINT` por linha. Uma falha do banco numa linha (por exemplo, o limite de 9999 códigos de ferramenta) só rejeita aquela linha.
- **Concorrência:** duas importações simultâneas do mesmo recurso são serializadas por advisory lock.
- **Regra 6:** em `colaboradores`, `criado_por` vem do JWT, como no `POST /v1/colaboradores`.

**Deduplicação.** Uma linha igual a um registro que já existe, ou a uma linha anterior do próprio arquivo, vai para `ignoradas`, e não para `rejeitadas`. Assim, **reenviar o mesmo arquivo é seguro**, o que permite carregar o inventário em ondas (visita técnica de 01/09). A chave de cada recurso:

| Recurso | Chave | Compara com |
|---|---|---|
| `ferramentas` | `nome` + `marca` + `modelo`, sem diferenciar maiúsculas e espaços (a mesma de `chaveFerramenta` no front) | ferramentas ativas |
| `colaboradores` | `matricula` | todos os colaboradores, inclusive os inativos (a matrícula é única no banco) |
| `categorias`, `setores` | `nome`, sem diferenciar maiúsculas | todos os registros, inclusive os inativos (o índice único é em `LOWER(nome)`) |

Não há `patrimonio_legado` no schema (ver o [dicionário de dados](../banco-de-dados/dicionario-de-dados.md)).

Resposta `200`:

```json
{
  "data": {
    "resumo": { "total_linhas": 5, "aceitas": 3, "rejeitadas": 2, "ignoradas": 0 },
    "aceitas": [{ "linha": 2, "id": 41, "codigo_identificacao": 41, "nome": "FURADEIRA DE IMPACTO" }],
    "rejeitadas": [{ "linha": 4, "motivos": ["Categoria é obrigatória"], "dados": { "nome": "Grifo", "marca": "Irwin" } }],
    "ignoradas": [],
    "colunas_ignoradas": []
  }
}
```

- `linha` é a linha física do arquivo (o cabeçalho é a 1).
- Cada item de `aceitas` traz o `id` e os campos que identificam o registro: `codigo_identificacao` e `nome` em ferramentas, `matricula` e `nome` em colaboradores, `nome` em categorias e setores.
- `dados` traz os valores como vieram no arquivo, para o front montar um CSV de correção com as rejeitadas.

| Status | Código | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Recurso desconhecido; sem corpo ou com `Content-Type` diferente dos aceitos; CSV ilegível ou vazio; só cabeçalho; cabeçalho sem as colunas obrigatórias ou com coluna repetida; mais de 5000 linhas. |
| 401 | `TOKEN_NOT_PROVIDED` | Sem token. |
| 403 | `ACCESS_DENIED` | Perfil sem permissão para o recurso (`consulta`; ou `manutencao` em `categorias`/`setores`). |
| 413 | `PAYLOAD_TOO_LARGE` | Arquivo maior que 2 MB. |

**Não implementado:** a conversão de datas `DD/MM/AAAA` prevista na DATA-03. `ferramentas` não tem coluna de data, e o inventário da DATA-01 não traz datas.

### Modelo de CSV (`GET /v1/importacoes/:recurso/modelo`)

Devolve um arquivo para download (`modelo-<recurso>.csv`) com o cabeçalho aceito pelo recurso e uma linha de exemplo. Os perfis exigidos são os mesmos da importação. O arquivo pode ser preenchido e enviado de volta sem ajuste.

### Exportação (`GET /v1/exportacoes/:recurso`)

Devolve um arquivo para download (`<recurso>-AAAA-MM-DD.csv`, com a data de Brasília). Perfis `manutencao` e `admin`.

O formato é o mesmo do `baixarCsv` do front, para o Excel em português abrir direto: UTF-8 com BOM, separador `;`, todas as células entre aspas. Células que o Excel trataria como fórmula (começando com `=`, `+`, `-` ou `@`) ganham um `'` na frente, contra injeção de fórmula.

- **Cadastros** (`ferramentas`, `colaboradores`, `categorias`, `setores`): só os registros ativos, com **as colunas do modelo de importação**. A exceção é `valor` em `ferramentas`, que não é exportado porque a listagem de ferramentas também não expõe `valor_aquisicao` (incluir depende de decisão da equipe). Em `ferramentas` saem também `codigo` e `status`, que são ignoradas se o arquivo voltar pela importação.
- **Exportar → editar → reimportar** serve para **acrescentar registros novos**: o que já existe volta como `ignoradas`. Alterar um registro existente pela planilha não tem efeito; edição é pela rota de cadastro.
- **`emprestimos`:** as mesmas colunas e o mesmo formato do "Exportar CSV" da tela de histórico. Aceita os mesmos filtros de `GET /v1/emprestimos` (`q`, `situacao`, `setorId`), e filtro inválido devolve `400`. Sai numa consulta só, sem paginação, até 50 mil linhas. Acima disso, o arquivo é cortado e ganha uma linha final avisando.

## Resposta de sucesso

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 128
  }
}
```

## Resposta de erro

```json
{
  "error": {
    "code": "FERRAMENTA_INDISPONIVEL",
    "message": "...",
    "details": []
  }
}
```

## Códigos

`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
