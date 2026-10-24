# Matriz: regra de negócio → implementação → teste → evidência

Gerado em 20/10/2026, a partir do `01-testes-vitest.txt` (437 testes, todos passando) e dos demais arquivos desta pasta.
Cada nome de teste abaixo aparece, com ✓, no arquivo `01-testes-vitest.txt`.

| Regra (CLAUDE.md, Seção 3) | Onde está implementada | Teste que prova (arquivo › nome) | Evidência de execução |
|---|---|---|---|
| **1.** Um empréstimo aberto por ferramenta | Índice `uq_emprestimo_aberto`; trigger `fn_valida_retirada`; `emprestimoService` converte em 409 | `emprestimoRoutes.test.ts` › "recusa ferramenta já emprestada com 409 FERRAMENTA_INDISPONIVEL"; › "empresta uma peça avulsa e bloqueia repetir a peça e emprestar o kit inteiro (409)" | `07-validacao-api-erros.md`, caso 17 (segunda retirada → 409); `03-...` (`EM_USO_SEM_EMPRESTIMO`) |
| **2.** Três estados; indisponível separado de em uso | Enum `status_ferramenta`; páginas separadas no front | `emprestimoRoutes.test.ts` › "registra a retirada (201), coloca a ferramenta em uso…" | `03-data-check-inconsistencia-forcada.txt` (`INDISPONIVEL_SEM_MOTIVO`) |
| **3.** Avaria/perda abre ocorrência sozinha, herdando o colaborador | Triggers `fn_abre_ocorrencia` e `fn_sync_status_ferramenta` | `emprestimoRoutes.test.ts` › "devolução com avaria (200)…" e "devolução com perda (200)…"; `auditoria.test.ts` › "retirada e devolução com avaria geram linhas nas três tabelas…" | `06-auditoria-exemplos.md` (três trilhas encadeadas) |
| **4.** Atividade opcional na retirada | `atividadeId` opcional no Zod; coluna sem `NOT NULL` | `emprestimoRoutes.test.ts` › "aceita retirada sem atividade (Regra 4)" | — |
| **5.** Identificação por matrícula ou nome; cadastro rápido | `colaboradorService.identificar`, índice `idx_colaboradores_nome_trgm`, CHECK de 4 dígitos | `colaboradorRoutes.test.ts` › "retorna 404 quando não encontra nenhum colaborador para o termo" | `07-...`, caso 3 (matrícula inválida → 400) |
| **6.** Responsável sempre do JWT | Validators sem o campo; `req.usuario!.id`; `definirUsuarioAuditoria` | `emprestimoRoutes.test.ts` › "ignora usuarioRetiradaId…" e "ignora usuarioDevolucaoId…"; `ocorrenciaRoutes.test.ts` › "ignora resolvidaPor…"; `colaboradorRoutes.test.ts` › "ignora criado_por…"; `auditoria.test.ts` › "criar ferramenta, retirar e devolver com avaria deixa a trilha completa com o usuário do JWT" | `06-auditoria-exemplos.md`, seção "Prova da regra 6" |
| **7.** Código de identificação gerado pelo banco (em revisão) | `fn_gera_codigo_identificacao` + advisory lock; `uq_ferramenta_codigo_ativo`; CHECK 1 a 9999 | `ferramentaCodigo.test.ts` › "12 inserções em paralelo, cada uma na sua conexão…" e "300 ferramentas numa transação ganham códigos distintos" | `05-importacao-antes-depois.md` (código gerado pelo banco em cada linha importada) |
| **8.** Três perfis e permissões | `authorize()` em cada rota; token de consulta isolado | `permissoesCadastros.test.ts`, `ferramentaPermissoes.test.ts`, `authorize.test.ts`, `auditoriaRoutes.test.ts` › "exige token e perfil admin…" | `07-...`, casos 11 a 14 (401 e 403) |
| **9.** Feriados da BrasilAPI com cache e fallback | `feriadoService` | `feriado.test.ts` (cache e dias úteis); `feriadoFallback.test.ts` › "BrasilAPI fora do ar…", "…respondendo erro HTTP (503)…", "BrasilAPI no ar: grava no cache…", "falha de BANCO ao gravar não é mascarada…" | `08-feriados-brasilapi.md` |
| **10.** Entrega fora do prazo = nota zero | — (regra institucional do curso) | — | — |

## Validação e tratamento de inconsistências (além das 10 regras)

| Mecanismo | Teste que prova | Evidência de execução |
|---|---|---|
| Validação Zod nas rotas de escrita, envelope de erro | `ferramentaValidation.test.ts`, `errorHandler.test.ts` (inclui o novo mapeamento do CHECK, 400 `CHECK_VIOLATION`), `kpi.test.ts` | `07-validacao-api-erros.md` (19 casos reais) |
| Importação de CSV: normalização, validação por linha, deduplicação, relatório | `importacaoFerramentas.test.ts`, `importacaoExportacaoCsv.test.ts` | `04-importacao-csv-relatorio.json`, `05-importacao-antes-depois.md`, `importacao-exemplo.csv` |
| Auditoria automática em jsonb | `auditoria.test.ts` (INSERT, UPDATE só com o diff, UPDATE sem mudança, DELETE, usuário do `set_config`, rollback), `auditoriaRoutes.test.ts` | `06-auditoria-exemplos.md` |
| Detecção de dado incoerente (`npm run data:check`) | `dataCheck.test.ts` (cada uma das 19 verificações forçada numa transação revertida) | `02-data-check-estado-atual.txt`, `03-data-check-inconsistencia-forcada.txt` |

## Observações honestas

- As 19 verificações do `data:check` estão cobertas por teste; em duas delas (`FERRAMENTA_CODIGO_DUPLICADO` e `COLABORADOR_MATRICULA_DUPLICADA`) o banco já impede a inconsistência, então o teste prova que o banco **recusa** o caso (erro `23505`) e que a verificação roda limpa.
- O `data:check` do estado atual (`02-...`) não tem **erros**; os 2 avisos que aparecem são dados reais de teste do ambiente de desenvolvimento: 6 ferramentas `ZZINSOMNIA…` criadas pela coleção do Insomnia sem ocorrência aberta, e 4 ferramentas cuja foto apontava para um arquivo que não existe mais no disco.
- Os testes rodam contra o banco de desenvolvimento. A tabela `auditoria` guarda, por desenho, o rastro dos registros que os próprios testes criam e apagam, então ela cresce a cada execução da suíte (nesta sessão passou de 15 para mais de 17 mil linhas no ambiente de desenvolvimento). Em produção o crescimento vem só do uso real (cerca de uma linha por alteração), mas uma política de retenção da auditoria fica como próximo passo. Medimos o custo da trigger na importação de 1.000 ferramentas: cerca de 3,9 s com a auditoria ligada e 3,8 s com ela desligada, ou seja, diferença desprezível.
