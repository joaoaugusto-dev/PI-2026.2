# Dicionário de Dados — SOUFER Tools

Documento campo a campo das 13 tabelas do banco, gerado a partir de
`api/db/migrations/0001_init.sql` (não editar este
documento sem editar a migration junto, e vice-versa).

**Origem do dado — legenda:**
- **Digitado**: preenchido pelo usuário em algum formulário.
- **Calculado**: preenchido pelo banco (default, trigger ou sequência), nunca digitado.
- **Token**: preenchido pela API a partir do usuário autenticado (JWT) — nunca aceito no corpo da requisição (Regra 6 do `CLAUDE.md`).
- **Importado**: vem de uma carga externa (CSV da manutenção).
- **API externa**: vem de uma integração (BrasilAPI).

---

## 1. `setores`

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `nome` | varchar(100) | Sim | único | Digitado |
| `ativo` | boolean | Sim | true / false — default true | Calculado (default) |
| `created_at` | timestamptz | Sim | — | Calculado (default `now()`) |
| `updated_at` | timestamptz | Sim | — | Calculado (default `now()`) |

**Índices/constraints relevantes:** `UNIQUE(nome)`.

---

## 2. `grupos_ferramentas`

Substitui a antiga `categorias`. Nível 1 de classificação de ferramentas.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `nome` | varchar(100) | Sim | único | Digitado |
| `ativo` | boolean | Sim | true / false — default true | Calculado (default) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |
| `updated_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** `UNIQUE(nome)`.

---

## 3. `subgrupos_ferramentas`

Nível 2 de classificação (ex.: grupo "Ferramentas Manuais" → subgrupo "Chave
3/8"). Tabela nova, criada na revisão pós visita técnica (não existia na v1
do DER).

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `grupo_id` | integer (FK) | Sim | referencia `grupos_ferramentas` | Selecionado |
| `nome` | varchar(100) | Sim | único **dentro do grupo** | Digitado |
| `ativo` | boolean | Sim | true / false — default true | Calculado (default) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |
| `updated_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** `UNIQUE(grupo_id, nome)` — o mesmo nome
de subgrupo pode existir em grupos diferentes, mas não duas vezes no mesmo
grupo. FK `grupo_id` com `ON DELETE RESTRICT` (não é possível apagar um grupo
que já tem subgrupo).

---

## 4. `atividades`

Catálogo rápido para seleção no formulário de retirada.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `nome` | varchar(100) | Sim | único — lista pré-cadastrada e editável | Digitado |
| `descricao` | text | Não | texto livre | Digitado |
| `ativo` | boolean | Sim | true / false — default true | Calculado (default) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |
| `updated_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** `UNIQUE(nome)`.

> O campo livre complementar do fluxo "catálogo + Outro" (Regra 12 do
> `CLAUDE.md`) **não fica aqui** — fica em `emprestimos.atividade_observacao`.

---

## 5. `usuarios`

Quem tem acesso operacional ao sistema (perfil `almoxarife`).

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `nome` | varchar(150) | Sim | texto livre | Digitado |
| `email` | varchar(150) | Sim | único, formato de e-mail | Digitado |
| `senha_hash` | varchar(255) | Sim | hash bcrypt — nunca a senha em texto puro | Calculado (a API faz o hash antes de salvar) |
| `papel` | enum `papel_usuario` | Sim | `almoxarife` — único valor hoje | Calculado (default) |
| `ativo` | boolean | Sim | true / false — default true | Calculado (default) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |
| `updated_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** `UNIQUE(email)`.

---

## 6. `colaboradores`

