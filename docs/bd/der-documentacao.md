# DB-02 — Modelo Conceitual e Lógico (DER) — Revisão 02/09/2026

**Issue:** [#21](https://github.com/joaoaugusto-dev/PI-2026.2/issues/21) · **Responsável:** Henrique de Oliveira Molinari
**Entregáveis:** `docs/bd/der-visual-dbdiagram.png`, `docs/bd/der.dbml`

---

## 1. O que mudou nesta revisão

A primeira versão do DER (11 tabelas) foi feita antes da visita técnica de
31/08/2026 na Soufer. Esta revisão incorpora as três atualizações que a issue
#21 listava como pendentes, mais uma correção adicional encontrada ao revisar
o schema:

| Mudança | Antes | Agora |
|---|---|---|
| Identificação da ferramenta | `codigo_patrimonio` (`SF` + 6 dígitos, calculado do `id`, com etiqueta Code128) | `codigo_identificacao` (smallint, 4 dígitos, gerado por trigger, **reaproveitável** quando a ferramenta é baixada) |
| Classificação de ferramentas | `categorias` (tabela única, com `descricao`) | `grupos_ferramentas` (sem `descricao`) + **nova** `subgrupos_ferramentas` (nível 2) |
| Jogo de ferramentas (chaves) | Não resolvido — bloqueio explícito da issue | **Nova tabela `itens_kit`** + campo `ferramentas.eh_kit` + trigger de exclusividade |
| Campos novos em `ferramentas` | — | `marca`, `modelo`, `valor_aquisicao` (`localizacao_padrao` foi renomeado para `localizacao`; `foto_url` já existia) |
| `emprestimos.atividade_id` | `NOT NULL` | **Opcional** — corrigido nesta revisão (ver Seção 3) |
| Dono do processo | "almoxarifado" (nas telas/nomes de issue) | Manutenção — o almoxarifado geral só cuida de consumíveis |
| Total de tabelas | 11 | **13** |

---

## 2. Por que essa organização

### 2.1 `grupos_ferramentas` + `subgrupos_ferramentas` (resolve o bloqueio da issue)
A issue #21 travava explicitamente em "cadastro individual vs. grupo (jogo de
chaves)". A Soufer sugeriu na própria visita o caminho de categoria +
subgrupo (ex.: "chave de fenda" → "chave 3/8"), e foi isso que modelamos:
`subgrupos_ferramentas` é sempre amarrado a um `grupo_ferramentas` (FK
obrigatória + `UNIQUE(grupo_id, nome)`), garantindo que "Chave 3/8" só possa
existir dentro de um grupo real, nunca solta.

### 2.2 `itens_kit` — a parte que o grupo/subgrupo sozinho não resolve
Grupo/subgrupo classifica o *tipo* da ferramenta, mas não resolve o
problema físico: um jogo de chaves é **um objeto guardado sob um único
código**, mas o mecânico às vezes leva só uma peça. Por isso qualquer
ferramenta pode virar um "kit" (`eh_kit = true`), abrindo espaço para
`itens_kit` — as peças individuais dentro dele. O empréstimo passa a poder
apontar para o conjunto inteiro (`item_kit_id` nulo) ou para uma peça
(`item_kit_id` preenchido).

A regra de exclusividade (não pode emprestar o kit inteiro com peça fora, e
vice-versa) **não cabe em um índice único simples** — por isso existe a
trigger `fn_valida_kit_exclusividade`, documentada por extenso em
`der.dbml` e no próprio `0001_init.sql`.

### 2.3 `codigo_identificacao` reaproveitável — por que não é só um `UNIQUE`
Diferente da primeira versão (código calculado do `id`, nunca reutilizado),
a visita técnica revelou que o parque de ferramentas é finito (~1000 itens,
código de 4 dígitos cobre até 9999) e que ferramentas são baixadas com
frequência (perda, fim de vida útil). Um `UNIQUE` simples desperdiçaria
números para sempre. A solução foi um **índice único parcial**
(`WHERE ativo = true`): a unicidade vale só entre ferramentas ativas, então
o código de uma ferramenta baixada fica livre para uma ferramenta nova.

### 2.4 `emprestimos.atividade_id` virou opcional — correção necessária
Esta é uma correção, não uma decisão nova: o relatório da visita técnica é
explícito — *"Motivo/atividade opcional"* (Seção 4). A primeira leitura desse
requisito, tanto no `CLAUDE.md` quanto no schema, manteve o campo como
`NOT NULL` por engano. Nesta revisão:
- `emprestimos.atividade_id` deixou de ter `NOT NULL` no
  `api/db/migrations/0001_init.sql`;
- a view `vw_emprestimos_detalhe` trocou o `JOIN atividades` por
  `LEFT JOIN`, já que agora pode ser nulo;
- a Regra 4 do `CLAUDE.md` foi reescrita de "obrigatório" para "opcional".

### 2.5 Por que `feriados` e `auditoria` continuam sem FK
Mesma razão da versão anterior do DER: `feriados` é só cache consultado pela
aplicação (sem relação transacional), e `auditoria` guarda `tabela` +
`registro_id` de forma genérica para poder auditar qualquer tabela nova sem
precisar de uma coluna de FK a cada entidade futura.

### 2.6 Cores do diagrama
Mantivemos o padrão de 3 cores de domínio (Cadastro/Movimentação/Segurança)
definido na primeira versão, e usamos cinza para `feriados` — a única tabela
sem nenhuma FK e sem papel transacional. `itens_kit` entrou no grupo
"Cadastro" (mesma cor de `ferramentas`), já que é uma extensão direta do
cadastro de ferramenta, não um evento.

---

## 3. Como usar os arquivos entregues

- **`der-visual-dbdiagram.png`** — imagem final, para os slides de apresentação e o README.
- **`der.dbml`** — cole em [dbdiagram.io](https://dbdiagram.io) → "Import
  DBML" para editar visualmente. Exporte de volta como `.dbml` para manter os
  dois em sincronia.

---

## 4. Pendências antes de marcar a issue como concluída

A issue exige revisão de outra pessoa da equipe antes de aprovar — isso
continua não sendo algo que se resolve escrevendo o diagrama. Checklist:

- [ ] Commitar `docs/der.png` e `docs/der.dbml` numa branch
      `feat/db-02-der-revisao-visita-tecnica`
- [ ] Abrir PR referenciando a issue #21
- [ ] Pedir review de 1 outro integrante (Henrique é o autor, não pode ser o
      próprio revisor)
- [ ] Marcar a issue como concluída só após aprovação do PR
- [ ] **Atenção:** a DB-03 (dicionário de dados) depende diretamente deste
      DER e também precisa da correção de `atividade_id` opcional — vale
      atualizar as duas juntas para não ficarem dessincronizadas de novo.
