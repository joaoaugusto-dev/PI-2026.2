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

| Método | Rota | Perfil | Função |
|---|---|---|---|
| GET | `/v1/health` | Público | Healthcheck |
| POST | `/v1/auth/login` | Público | Login |
| POST | `/v1/auth/registro` | Público | Auto-cadastro por matrícula (cria conta inativa, aguardando aprovação) |
| GET | `/v1/auth/me` | Autenticado | Usuário atual |
| POST | `/v1/consulta/sessao` | Público | Token limitado de consulta |
| GET | `/v1/consulta/ferramentas` | Consulta | Busca somente leitura |
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
| GET/PATCH | `/v1/ocorrencias` | Manutenção | Ocorrências |
| GET/PATCH | `/v1/notificacoes` | Manutenção | Notificações |
| GET | `/v1/dashboard/kpis` | Manutenção | KPIs |
| POST | `/v1/importacoes/ferramentas` | Manutenção | Importação CSV |
| GET | `/v1/relatorios/emprestimos.csv` | Manutenção | Exportação |
| GET | `/v1/usuarios?ativo=false` | Admin | Lista cadastros pendentes de aprovação |
| PATCH | `/v1/usuarios/:id/ativar` | Admin | Aprova um cadastro pendente |

## Retirada de ferramenta (`POST /v1/emprestimos`)

Endpoint central do sistema (issue API-11). Só o perfil `manutencao` acessa.

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
| 403 | `ACCESS_DENIED` | Perfil diferente de `manutencao` (por exemplo, `consulta`). |
| 404 | `FERRAMENTA_NOT_FOUND`, `COLABORADOR_NOT_FOUND`, `SETOR_NOT_FOUND`, `ATIVIDADE_NOT_FOUND`, `ITEM_KIT_NOT_FOUND` | Recurso inexistente ou inativo. |
| 409 | `FERRAMENTA_INDISPONIVEL` | Ferramenta ou kit fora de `disponivel` (`em_uso` ou `indisponivel`, inclusive para peça avulsa de kit indisponível — Regra 2), já com empréstimo em aberto, kit inteiro com peça emprestada (ou o inverso). A mensagem informa o motivo. |

O bloqueio de disponibilidade fica no banco (trigger `fn_valida_retirada`, `fn_valida_kit_exclusividade` e índice único parcial `uq_emprestimo_aberto`); a API traduz o erro para o envelope padrão. Como o trigger não confere o status de kit, a API confere `status = 'disponivel'` para kit e peça avulsa, e trava a linha da ferramenta durante a retirada (ver `arquitetura.md`).

## Devolução de ferramenta (`PATCH /v1/emprestimos/:id/devolucao`)

Fecha o ciclo do empréstimo (issue API-12). Só o perfil `manutencao` acessa.

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
| 403 | `ACCESS_DENIED` | Perfil diferente de `manutencao`. |
| 404 | `EMPRESTIMO_NOT_FOUND` | Id de empréstimo inexistente. |
| 409 | `EMPRESTIMO_JA_DEVOLVIDO` | O empréstimo já tem `data_devolucao` preenchida. |

O `UPDATE` roda numa transação com `SELECT ... FOR UPDATE` na linha do empréstimo: duas devoluções simultâneas do mesmo empréstimo são serializadas, e a segunda encontra `data_devolucao` já preenchida e recebe 409, em vez de as duas passarem e a trigger abrir a ocorrência duas vezes.

A rota `GET /v1/ocorrencias` ainda não existe (issue API-13); até lá, a ocorrência aberta na devolução é conferida por `GET /v1/ferramentas/:id/historico`.

## Sugestão de previsão (`GET /v1/emprestimos/previsao-sugerida?dias=N`)

Calcula "hoje + N dias úteis", pulando sábados, domingos e feriados nacionais. Quem escolhe N é quem retira a ferramenta: não existe prazo padrão. Ex.: retirada na sexta por 2 dias devolve na terça. O front usa o resultado como valor inicial editável de `previsaoDevolucao`.

- `dias`: obrigatório, inteiro de 1 a 30 (senão `400 VALIDATION_ERROR`).
- "Hoje" é a data em Brasília.
- Resposta `200`: `{ "data": { "previsaoDevolucao": "2026-10-06", "diasUteis": 2 } }`.
- Perfil `manutencao` (`401` sem token, `403` para `consulta`).

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