Funcionários que retiram ferramentas — não têm login no sistema.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `nome` | varchar(150) | Sim | texto livre, buscável | Digitado |
| `matricula` | varchar(50) | Sim | único | Digitado |
| `setor_id` | integer (FK) | Sim | referencia `setores` | Selecionado |
| `ativo` | boolean | Sim | true / false — default true | Calculado (default) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |
| `updated_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** `UNIQUE(matricula)`. FK `setor_id` com
`ON DELETE RESTRICT`.

> Simplificado na revisão de 02/09/2026: **sem** `codigo_cracha`, **sem**
> `cargo`, **sem** `ramal` — o fluxo real validado na visita técnica usa só
> matrícula digitada. `setor_id` continua **obrigatório** porque o sistema
> precisa "puxar nome e setor" automaticamente ao digitar a matrícula.

---

## 7. `ferramentas`

A tabela mais alterada desde a v1 do DER.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `nome` | varchar(150) | Sim | texto livre, buscável | Digitado |
| `descricao` | text | Não | texto livre | Digitado |
| `marca` | varchar(100) | Não | texto livre | Digitado |
| `modelo` | varchar(100) | Não | texto livre | Digitado |
| `codigo_identificacao` | smallint | Não* | 1 a 9999 (`CHECK`) | **Calculado** (trigger `fn_gera_codigo_identificacao`) |
| `grupo_id` | integer (FK) | Sim | referencia `grupos_ferramentas` | Selecionado |
| `subgrupo_id` | integer (FK) | Não | referencia `subgrupos_ferramentas`, deve pertencer ao `grupo_id` informado (validado por trigger) | Selecionado |
| `setor_id` | integer (FK) | Não | referencia `setores` | Selecionado |
| `localizacao` | varchar(150) | Não | texto livre — endereçamento específico (ex.: "Gaveta B3"), além do setor | Digitado |
| `status` | enum `status_ferramenta` | Sim | `disponivel` \| `em_uso` \| `indisponivel` — default `disponivel` | Calculado (trigger `fn_sync_status_ferramenta`, a partir dos empréstimos) |
| `motivo_indisponivel` | enum `motivo_indisponibilidade` | Condicional | `avaria` \| `perda` \| `manutencao_preventiva` \| `baixada` — obrigatório na prática quando `status = indisponivel` | Calculado (trigger, na devolução com avaria/perda) |
| `eh_kit` | boolean | Sim | true / false — default false | Digitado |
| `valor_aquisicao` | numeric(10,2) | Não | >= 0 | Digitado |
| `foto_url` | text | Não | URL/caminho do arquivo — não é o binário da imagem | Digitado (upload gera a URL) |
| `ativo` | boolean | Sim | true / false — default true (baixa lógica) | Digitado/Calculado (baixa manual) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |
| `updated_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:**
- `uq_ferramenta_codigo_ativo`: índice único **parcial** em
  `codigo_identificacao` `WHERE ativo = true` — permite que o código de uma
  ferramenta baixada seja reaproveitado por um cadastro novo.
- FK `grupo_id` `ON DELETE RESTRICT` (obrigatória).
- FK `subgrupo_id` e `setor_id` `ON DELETE RESTRICT` (opcionais).
- Trigger `fn_valida_subgrupo`: impede salvar um `subgrupo_id` que não
  pertença ao `grupo_id` da mesma linha.

> \* `codigo_identificacao` é tecnicamente uma coluna *nullable* no banco,
> mas na prática **sempre** é preenchida pelo trigger no `INSERT` — não existe
> fluxo de cadastro que deixe esse campo vazio de propósito.
>
> **Substituição em relação à v1 do DER:** não existe mais
> `codigo_patrimonio` (`SF`+6 dígitos, calculado do `id`, com etiqueta
> Code128), nem `patrimonio_legado`, nem `etiqueta_impressa_em`. O código
> atual é gerado buscando o menor número livre entre ferramentas ativas, e é
> gravado fisicamente a lápis elétrico — o sistema não depende dessa
> gravação para funcionar, só reflete o valor atribuído.

---

## 8. `itens_kit`

Tabela nova — peça individual de uma ferramenta marcada como kit.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `ferramenta_id` | integer (FK) | Sim | referencia `ferramentas`, que deve ter `eh_kit = true` (validado por trigger) | Selecionado |
| `nome` | varchar(100) | Sim | único **dentro da ferramenta** (ex.: "3/8", "7/16") | Digitado |
| `ativo` | boolean | Sim | true / false — default true | Calculado (default) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** `UNIQUE(ferramenta_id, nome)`. FK
`ferramenta_id` `ON DELETE CASCADE` (apagar o kit apaga as peças). Trigger
`fn_valida_item_kit`: rejeita o insert se a ferramenta referenciada não tiver
`eh_kit = true`.

---

## 9. `emprestimos`

