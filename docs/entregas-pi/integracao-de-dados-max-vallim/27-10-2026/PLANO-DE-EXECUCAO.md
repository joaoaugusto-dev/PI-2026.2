# Entrega Prof. Max — Transformação, Validação e Qualidade dos Dados

> Guia de execução para o Claude Code. Leia inteiro antes de escrever código.
> Branch de trabalho: `feat/dados-validacao-qualidade` (criada a partir de `development`).
> Pasta da entrega: `docs/entregas-pi/integracao-de-dados-max-vallim/27-10-2026/`.

## Status (atualizado em 20/10/2026)

As etapas 0 a 8 foram executadas e **ainda não foram commitadas** (aguardam validação do Henrique).
Onde está cada coisa:

- Código: `api/src/services/dataCheckService.ts`, `api/scripts/data-check.ts`, migration `0014_auditoria_triggers.sql`,
  `api/src/services/auditoriaService.ts` + controller, rota e validator de `GET /v1/auditoria`, helpers
  `definirUsuarioAuditoria` e `queryComUsuario` em `api/src/config/database.ts`, mapeamento `23514` no `errorHandler`.
- Testes novos: `dataCheck`, `auditoria`, `auditoriaRoutes`, `feriadoFallback`; ampliados: `errorHandler`, `ferramentaCodigo`.
  Estabilização (#170): prefixos de teste que se sobrepunham renomeados, `testTimeout` de 20 s, comparações não determinísticas corrigidas.
- Documentação: `fluxo-integracao.md`, `regras-negocio.md`, `dicionario-de-dados.md`, `der.dbml`, `der-documentacao.md`, `api.md`, `processos.md`, `api/README.md`.
- Evidências: `evidencias/` (9 arquivos + CSV de exemplo + `scripts/gerar-evidencias.mts`); relatório: `ENTREGA.md` e
  `../entrega-max-20-10-2026.pdf` (gerado por `evidencias/scripts/gerar-pdf.py`).
- Pendências do time: prints do front em `evidencias/prints/`, regerar o PNG do DER a partir do `.dbml`, fechar as issues #65, #66, #67, #80 e #170 pelos PRs.

## 0. Enunciado oficial (não alterar)

Atividade do projeto de extensão — Prof. Max — **Transformação, Validação e Qualidade dos Dados**:

> Desenvolver processos de tratamento, validação e transformação das informações utilizadas na aplicação, garantindo consistência e confiabilidade dos dados. Apresentar evidências de validação dos dados, regras de negócio implementadas, tratamento de inconsistências e documentação do fluxo de integração entre as fontes de dados e a aplicação.

O que o professor vai procurar, em quatro eixos:

| Eixo | Pergunta que a entrega precisa responder |
|---|---|
| Tratamento/transformação | Como o dado bruto (CSV legado, BrasilAPI, formulário) vira dado limpo? |
| Validação + evidências | Como provamos que dado inválido é barrado? (prints, saídas de comando, testes) |
| Regras de negócio + inconsistências | Quais regras existem, onde vivem (banco/API) e como detectamos/tratamos dado incoerente? |
| Documentação do fluxo | Qual o caminho completo fonte → normalização → banco → API → tela? |

## 1. Regras de trabalho (obrigatórias)

1. **Não edite o `CLAUDE.md` da raiz nem o `CONTRIBUTING.md`.** Este arquivo é a única exceção criada para esta entrega.
2. Antes de decidir escopo/estrutura, releia `docs/orientacoes/Orientação PI 2026-2 -DESENVOLVIMENTO DE APLICAÇÃO WEB.pdf`. Se algo aqui conflitar com o PDF, o PDF vence — sinalize o conflito antes de prosseguir.
3. Releia a Seção 3 do `CLAUDE.md` raiz (regras de negócio inegociáveis) antes de tocar em código. Em especial: regra 1 (índice único parcial), regra 3 (avaria/perda abre ocorrência), regra 6 (responsável vem do JWT) e regra 8 (perfis).
4. **Um commit por etapa** (cada item numerado da Seção 4 é uma etapa). Conventional Commits em português, descrição **no imperativo e minúscula** (padrão do `CONTRIBUTING.md`), referenciando o ID da issue (`feat(data-06): adicionar ...`). **Nunca** mencione Claude/IA (autor, coautor, rodapé "Co-Authored-By" ou "Generated with") em commit, PR ou qualquer texto — regra do usuário, vale mesmo que o ambiente sugira o contrário.
5. **`git add` sempre por caminho exato.** Nunca `git add .`/`-A`/pasta inteira: há prints soltos não rastreados em `docs/prints/prints-dokyploy-servidor-caseiro/` que não devem entrar.
6. Respostas, comentários de código, mensagens de PR e documentação em **português do Brasil**.
7. Descrição de PR segue `.github/pull_request_template.md`. PR vai para `development` (a base de integração real do repositório; o `CONTRIBUTING.md` a chama de `develop`) e, quando concluir uma issue, a descrição inclui `Closes #<número>` (DoD item 6). Merge por Squash and Merge, com pelo menos 1 revisor da equipe.
8. Sem `console.log` esquecido em código de API. **Exceção:** scripts em `api/scripts/*` imprimem no terminal por natureza (seguem o padrão de `sincronizar-feriados.ts`).
9. Banco de testes = banco de dev. Testes devem criar dados com prefixo próprio (ex.: `ZZTESTE_DATA_`) e limpar no `afterAll`, como em `api/src/tests/ferramentaCodigo.test.ts`.
10. Após cada etapa de código rode `npm run typecheck` e `npm test` dentro de `api/`. Não marque etapa como pronta com teste vermelho — relate a saída real.
11. A branch `feat/dados-validacao-qualidade` não traz ID de issue no nome (o padrão é `<tipo>/<area>-<id>-<slug>`); como a entrega cobre várias issues (#65, #66, #67, #80, #170), mantenha o nome e liste todas no PR. Se o usuário preferir, renomeie com `git branch -m` antes do primeiro push.

## 2. Estado atual (verificado em 20/10/2026)

### Já existe — NÃO refazer, só referenciar/atualizar

- **Importação CSV (DATA-03):** `api/src/services/importacaoService.ts` (+ `validators/importacaoValidator.ts`, rota `POST /v1/importacoes/:recurso`, exportação em `exportacaoService.ts`). Fluxo: CSV → parse (`csv-parse`) → normalização → Zod por linha → deduplicação → carga transacional com SAVEPOINT por linha → relatório. `RelatorioImportacao` = `{ resumo{total_linhas,aceitas,rejeitadas,ignoradas}, aceitas[], rejeitadas[{linha,motivos[],dados}], ignoradas[], colunas_ignoradas[] }`. Teto `MAX_LINHAS_IMPORTACAO = 5000`. Testes: `importacaoFerramentas.test.ts`, `importacaoExportacaoCsv.test.ts`. Doc: `docs/backend/importacao.md`.
- **BrasilAPI de feriados:** `api/src/services/feriadoService.ts`, script `npm run db:feriados`, tabela `feriados`, fallback sáb/dom. Teste: `feriado.test.ts`.
- **Validators Zod** em `api/src/validators/*` (13 arquivos). JSON malformado → 400 `INVALID_JSON`.
- **Regras no banco** (`api/db/migrations/0001_init.sql`): `uq_emprestimo_aberto`, `uq_ferramenta_codigo_ativo`, triggers `fn_gera_codigo_identificacao`, `fn_valida_subgrupo`, `fn_valida_item_kit`, `fn_valida_retirada`, `fn_valida_kit_exclusividade`, sync de status e `fn_abre_ocorrencia`.
- **Tabela `auditoria`** (0001, linhas ~255-265): `id, tabela, operacao, registro_id, dados_anteriores jsonb, dados_novos jsonb, usuario_id, ip_origem, created_at`. Hoje só recebe INSERTs **manuais** de `authService.ts` (login/convite/senha) e `ferramentaService.ts` (operação `disponibilizar`).
- **Documentos:** `docs/regras-negocio.md` (378 linhas, 10 regras, última revisão 05/10), `docs/banco-de-dados/fluxo-integracao.md` (só descreve as **origens**), `dicionario-de-dados.md`, `der-documentacao.md`, `docs/backend/importacao.md`, `docs/backend/processos.md`.
- **Testes:** 38 arquivos em `api/src/tests/` (Vitest + Supertest).

### Falta — escopo desta entrega

| # | Item | Issue GitHub | Resp. original |
|---|---|---|---|
| 1 | Script `npm run data:check` | #66 (DATA-06) | Guilherme |
| 2 | Auditoria automática por triggers em jsonb | #65 (DATA-05) | Guilherme |
| 3 | Fluxo de integração completo, com diagrama | #67 (DATA-07) | Kauan |
| 4 | Revisão de `regras-negocio.md` | #80 (DATA-08) | Henrique |
| 5 | Evidências de validação (prints/saídas/tabela) | #80 (DATA-08) | Henrique |
| 6 | Documento final da entrega | — | Henrique |
| 7 | Correção do teste intermitente | #170 | — |

Os responsáveis originais são só histórico; aqui o Claude Code implementa tudo a pedido de Henrique. Ao concluir, **avise** quais issues podem ser fechadas — não feche issues sozinho.

## 3. Ordem de execução e dependências

```
Etapa 0  Preparar ambiente e baseline
Etapa 1  #170 corrigir teste intermitente      (limpa o terreno das evidências)
Etapa 2  #66  data:check                       (independe da auditoria; usa o banco como está)
Etapa 3  #65  auditoria por triggers           (migration 0014 + testes)
Etapa 4  #66  data:check ganha verificação da auditoria (depende de 2 e 3)
Etapa 5  #67  fluxo-integracao.md completo
Etapa 6  #80  revisar regras-negocio.md + dicionário de dados
Etapa 7       gerar evidências em 27-10-2026/evidencias/
Etapa 8       documento final 27-10-2026/ENTREGA.md
Etapa 9       conferência final + resumo para o usuário
```

---

## 4. Etapas detalhadas

### Etapa 0 — Baseline

1. `git branch --show-current` deve ser `feat/dados-validacao-qualidade`.
2. `cd api && npm run typecheck && npm test`. Guarde o resultado (nº de arquivos/testes, falhas). Se algum teste já falha antes de você mexer, registre qual — é o ponto de partida honesto.
3. Confirme que há `.env` em `api/` com acesso ao banco de dev (ver `api/src/config/env.ts`). Se o banco estiver inacessível, **pare e avise o usuário**; não invente saídas.
4. Rode `npm run db:migrate` para garantir que as migrations 0001-0013 estão aplicadas.

### Etapa 1 — #170: testes intermitentes em `uq_ferramenta_codigo_ativo`

**Problema:** `fn_gera_codigo_identificacao` escolhe o menor código livre; testes em arquivos diferentes rodam em paralelo (Vitest usa workers) e duas inserções simultâneas pegam o mesmo número → violação de `uq_ferramenta_codigo_ativo`. A migration `0005_corrige_concorrencia_codigo_identificacao.sql` já tratou parte disso — **leia-a e leia a issue (`gh issue view 170`) antes de agir**.

Passos:
1. Reproduza: `npx vitest run` 3x seguidas; veja se falha e em quais arquivos.
2. Diagnostique a causa raiz (trigger sem lock suficiente? teste com código fixo? `afterAll` que não limpa?). Não mascare com retry.
3. Correção preferida, em ordem: (a) corrigir a trigger/lock numa nova migration; (b) se a causa for específica dos testes, serializar só os arquivos afetados (`describe.sequential`/`poolOptions`), documentando o motivo.
4. Prova: 5 execuções consecutivas verdes.
5. Commit: `fix(api): corrigir ... (#170)` (descrição no imperativo).

Se o diagnóstico mostrar que isso é grande demais, **registre e siga** — não bloqueie as demais etapas; avise o usuário.

### Etapa 2 — #66: `npm run data:check`

**Objetivo:** comando que aponta inconsistência de dado antes de virar bug, com relatório legível no terminal e **código de saída útil** (0 = tudo certo, 1 = achou problema), para poder entrar em CI.

**Arquivos a criar/alterar:**
- `api/scripts/data-check.ts` — ponto de entrada (CLI), mesmo estilo de `sincronizar-feriados.ts` (importa `pool` de `../src/config/database.js`, `await pool.end()` no `finally`, `process.exit(code)`).
- `api/src/services/dataCheckService.ts` — as verificações em si, **separadas do CLI** para serem testáveis. Exporta `executarVerificacoes(): Promise<ResultadoVerificacao[]>`.
- `api/package.json` — script `"data:check": "tsx scripts/data-check.ts"`.
- `api/src/tests/dataCheck.test.ts` — testes.
- Documentar em `docs/backend/processos.md` (seção nova) e `api/README.md` (comando).

**Tipo de resultado:**
```ts
interface ResultadoVerificacao {
  id: string;            // ex.: 'EM_USO_SEM_EMPRESTIMO'
  titulo: string;        // legível em PT-BR
  gravidade: 'erro' | 'aviso';
  total: number;         // nº de registros problemáticos
  amostra: Record<string, unknown>[]; // até 10 linhas, para o relatório
  correcao: string;      // dica de como resolver
}
```

**Verificações obrigatórias** (cada uma = 1 SQL somente-leitura; nomes de coluna confirmados no DDL de `0001_init.sql`; confira se alguma migration posterior renomeou algo):

| id | Gravidade | O que detecta |
|---|---|---|
| `EM_USO_SEM_EMPRESTIMO` | erro | `ferramentas` com `status='em_uso'` e `ativo` sem nenhum `emprestimos` aberto (`data_devolucao IS NULL`) para ela. |
| `EMPRESTIMO_ABERTO_FERRAMENTA_NAO_EM_USO` | erro | Empréstimo aberto cuja ferramenta (não-kit) não está `em_uso`. |
| `INDISPONIVEL_SEM_MOTIVO` | erro | `status='indisponivel'` com `motivo_indisponivel IS NULL` (regra 3). |
| `MOTIVO_COM_STATUS_DIFERENTE` | aviso | `motivo_indisponivel` preenchido com status ≠ `indisponivel`. |
| `INDISPONIVEL_SEM_OCORRENCIA_ABERTA` | aviso | Ferramenta `indisponivel` por avaria/perda sem ocorrência com status `aberta/em_reparo/cobrada`. Descubra os valores reais dos enums (`motivo_indisponibilidade`, `status_ocorrencia`) no DDL antes de escrever o SQL. |
| `OCORRENCIA_ABERTA_FERRAMENTA_DISPONIVEL` | aviso | Ocorrência ainda aberta e ferramenta `disponivel`. |
| `COLABORADOR_MATRICULA_DUPLICADA` | erro | Matrículas iguais ignorando caixa/espaços (`lower(btrim(matricula))` agrupado com `count > 1`). A `UNIQUE` simples não pega `ABC` vs `abc `. |
| `FERRAMENTA_CODIGO_DUPLICADO` | erro | Dois ativos com o mesmo `codigo_identificacao` (não deve ocorrer — o índice impede; verificação defensiva). |
| `EMPRESTIMO_PREVISAO_ANTES_RETIRADA` | erro | `previsao_devolucao < data_retirada`. |
| `EMPRESTIMO_DEVOLUCAO_ANTES_RETIRADA` | erro | `data_devolucao < data_retirada`. |
| `EMPRESTIMO_DEVOLVIDO_SEM_CONDICAO` | aviso | `data_devolucao IS NOT NULL` e `condicao_devolucao IS NULL`. |
| `EMPRESTIMO_COLABORADOR_INATIVO_ABERTO` | aviso | Empréstimo aberto de colaborador `ativo=false`. |
| `FERRAMENTA_SUBGRUPO_FORA_DO_GRUPO` | erro | `subgrupo_id` cujo `grupo_id` do subgrupo ≠ `grupo_id` da ferramenta (a trigger previne; confere dado legado). |
| `FERRAMENTA_VALOR_NEGATIVO` | erro | `valor_aquisicao < 0`. |
| `FERRAMENTA_NOME_VAZIO` | erro | `btrim(nome) = ''`. |
| `OCORRENCIA_SEM_RESPONSAVEL_COM_EMPRESTIMO` | aviso | Ocorrência com `emprestimo_id` preenchido mas `colaborador_id` nulo (regra 3: herda o colaborador). |
| `FOTO_ARQUIVO_INEXISTENTE` | aviso | `foto_url` aponta para arquivo que não existe no disco (use `config/uploads.ts` para resolver o diretório). Pule esta checagem com mensagem clara se o diretório não estiver acessível. |

Se alguma coluna/valor de enum não existir como descrito, **adapte o SQL ao schema real** e registre a diferença no relatório final — não deixe a verificação quebrada.

**Formato do relatório no terminal** (padrão do projeto: emojis ✅/❌/⚠️ como nos outros scripts):
```
🔎 SOUFER Tools — verificação de consistência dos dados
Banco: soufer_dev @ localhost:5432   Data: 2026-10-20 14:03

✅ EM_USO_SEM_EMPRESTIMO ............ 0
❌ EMPRESTIMO_PREVISAO_ANTES_RETIRADA  2
     #41  ferramenta 7  retirada 2026-10-10 08:00  previsão 2026-10-09 17:00
     Como corrigir: ...
⚠️ EMPRESTIMO_DEVOLVIDO_SEM_CONDICAO .. 1

Resumo: 17 verificações · 15 ok · 1 erro · 1 aviso
Resultado: PROBLEMAS ENCONTRADOS   (saída 1)
```
Com tudo certo: `Resultado: tudo certo (saída 0)`. **Avisos não reprovam** (saída 0); só `erro` dá saída 1. Aceite as flags `--json` (imprime o array de resultados, sem emojis, para CI) e `--so-erros` (oculta verificações ok). Nunca imprimir senha/`senha_hash`/e-mail de usuário na amostra.

**Segurança:** só `SELECT`. Nada de `UPDATE/DELETE` no script — ele reporta, não corrige.

**Testes (`dataCheck.test.ts`):**
1. Com o banco "limpo" (somente dados de teste removidos), `executarVerificacoes()` não retorna `gravidade:'erro'` com `total>0` para as verificações que dependem de dados de teste. (Se o banco de dev já tiver sujeira real, o teste deve filtrar pelas linhas do prefixo `ZZTESTE_DATA_`, não depender do banco estar imaculado.)
2. **Para cada verificação possível de forçar**, crie a inconsistência dentro de uma transação, rode a verificação e confirme que ela aparece (`total >= 1` e a amostra contém o registro de teste). Algumas inconsistências são impedidas por constraint/trigger — para essas, **desabilite a trigger só dentro da transação** (`ALTER TABLE ... DISABLE TRIGGER`) ou use `SET session_replication_role = replica` e faça `ROLLBACK` no fim. Nada pode vazar para o banco.
3. Teste do CLI: execute `tsx scripts/data-check.ts --json` via `child_process`, valide JSON e código de saída.
4. Uma verificação com SQL inválido não derruba o script: capture erro por verificação, marque `gravidade:'erro'` com `titulo` "falha ao executar" e siga com as demais.

**Pronto quando (DoD DATA-06):** rodar no banco de dev retorna "tudo certo" (ou lista só problemas reais, que você reporta), e ao forçar manualmente uma inconsistência o script detecta e sai com 1.

Commit: `feat(data-06): adicionar comando data:check para detectar inconsistências (#66)`.

### Etapa 3 — #65: auditoria automática em jsonb

**Objetivo:** toda alteração em `ferramentas`, `emprestimos` e `ocorrencias` gera linha em `auditoria` com o antes/depois, sem depender de o código lembrar de gravar.

**Arquivo:** `api/db/migrations/0014_auditoria_triggers.sql` (confira o próximo número livre; `migrate.ts` aplica todos os `.sql` em ordem — **a migration precisa ser idempotente**: `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` antes de `CREATE TRIGGER`).

**Design:**
```sql
CREATE OR REPLACE FUNCTION fn_auditoria() RETURNS TRIGGER AS $$
DECLARE
  v_usuario INTEGER := NULLIF(current_setting('app.usuario_id', true), '')::INTEGER;
  v_ip      TEXT    := NULLIF(current_setting('app.ip_origem', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabela, operacao, registro_id, dados_novos, usuario_id, ip_origem)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, to_jsonb(NEW), v_usuario, v_ip);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- ignora UPDATE que só mexeu em updated_at
    IF (to_jsonb(NEW) - 'updated_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'updated_at') THEN
      RETURN NEW;
    END IF;
    INSERT INTO auditoria (...) VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, <só colunas que mudaram: OLD>, <NEW>, v_usuario, v_ip);
    RETURN NEW;
  ELSE -- DELETE
    INSERT INTO auditoria (...) VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, to_jsonb(OLD), NULL, v_usuario, v_ip);
    RETURN OLD;
  END IF;
END; $$ LANGUAGE plpgsql;
```
Detalhes que **precisam** ser tratados:
- **Diff enxuto no UPDATE:** gravar em `dados_anteriores`/`dados_novos` apenas as colunas que mudaram (calcule com `jsonb_each` comparando OLD×NEW; remova `updated_at`). Assim a linha de auditoria mostra "o diff certo" (critério do DoD) em vez de despejar a linha inteira.
- **`usuario_id`:** o banco não conhece o JWT. Use `set_config('app.usuario_id', '<id>', true)` (o `true` = local à transação) **dentro da transação** que faz a escrita. Crie um helper em `api/src/config/database.ts` (ex.: `definirUsuarioAuditoria(client, usuarioId, ip?)`) e chame-o nos services de escrita que já usam `getClient()` + `BEGIN` (`emprestimoService`, `ocorrenciaService`, `ferramentaService`, `importacaoService`). Regra 6 do projeto: o id vem **sempre do JWT** (`req.user`), nunca do corpo. Escritas feitas fora de transação (queries soltas com `query()`) devem ser migradas para transação curta **apenas se** forem das 3 tabelas; sem usuário, a linha entra com `usuario_id` nulo (aceitável, mas deve ser exceção — liste no relatório quais caminhos ficaram sem usuário).
- **Triggers `AFTER`** (não `BEFORE`), `FOR EACH ROW`, nas três tabelas e nos três eventos. Cuide da **ordem com as triggers existentes** (`trg_sync_status_ferramenta` altera `ferramentas` a partir de `emprestimos`; `trg_abre_ocorrencia` insere em `ocorrencias`): uma devolução com avaria deve gerar auditoria de `emprestimos` (UPDATE), `ferramentas` (UPDATE de status) e `ocorrencias` (INSERT). Teste isso explicitamente.
- **Convivência com os INSERTs manuais** de `ferramentaService` (`operacao='disponibilizar'`) e `authService`: mantenha-os (têm semântica de negócio). Se a mesma ação gerar também um `UPDATE` automático em `ferramentas`, tudo bem — duas linhas com `operacao` diferentes. Documente isso.
- **Campos sensíveis:** `usuarios` **não** entra na auditoria automática (tem `senha_hash`). Se por algum motivo expandir, remover `senha_hash` do jsonb.
- **`ocorrencias.foto_url` e `ferramentas.foto_url`** podem ir no diff (é só caminho).
- **Desempenho:** índices em `auditoria (tabela, registro_id, created_at DESC)` e `(created_at DESC)` (criar `IF NOT EXISTS`). Meça o impacto na importação de 5000 linhas; se a auditoria de INSERT em massa degradar muito, documente o número e decida (ex.: manter, pois é requisito de rastreabilidade).
- **`registro_id` é INTEGER:** todas as 3 tabelas têm `id SERIAL`, ok.

**Consulta (se sobrar tempo, #65):** endpoint somente `admin` `GET /v1/auditoria?tabela=&registro_id=&de=&ate=&page=&limit=` com envelope padrão (`data` + `meta`), validator Zod próprio (`auditoriaValidator.ts`, mesmo padrão do `kpiValidator.ts`), documentado no Swagger e em `docs/backend/api.md`. 403 para `manutencao`, e `consulta` sem acesso. Faça só depois de concluir tudo o que é obrigatório. Sem tela no front a menos que o usuário peça.

**Testes (`auditoria.test.ts`):** para cada tabela e cada operação:
1. INSERT gera exatamente 1 linha com `operacao='INSERT'`, `dados_novos` com os campos e `dados_anteriores` nulo.
2. UPDATE de um campo gera linha cujo diff contém **só** aquele campo (+ confirme que `updated_at` não aparece).
3. UPDATE sem mudança real (ou só `updated_at`) **não** gera linha.
4. DELETE (use `ferramentas`/`ocorrencias` de teste; `emprestimos` tem FKs `RESTRICT` — delete o que o próprio teste criou) gera linha com `dados_anteriores` preenchido.
5. Com `set_config('app.usuario_id', ...)` na transação, `usuario_id` fica preenchido; sem ele, nulo.
6. Fluxo integrado via API (Supertest): retirada → devolução com avaria produz as linhas esperadas nas três tabelas, e o `usuario_id` das linhas é o do JWT usado.
7. Rollback não deixa auditoria (a trigger participa da transação).

Limpe a `auditoria` criada pelos testes (`DELETE FROM auditoria WHERE tabela=... AND registro_id = ANY($1)`).

**Pronto quando (DoD DATA-05):** as três tabelas críticas geram registro de auditoria em toda alteração real, com diff correto.

Commit: `feat(data-05): adicionar auditoria automática em jsonb nas tabelas críticas (#65)`.

### Etapa 4 — `data:check` verifica a própria auditoria

Depende das etapas 2 e 3. Adicionar ao `dataCheckService`:
- `AUDITORIA_SEM_REGISTRO_RECENTE` (aviso): ferramenta/empréstimo/ocorrência cujo `updated_at` (ou `created_at`) é posterior à ativação da auditoria (data da migration 0014, ou a primeira linha de `auditoria` com `operacao='INSERT'`) e **sem nenhuma linha** em `auditoria` para aquele `registro_id` — indica escrita que burlou a trigger (`session_replication_role = replica`) ou trigger desabilitada.
- `AUDITORIA_TRIGGER_AUSENTE` (erro): consulta `pg_trigger` e confirma que existem as 9 triggers de auditoria (3 tabelas × INSERT/UPDATE/DELETE, ou 3 triggers multi-evento — conforme implementado na Etapa 3) e que `tgenabled <> 'D'`.
Testes correspondentes em `dataCheck.test.ts`. Commit: `feat(data-06): conferir a auditoria automática no data:check (#66)`.

### Etapa 5 — #67: fluxo de integração completo

Reescrever/estender `docs/banco-de-dados/fluxo-integracao.md` (manter as seções de origem que já existem; **não perder** o conteúdo atual — acrescentar).

Conteúdo obrigatório:
1. **Visão geral** com diagrama **Mermaid** (GitHub renderiza) cobrindo: `CSV legado / formulário web / BrasilAPI → normalização → validação Zod → regras no banco (constraints + triggers) → tabelas → auditoria → views → API /v1 → front (TanStack Query) → tela`. Inclua também o ramo de saída (exportação CSV) e o ramo de verificação (`data:check`).
2. **Texto de cada seta**, em prosa, no formato "De → Para: o que acontece, onde está no código (arquivo:função), o que acontece se falhar".
3. **Pipeline do CSV** passo a passo, lendo o código real de `importacaoService.ts`: encoding/BOM, delimitador, cabeçalho, `trim`, caixa do nome, conversão de data DD/MM/AAAA→ISO, vírgula→ponto em valor, colunas desconhecidas (`colunas_ignoradas`), limites (5000 linhas, tamanho do arquivo), deduplicação (no arquivo e no banco), SAVEPOINT por linha, o relatório. Documente **apenas o que o código realmente faz** — confira antes de escrever.
4. **Pipeline da BrasilAPI**: endpoint chamado, cache em `feriados`, quando atualiza, timeout, fallback sáb/dom, diferença entre "API fora" (fallback) e "banco fora" (erro, não mascarar — ver commit `49dae11`).
5. **Tabela de tratamento de inconsistências**: tipo de problema → onde é barrado → resposta ao usuário (código HTTP + `error.code`) → como é detectado a posteriori (`data:check`). Exemplos: ferramenta já emprestada (409 `FERRAMENTA_INDISPONIVEL`), CSV com linha inválida (relatório), campo obrigatório ausente (400), matrícula duplicada, JSON malformado (400 `INVALID_JSON`), BrasilAPI fora.
6. **Rastreabilidade**: como a auditoria (Etapa 3) e o `data:check` fecham o ciclo.
7. Referências cruzadas para `regras-negocio.md`, `dicionario-de-dados.md`, `importacao.md`.

Valide o Mermaid (sintaxe correta; sem caracteres especiais sem aspas). Se houver ferramenta para renderizar localmente, exporte também `docs/assets/fluxo-integracao.png`; senão deixe só o Mermaid. Commit: `docs(data-07): documentar o fluxo completo de integração de dados (#67)`.

### Etapa 6 — #80: revisar regras de negócio e dicionário

1. Releia `docs/regras-negocio.md` inteiro e confira **cada referência `arquivo:linha`** contra o código atual (as linhas mudaram!). Atualize.
2. Reflita mudanças recentes: foto da avaria na devolução (`0013`), KPIs (`kpiService`), validação de filtros (API-208), permissões `admin` ⊇ `manutenção` (regra 8), bloqueio de conta por tentativas (`0009`), convites (`0008`), view `vw_emprestimos_detalhe` (`0010`/`0013`), rate limit. Se uma regra do doc divergir do `CLAUDE.md` raiz, **não edite o `CLAUDE.md`** — sinalize a divergência ao usuário.
3. Acrescentar a seção **"Mapa regra → implementação → teste → verificação"**: tabela com colunas Regra | Camada (banco/API/front) | Onde | Teste que prova | Verificação `data:check`.
4. Acrescentar o **diagrama de estados da ferramenta** (Mermaid `stateDiagram-v2`): `disponivel → em_uso → disponivel | indisponivel → disponivel`, com os eventos (retirada, devolução ok, devolução com avaria/perda, reativação pelo admin) e o gatilho (trigger ou serviço).
5. Mencionar a auditoria automática e o `data:check` nas regras às quais se aplicam.
6. Atualizar `docs/banco-de-dados/dicionario-de-dados.md` e `der-documentacao.md` com: migrations 0008-0014, `auditoria` (colunas, índices, triggers), `foto_url` de ocorrências, `convites`, o que mais existir no schema real. Compare com o banco: `\d` via `psql` ou consultas em `information_schema` — o dicionário deve bater com a realidade, não com a memória.
7. **Não** altere `docs/banco-de-dados/der.dbml` nem o PNG a menos que o schema tenha mudado de fato; se mudou, atualize o `.dbml` e avise que o PNG precisa ser regerado manualmente.

Commit: `docs(data-08): revisar regras de negócio e dicionário de dados (#80)`.

### Etapa 7 — Evidências

Criar `docs/entregas-pi/integracao-de-dados-max-vallim/27-10-2026/evidencias/`. Tudo gerado **de execuções reais**, nunca escrito à mão. Cada arquivo começa com data/hora, comando executado, ambiente (banco dev) e commit (`git rev-parse --short HEAD`).

| Arquivo | Conteúdo | Como gerar |
|---|---|---|
| `01-testes-vitest.txt` | Saída completa de `npm test` | `npm test` e salvar (sem segredos) |
| `02-data-check-limpo.txt` | `data:check` no estado atual | `npm run data:check` |
| `03-data-check-inconsistencia.txt` | Mesmo comando após forçar inconsistências, **dentro de transação revertida** ou em registros marcados e removidos depois | script em `evidencias/scripts/forcar-inconsistencia.ts`; ao final, confirmar que o banco voltou ao estado anterior e salvar o `data:check` pós-limpeza |
| `04-importacao-csv-relatorio.json` | Resposta da API para um CSV com linhas boas e ruins (≥2 erradas, ≥1 duplicada, ≥1 data DD/MM/AAAA, ≥1 valor com vírgula) | arquivo `evidencias/importacao-exemplo.csv` + chamada real via Supertest/curl com token de teste |
| `05-importacao-antes-depois.md` | Linhas do CSV bruto × linhas gravadas no banco (mostra a transformação) | consulta SQL após a importação, depois limpar |
| `06-auditoria-exemplos.md` | 1 INSERT, 1 UPDATE (diff), 1 DELETE e o fluxo retirada→devolução com avaria, com o `jsonb` real | consultas à `auditoria` |
| `07-validacao-api-erros.md` | Para cada rota de escrita principal, uma requisição inválida e a resposta de erro (status, `error.code`, `details`) | Supertest/curl; cobrir ferramentas, colaboradores, empréstimo, devolução, ocorrência, KPIs com filtro inválido, JSON malformado |
| `08-feriados-brasilapi.md` | Registros em `feriados` vindos da BrasilAPI + demonstração do fallback | `npm run db:feriados` e consulta; o fallback pode ser demonstrado pelo teste existente |
| `09-matriz-regras-evidencias.md` | A tabela regra → teste → evidência apontando para os arquivos acima | montar a partir dos anteriores |

Regras das evidências:
- **Dados de teste removidos ao final** (banco volta ao estado anterior). Mostre a contagem antes/depois.
- **Sem segredos**: nada de tokens, senhas, hashes, `.env`, e-mails reais. Redija (`***`) o que for sensível.
- Se alguma evidência não puder ser gerada (banco indisponível, API externa fora), diga isso no arquivo e na resposta final — não simule.
- Prints de tela (front) não conseguem ser gerados por você: liste no `ENTREGA.md` quais prints o usuário deve tirar (tela de importação com relatório de rejeição; tela com mensagem de erro de validação) e onde salvá-los (`evidencias/prints/`).

Commit(s): `docs(data-08): adicionar evidências de validação e qualidade dos dados`. Faça `git add` somente dos arquivos de `27-10-2026/evidencias/` por caminho.

### Etapa 8 — Documento final `ENTREGA.md`

Arquivo: `docs/entregas-pi/integracao-de-dados-max-vallim/27-10-2026/ENTREGA.md` (o `CLAUDE.md` desta pasta é instrução de trabalho, não entregável). Escrito para o **Prof. Max** (tom técnico-acadêmico, direto, sem jargão interno do time). Estrutura:

1. Identificação (disciplina, data da atividade 20/10/2026, equipe e RAs conforme `docs/orientacoes/equipe.md`, projeto, beneficiado Soufer, ODS 9/12).
2. Resumo (≤10 linhas): o que foi construído para garantir qualidade dos dados.
3. **Tratamento e transformação** — com exemplo antes/depois do CSV.
4. **Validação** — camadas (front, Zod na API, constraints/triggers no banco) e por que em camadas.
5. **Regras de negócio implementadas** — resumo das 10 + link para `regras-negocio.md`, com o mapa regra→teste.
6. **Tratamento de inconsistências** — prevenção (barrar), detecção (`data:check`), rastreio (auditoria), correção (relatório de importação com CSV de erro).
7. **Fluxo de integração** — diagrama + link para `fluxo-integracao.md`.
8. **Evidências** — índice apontando cada arquivo de `evidencias/` com 1 linha explicando.
9. **Como reproduzir** — comandos exatos (`npm run db:migrate`, `npm test`, `npm run data:check`, importação).
10. **Limitações e próximos passos** — honesto (ex.: auditoria sem tela, verificações que dependem de disco).
11. **Pendências manuais do time** — prints, exportar para PDF.

O nome do arquivo/estilo deve seguir a entrega anterior (`entrega-max-05-09-2026.pdf`): se o usuário quiser PDF, ele converte do Markdown; **não** gere PDF a menos que peça.

Commit: `docs(data-08): adicionar documento final da entrega de qualidade de dados`.

### Etapa 9 — Conferência final

1. `cd api && npm run typecheck && npm test` (e `npm run build` se o projeto exigir). Cole o resultado real.
2. `npm run data:check` no banco de dev: relatar o resultado.
3. `git status` + `git log --oneline` da branch: conferir que não há arquivo solto indevido nem commit mencionando IA.
4. Conferir DoD padrão (Seção 6 do `CLAUDE.md` raiz): sem `console.log` fora de scripts, docs afetadas atualizadas, Swagger/`docs/backend/api.md` atualizados se criou endpoint.
5. **Não faça push nem abra PR** sem o usuário pedir. Quando pedir, use o template do repositório.
6. Resposta final ao usuário: o que foi feito por etapa, saídas reais (testes, data:check), o que **não** foi possível, divergências encontradas entre docs e código, quais issues podem ser fechadas (#65, #66, #67, #80, #170), prints que ele precisa tirar.

## 5. Armadilhas conhecidas

- `migrate.ts` registra cada arquivo aplicado em `schema_migrations` e roda só os pendentes. Rode `npm run db:migrate` antes dos testes: coluna nova sem migration aplicada derruba dezenas de testes de uma vez.
- `ferramentas.codigo_identificacao` é `SMALLINT` 1-9999, gerado por trigger e reaproveitado; testes que criam muitas ferramentas disputam números (causa do #170).
- `emprestimos` e `ocorrencias` têm FKs `RESTRICT`/`SET NULL`: apague na ordem inversa da criação nos testes.
- Triggers encadeadas (`sync_status`, `abre_ocorrencia`) disparam as de auditoria: não assuma que 1 ação = 1 linha de auditoria.
- O enum `papel_usuario` hoje tem `manutencao` e `admin` (o `almoxarife` do `0001` foi renomeado na `0004`); o DDL do `0001_init.sql` ainda mostra o valor antigo.
- Dados de teste: um `LIKE 'PREFIXO%'` apaga tudo que começa igual. Dois arquivos de teste com prefixos em que um é o começo do outro se apagam mutuamente (foi a causa de falhas intermitentes).
- O banco de dev pode ter tabelas de outras branches aplicadas (ex.: `kpi_snapshots_diarios`, da branch dos gráficos) que não existem nesta.
- Todos os campos de responsável (`usuario_retirada_id`, `registrada_por`...) vêm do JWT, nunca do body (regra 6) — vale também para o `app.usuario_id` da auditoria.
- Ambiente é Windows/PowerShell com Git Bash: scripts npm devem funcionar em ambos; use caminhos com `path`, não barras fixas.
- Não confie em número de linha citado neste arquivo; confirme no código.

## 6. Checklist final (marcar só com prova)

- [ ] Etapa 0 — baseline registrado
- [ ] Etapa 1 — #170 resolvido ou justificado
- [ ] Etapa 2 — `data:check` funcionando + testes
- [ ] Etapa 3 — auditoria por triggers + testes
- [ ] Etapa 4 — `data:check` confere auditoria
- [ ] Etapa 5 — fluxo de integração completo com diagrama
- [ ] Etapa 6 — regras de negócio e dicionário revisados
- [ ] Etapa 7 — evidências geradas (9 arquivos)
- [ ] Etapa 8 — `ENTREGA.md` pronto
- [ ] Etapa 9 — typecheck + testes verdes, resumo ao usuário
