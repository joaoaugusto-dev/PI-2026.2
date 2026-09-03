# Banco de dados

PostgreSQL 18 próprio, sem serviços intermediários (sem Supabase). Todo o schema —
tabelas, tipos enumerados, índices, funções e triggers — vive em uma única migration
(`db/migrations/0001_init.sql`) e é o próprio banco quem garante as regras de negócio
que não podem falhar em hipótese nenhuma, independente de quem ou o que estiver
inserindo os dados.

## Entidades

13 tabelas, organizadas em 5 domínios:

| Domínio | Tabelas | Papel |
|---|---|---|
| Cadastro | `setores`, `grupos_ferramentas`, `subgrupos_ferramentas`, `atividades` | Vocabulário fixo usado para classificar ferramentas e empréstimos |
| Identidade | `usuarios` | Quem tem acesso operacional ao sistema |
| Operação | `colaboradores`, `ferramentas`, `itens_kit` | Quem retira e o que é retirado (inclusive peças de um kit) |
| Transacional | `emprestimos` | Cada retirada/devolução — onde vivem as regras mais importantes |
| Suporte | `ocorrencias`, `notificacoes`, `feriados`, `auditoria` | Dados derivados, gerados automaticamente, para gestão e rastreabilidade |

> `grupos_ferramentas` e `subgrupos_ferramentas` substituem a antiga tabela única
> `categorias`: agora existem dois níveis de classificação (ex.: grupo "Ferramentas
> Manuais" → subgrupo "Chaves combinadas"), necessários para resolver o caso de jogos
> de ferramentas (ver seção "Exceção de kit").

## Tipos enumerados

```text
status_ferramenta          disponivel | em_uso | indisponivel
motivo_indisponibilidade   avaria | perda | manutencao_preventiva | baixada
condicao_devolucao         ok | avaria | perda
status_ocorrencia          aberta | em_reparo | cobrada | resolvida | baixada
papel_usuario               almoxarife
tipo_notificacao            devolucao_hoje | atraso | ocorrencia_pendente | sistema
```

Quando a ferramenta está `indisponivel`, sempre existe um `motivo_indisponibilidade`
associado — nunca fica indisponível sem motivo registrado.

## Identificação da ferramenta

Cada ferramenta tem um `codigo_identificacao`: um número inteiro curto, de **4
dígitos** (1 a 9999). Diferente de um ID sequencial comum, esse código é:

- **Gerado automaticamente** pelo banco no momento do cadastro (trigger
  `fn_gera_codigo_identificacao`) — nunca é digitado.
- **Reaproveitável**: quando uma ferramenta é baixada (`ativo = false`), seu código
  volta para o conjunto de números disponíveis e pode ser atribuído a um cadastro
  futuro. Por isso a unicidade do código é garantida por um **índice único parcial**
  (`uq_ferramenta_codigo_ativo`), válido só entre ferramentas com `ativo = true` — não
  por uma restrição `UNIQUE` simples, que impediria o reaproveitamento.

O número gerado é o que fica gravado fisicamente na ferramenta (fora do sistema); o
banco não depende de nenhuma gravação física para funcionar, só reflete o valor que
foi atribuído.

## Exceção de kit (jogo de ferramentas)

Uma ferramenta pode ser marcada como `eh_kit = true`. Nesse caso, ela representa um
conjunto físico guardado sob um único `codigo_identificacao`, mas contém vários itens
individuais cadastrados em `itens_kit` (ex.: kit "Jogo de Chaves Combinadas" com os
itens "3/8", "7/16", "1/2"...).

Um empréstimo desse kit pode apontar para:

- o **conjunto inteiro** — `emprestimos.item_kit_id` fica nulo; ou
- uma **peça específica** — `item_kit_id` preenchido, referenciando `itens_kit`.

Regras garantidas no banco (não só na aplicação):

- Um item só pode ser cadastrado em `itens_kit` se a ferramenta correspondente tiver
  `eh_kit = true` (trigger `fn_valida_item_kit`).
- Não é possível emprestar o kit inteiro enquanto qualquer peça individual estiver
  aberta, nem emprestar uma peça enquanto o kit inteiro estiver emprestado (trigger
  `fn_valida_kit_exclusividade`) — ver detalhe na seção de triggers.
- Duas peças diferentes do mesmo kit podem estar emprestadas simultaneamente sem
  problema; a mesma peça não pode ser emprestada duas vezes ao mesmo tempo.

## Regra de empréstimo

Uma ferramenta (ou uma peça de kit) só pode ter **um empréstimo em aberto por vez**.
Isso é garantido por um índice único parcial:

```sql
CREATE UNIQUE INDEX uq_emprestimo_aberto
ON emprestimos (ferramenta_id, COALESCE(item_kit_id, 0))
WHERE data_devolucao IS NULL;
```

O `COALESCE(item_kit_id, 0)` trata "kit inteiro" (`item_kit_id` nulo) como uma chave
própria, permitindo que peças diferentes do mesmo kit fiquem abertas ao mesmo tempo
sem violar a unicidade. A exclusão cruzada entre "kit inteiro" e "peça avulsa" — que
esse índice sozinho não consegue expressar — é resolvida pela trigger
`fn_valida_kit_exclusividade`.

## Triggers

| Trigger | Evento | O que garante |
|---|---|---|
| `fn_gera_codigo_identificacao` | `BEFORE INSERT` em `ferramentas` | Atribui o menor código de 4 dígitos disponível entre as ferramentas ativas |
| `fn_valida_subgrupo` | `BEFORE INSERT/UPDATE` em `ferramentas` | Impede informar um `subgrupo_id` que não pertença ao `grupo_id` da mesma linha |
| `fn_valida_item_kit` | `BEFORE INSERT` em `itens_kit` | Só permite item se a ferramenta tiver `eh_kit = true` |
| `fn_valida_retirada` | `BEFORE INSERT` em `emprestimos` | Impede retirada de ferramenta simples que não esteja `disponivel` (kits são validados à parte, peça a peça) |
| `fn_valida_kit_exclusividade` | `BEFORE INSERT` em `emprestimos` | Bloqueia kit inteiro com peça aberta, e peça avulsa com kit inteiro aberto; confere que o item pertence à ferramenta informada |
| `fn_sync_status_ferramenta` | `AFTER INSERT/UPDATE` em `emprestimos` | Retirada → `em_uso`; devolução `ok` → `disponivel`; devolução `avaria`/`perda` → `indisponivel` com o motivo correspondente. Peça avulsa de kit não altera o status do conjunto. |
| `fn_abre_ocorrencia` | `AFTER UPDATE` em `emprestimos` | Devolução com `avaria` ou `perda` cria automaticamente uma ocorrência, herdando ferramenta, colaborador e a peça do kit (se houver) |

## Views

### `vw_emprestimos_detalhe`
Centraliza dados de empréstimo, ferramenta (incluindo `codigo_identificacao` e
`eh_kit`), item de kit (se houver), colaborador, setor, atividade, observação de
atividade e os usuários de retirada/devolução — além da `situacao` calculada
(`em_aberto`, `atrasado` ou `devolvido`).

### `vw_dashboard_kpis`
Fornece: total cadastradas, disponíveis, em uso, indisponíveis, atrasadas e
ocorrências abertas.

### `vw_ocorrencias_por_colaborador`
Agrupa avarias, perdas e custo (real ou estimado) por colaborador e setor.

## Auditoria

Operações críticas podem ser registradas em `auditoria`, mantendo `dados_anteriores`
e `dados_novos` em `jsonb`, junto com a tabela, a operação, o registro afetado e o
usuário responsável.

## Como visualizar o banco

Duas formas simples, sem precisar escrever nada:

1. **pgAdmin ou DBeaver** — conecte no seu Postgres local, navegue até
   `Databases → soufer_dev → Schemas → public → Tables`, clique com o botão direito em
   *Tables* e escolha **ER Diagram For Tables**. Gera o diagrama a partir do banco
   real, já com os dados existentes.
2. **[dbdiagram.io](https://dbdiagram.io)** (gratuito, sem instalar nada) — cole o
   conteúdo do arquivo `docs/bd/der.dbml` do projeto e o diagrama aparece na hora,
   editável.

## Como conectar

O banco é acessado por uma `DATABASE_URL` padrão do PostgreSQL:

```text
postgresql://usuario:senha@host:porta/nome_do_banco
```

Qualquer client (a API do projeto, `psql`, pgAdmin, DBeaver) se conecta com essa
mesma string — o banco não sabe nem precisa saber quem está do outro lado da conexão.