Núcleo transacional — onde vivem as regras mais importantes do sistema.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `ferramenta_id` | integer (FK) | Sim | referencia `ferramentas` | Identificado por código |
| `item_kit_id` | integer (FK) | Não | referencia `itens_kit`; nulo = kit inteiro ou ferramenta simples | Selecionado (só quando `eh_kit = true`) |
| `colaborador_id` | integer (FK) | Sim | referencia `colaboradores` | Identificado por matrícula |
| `setor_destino_id` | integer (FK) | Sim | referencia `setores` | Selecionado |
| `atividade_id` | integer (FK) | **Não** | referencia `atividades` | Selecionado |
| `atividade_observacao` | text | Não | texto livre complementar | Digitado |
| `usuario_retirada_id` | integer (FK) | Sim | referencia `usuarios` | **Token** |
| `usuario_devolucao_id` | integer (FK) | Não | referencia `usuarios` | **Token** |
| `data_retirada` | timestamptz | Sim | — | Calculado (default `now()`) |
| `previsao_devolucao` | timestamptz | Sim | — | Digitado/Calculado (calendário ou atalho "hoje"/"amanhã") |
| `data_devolucao` | timestamptz | Não | nula enquanto o empréstimo está aberto | Calculado (preenchido na devolução) |
| `condicao_devolucao` | enum `condicao_devolucao` | Condicional | `ok` \| `avaria` \| `perda` — preenchido junto com `data_devolucao` | Selecionado (na devolução) |
| `observacoes_retirada` | text | Não | texto livre | Digitado |
| `observacoes_devolucao` | text | Não | texto livre | Digitado |
| `ordem_servico` | varchar(50) | Não | texto livre | Digitado |
| `created_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:**
- `uq_emprestimo_aberto`: índice único **parcial** em
  `(ferramenta_id, COALESCE(item_kit_id, 0))` `WHERE data_devolucao IS NULL`
  — no máximo um empréstimo aberto por ferramenta (ou por peça de kit).
- Trigger `fn_valida_retirada`: bloqueia retirada de ferramenta simples cujo
  `status` não seja `disponivel`.
- Trigger `fn_valida_kit_exclusividade`: impede emprestar o kit inteiro
  enquanto qualquer peça estiver aberta, e vice-versa — regra que o índice
  acima sozinho não cobre.
- Trigger `fn_sync_status_ferramenta`: muda `ferramentas.status`
  automaticamente na retirada/devolução.
- Trigger `fn_abre_ocorrencia`: cria uma linha em `ocorrencias`
  automaticamente quando a devolução tem `condicao_devolucao` `avaria` ou
  `perda`.

> **Atualizado 02/09/2026:** `atividade_id` deixou de ser `NOT NULL` — o
> relatório da visita técnica confirmou que motivo/atividade é opcional na
> retirada (Regra 4 do `CLAUDE.md`). Esta era a divergência entre schema e
> documentação identificada e corrigida antes deste dicionário ser escrito.
>
> **Regra do token (Regra 6 do `CLAUDE.md`):** `usuario_retirada_id` e
> `usuario_devolucao_id` **nunca são aceitos no corpo da requisição** — a API
> sempre os preenche a partir do usuário autenticado no JWT, mesmo que
> alguém tente enviar esses campos manualmente.

---

## 10. `ocorrencias`

Avarias, perdas e reparos — em geral geradas automaticamente pela trigger
`fn_abre_ocorrencia`, mas também podem ser abertas manualmente.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `emprestimo_id` | integer (FK) | Não | referencia `emprestimos` | Calculado (herdado do empréstimo, quando automática) |
| `ferramenta_id` | integer (FK) | Sim | referencia `ferramentas` | Calculado (herdado) ou selecionado |
| `item_kit_id` | integer (FK) | Não | referencia `itens_kit` | Calculado (herdado) ou selecionado |
| `colaborador_id` | integer (FK) | Não | referencia `colaboradores` | Calculado (herdado) ou selecionado |
| `tipo` | varchar(50) | Sim | texto livre (ex.: `AVARIA`, `PERDA`) | Calculado (a partir de `condicao_devolucao`) ou digitado |
| `descricao` | text | Sim | texto livre | Digitado (ou texto padrão gerado automaticamente) |
| `status` | enum `status_ocorrencia` | Sim | `aberta` \| `em_reparo` \| `cobrada` \| `resolvida` \| `baixada` — default `aberta` | Calculado (default) / atualizado pelo almoxarife |
| `custo_estimado` | numeric(10,2) | Não | >= 0 | Digitado |
| `custo_real` | numeric(10,2) | Não | >= 0 | Digitado |
| `data_resolucao` | timestamptz | Não | — | Digitado/Calculado |
| `observacoes_resolucao` | text | Não | texto livre | Digitado |
| `registrada_por` | integer (FK) | Sim | referencia `usuarios` | **Token** |
| `resolvida_por` | integer (FK) | Não | referencia `usuarios` | **Token** |
| `created_at` | timestamptz | Sim | — | Calculado (default) |
| `updated_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** FK `emprestimo_id` com
`ON DELETE SET NULL`; FK `ferramenta_id` com `ON DELETE RESTRICT`.

> `resolvida_por` não estava previsto na v1 do DER — é um campo do schema
> atual que também segue a regra do token (Regra 6), igual `registrada_por`.

---

## 11. `notificacoes`

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `usuario_id` | integer (FK) | Não | referencia `usuarios` | Calculado |
| `tipo` | enum `tipo_notificacao` | Sim | `devolucao_hoje` \| `atraso` \| `ocorrencia_pendente` \| `sistema` | Calculado |
| `titulo` | varchar(150) | Sim | texto livre | Calculado |
| `mensagem` | text | Sim | texto livre | Calculado |
| `lida` | boolean | Sim | true / false — default false | Calculado (default) / atualizado ao abrir |
| `link` | varchar(255) | Não | caminho relativo da tela relacionada | Calculado |
| `created_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** FK `usuario_id` com `ON DELETE CASCADE`.

> Tabela alimentada por rotina automática (varredura de empréstimos
> vencendo/atrasados), nunca por digitação direta do usuário final.

---

## 12. `feriados`

Cache local da BrasilAPI.

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `data` | date | Sim | única | **API externa** (BrasilAPI) |
| `nome` | varchar(150) | Sim | texto livre | **API externa** |
| `tipo` | varchar(50) | Não | texto livre (ex.: `nacional`) | **API externa** |
| `ano` | integer | Sim | — | **API externa** |
| `created_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** `UNIQUE(data)`. Sem nenhuma FK — não
participa do relacionamento transacional, só é consultada pela aplicação
para calcular prazos em dias úteis.

---

## 13. `auditoria`

| Campo | Tipo | Obrigatório | Domínio / valores | Origem |
|---|---|---|---|---|
| `id` | serial | Sim (PK) | sequencial | Calculado |
| `tabela` | varchar(50) | Sim | nome da tabela auditada — sem FK, para auditar qualquer entidade | Calculado |
| `operacao` | varchar(20) | Sim | ex.: `INSERT`, `UPDATE`, `DELETE` | Calculado |
| `registro_id` | integer | Não | id do registro afetado — sem FK (genérico) | Calculado |
| `dados_anteriores` | jsonb | Não | estado da linha antes da operação | Calculado |
| `dados_novos` | jsonb | Não | estado da linha depois da operação | Calculado |
| `usuario_id` | integer (FK) | Não | referencia `usuarios` | **Token** |
| `ip_origem` | varchar(50) | Não | IP de origem da requisição | Calculado (a API preenche a partir da requisição) |
| `created_at` | timestamptz | Sim | — | Calculado (default) |

**Índices/constraints relevantes:** FK `usuario_id` com `ON DELETE SET NULL`
— apagar um usuário não apaga o histórico de auditoria dele.

---

## Enums do sistema

| Enum | Valores | Usado em |
|---|---|---|
| `status_ferramenta` | `disponivel`, `em_uso`, `indisponivel` | `ferramentas.status` |
| `motivo_indisponibilidade` | `avaria`, `perda`, `manutencao_preventiva`, `baixada` | `ferramentas.motivo_indisponivel` |
| `condicao_devolucao` | `ok`, `avaria`, `perda` | `emprestimos.condicao_devolucao` |
| `status_ocorrencia` | `aberta`, `em_reparo`, `cobrada`, `resolvida`, `baixada` | `ocorrencias.status` |
| `papel_usuario` | `almoxarife` | `usuarios.papel` |
| `tipo_notificacao` | `devolucao_hoje`, `atraso`, `ocorrencia_pendente`, `sistema` | `notificacoes.tipo` |

---

## Campos que vêm do token (Regra 6 do `CLAUDE.md`) — resumo

Nunca aceitos no corpo da requisição, sempre preenchidos pela API a partir
do usuário autenticado:

- `emprestimos.usuario_retirada_id`
- `emprestimos.usuario_devolucao_id`
- `ocorrencias.registrada_por`
- `ocorrencias.resolvida_por`
- `auditoria.usuario_id`
