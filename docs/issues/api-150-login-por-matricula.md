# API-XX — URGENTE: trocar login/cadastro de e-mail para matrícula (registro de execução)

Issue: [#150](https://github.com/joaoaugusto-dev/PI-2026.2/issues/150)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-03 (concluída) · Bloqueia: #149 (auto-cadastro)
Branch: `feat/api-149-auto-cadastro-aprovacao` (a #150 foi feita junto, para o #149 já nascer com matrícula)
Última atualização: 24/09/2026

## Objetivo

E-mail não existe no ambiente fabril. O login passa a ser **matrícula + senha**, sem e-mail em lugar nenhum do fluxo de auth.

## Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| Matrícula = **exatamente 4 dígitos numéricos**, de `0001` a `9999` (`^(?!0000)\d{4}$`) | Regra do time. Vale para `usuarios` e `colaboradores`, com `CHECK` no banco e Zod na API. |
| A matrícula vive **só em `colaboradores`**; `usuarios` aponta para o colaborador (`colaborador_id`, único, FK) | Uma pessoa, uma matrícula. Evita duas pessoas com a mesma matrícula e o auto-cadastro com matrícula alheia. |
| `usuarios` não tem mais `email` nem `nome` | O nome vem do colaborador. A view `vw_emprestimos_detalhe` foi recriada lendo o nome por lá (mesmas colunas de saída). |
| `colaboradores.matricula` passou de `VARCHAR(50)` para `VARCHAR(4)` | O tipo passa a dizer a regra. As duas views que leem a coluna foram recriadas. |
| Papel `almoxarife` renomeado para **`manutencao`** (e novo `admin`) | Quem disponibiliza as ferramentas é a manutenção, não o almoxarifado. |
| Colaborador desativado **perde o login** | Desligar a pessoa em um lugar só corta o acesso. O middleware revalida conta **e** colaborador a cada requisição. |
| Quiosque (`consulta`) entra **só com a matrícula**, sem senha e sem crachá | O crachá deixou de existir. Limite de **30 tentativas por minuto por IP**, porque a matrícula tem só 9.999 valores e não é secreta. |
| Migration renumerada para **`0004`** | A branch do API-09 já usa `0003_colaboradores_identificacao.sql`. |

## O que foi feito

### Banco
- [`0004_papel_admin_e_auto_cadastro.sql`](../../api/db/migrations/0004_papel_admin_e_auto_cadastro.sql): papel `admin`, rename do enum, conversão de bancos legados (`MAT001` vira `0003`, com +2 para liberar `0001` e `0002`; os dois usuários antigos viram colaboradores `0001`/`0002` do setor "Manutenção Geral"), `CHECK` da matrícula, `VARCHAR(4)`, `usuarios.colaborador_id`, remoção de `email` e `nome`, recriação das views. Aborta com mensagem clara se houver matrícula ou usuário que não dê para converter.
- [`seed.sql`](../../api/db/seed.sql): 22 colaboradores (`0001`/`0002` da manutenção + `0003` a `0022`), 2 contas (`0001` e `0002`, senha `123456`).
- [`testes-manuais.sql`](../../api/db/testes-manuais.sql) ajustado ao novo modelo.

### API
- [`validators/matricula.ts`](../../api/src/validators/matricula.ts): regra única, reaproveitada por login, quiosque e `colaboradorValidator`.
- `authValidator`, `authController` e `authService.login`: `matricula` no lugar de `email`; busca por `colaboradores.matricula`; JWT e `usuario` com `matricula`; mensagem "Matrícula ou senha inválidos".
- [`middlewares/auth.ts`](../../api/src/middlewares/auth.ts): para `manutencao`/`admin` lê nome e matrícula **do banco** (não do token) e exige conta e colaborador ativos. Assim, tokens emitidos antes da troca continuam devolvendo dados corretos. Tokens antigos com o papel `almoxarife` (renomeado) recebem `401 TOKEN_OUTDATED`, para o front deslogar em vez de ficar logado tomando 403. `express.d.ts` sem `email`.
- Quiosque: `identificador` exige 4 dígitos; [`middlewares/rateLimit.ts`](../../api/src/middlewares/rateLimit.ts) limita `/v1/consulta/sessao` (429 `TOO_MANY_REQUESTS`). Nova variável `TRUST_PROXY_HOPS` (0 sem proxy; **1 em produção** atrás de Nginx/Traefik, senão todos os clientes dividem o mesmo IP).
- Swagger do `/auth/login` e do `/consulta/sessao` atualizados.

## Testes (`npm test` no `/api`)

Resultado: **14 arquivos e 175 testes passando, nenhum pulado**. `tsc --noEmit` limpo.

| Arquivo | O que cobre |
|---|---|
| [`auth.test.ts`](../../api/src/tests/auth.test.ts) — `/auth/me` | token válido (nome e matrícula do banco, sem `email`); **token antigo** com e-mail e sem matrícula; token com o papel antigo `almoxarife` (`TOKEN_OUTDATED`); usuário desativado; sem token; header malformado; token inválido; token expirado |
| [`auth.test.ts`](../../api/src/tests/auth.test.ts) — login | sucesso (token, `usuario` e payload sem `email`); token do login aceito em `/auth/me`; senha errada; matrícula sem conta; colaborador inativo (`USER_INACTIVE`); matrícula com letras, 5 dígitos, 3 dígitos, `0000`, com espaços, vazia e numérica (400); envio de e-mail (400) |
| [`consultaSessao.test.ts`](../../api/src/tests/consultaSessao.test.ts) | quiosque abre sessão com matrícula ativa; 404 sem colaborador; 400 para os mesmos formatos inválidos |
| [`consultaSessaoRateLimit.test.ts`](../../api/src/tests/consultaSessaoRateLimit.test.ts) | 31ª tentativa em um minuto devolve 429 na rota real; limitador isolado devolve o envelope de erro |
| `atividade`, `categoria`, `setor`, `opcoes`, `authorize` | tokens de teste com `matricula: '0001'` no lugar de `email` |
| `ferramentaValidation.test.ts`, `errorHandler.test.ts` | matrículas de exemplo com 4 dígitos; mensagem nova de validação |

Observações sobre os testes:
- O teste de colaborador inativo cria um colaborador e uma conta próprios (`9101`) e os apaga no final. Alterar as linhas do seed derrubaria, em paralelo, os tokens de outros arquivos.
- Os testes dependem do seed (`db:migrate` + `db:seed`) no banco de teste.
- [`authRegistro.test.ts`](../../api/src/tests/authRegistro.test.ts) cobre o #149 já por matrícula (registro, erros 404/409/400, sem escalada de privilégio, login antes da aprovação, listagem e aprovação por admin). Cria seus próprios colaboradores e contas (`92xx`, nome `ZZTESTE_API149`) e apaga tudo no final.

## Verificação manual (API local, banco recriado)

`0001` + `123456` devolve 200 com token; senha errada devolve 401 "Matrícula ou senha inválidos"; `MAT001` devolve 400 no campo `matricula`; `/auth/me` devolve `{ id, nome, papel, matricula }`; rota protegida com o token devolve 200.

## Documentação atualizada

`dicionario-de-dados.md`, `der.dbml` (DER e o PNG exportado), `banco.md`, `decisoes-pendentes.md`, `arquitetura.md` (contrato de login, quiosque e contrato-alvo do registro), `processos.md`, `api/README.md`, `guia-testes-insomnia.md`, `teste-api-crud-ferramentas.md`, `dokploy.md` (login do seed e `TRUST_PROXY_HOPS`), `.env.example`, as duas coleções do Insomnia (login por matrícula), o exemplo de erro do `config/swagger.ts`, e [`mudancas-para-o-front.md`](../mudancas-para-o-front.md) para o João. Também corrigido o tempo do token de manutenção, que estava como 8 horas nos docs e é de 7 dias. "Crachá" foi trocado por "matrícula" nos docs. O `CLAUDE.md` não foi alterado por decisão do time (regras 5 e 8 ainda citam crachá).

## #149 (auto-cadastro) — feito junto, já por matrícula

- `POST /v1/auth/registro`: recebe `matricula` e `senha`; o nome vem do colaborador; a matrícula precisa ser de um colaborador ativo sem conta; cria a conta `manutencao` inativa. Erros `404 COLABORADOR_NOT_FOUND`, `409 MATRICULA_JA_CADASTRADA` (também em cadastros simultâneos, pelo índice único de `colaborador_id`), `400` e `429` (10 por minuto por IP). `papel`, `ativo` e `nome` no corpo são ignorados.
- `GET /v1/usuarios?ativo=false` e `PATCH /v1/usuarios/:id/ativar`: só `admin`; a listagem traz `nome` e `matricula` via `colaboradores`.

## Pendente

- **Front (fora desta execução):** o front "já trocado" não está em nenhuma branch/PR do GitHub (provavelmente só na máquina do João). Testei o login no navegador contra o back local com uma cópia temporária do `web/` com a troca mínima: **funciona** (200, sessão salva, Dashboard). Com o front atual (e-mail) dá 400. O que precisa mudar e os dois problemas encontrados (sessão antiga no `localStorage`, nome fixo no cabeçalho) estão na seção 7 de `mudancas-para-o-front.md`. O critério "front loga com sucesso" só fecha quando o João subir a troca; a `CadastroPage` e a tela de aprovação do admin também dependem do front.
- **Admin:** não existe rota para promover alguém a `admin` (é `UPDATE` no banco) e o seed não cria admin de teste.
- **PR #151 (API-09):** ainda usa matrícula livre; adaptar validador, testes e seed depois, e definir a ordem de merge (a `0003` do API-09 roda antes da `0004`).
- **Coluna `ferramentas.etiqueta_impressa_em`:** o dicionário diz que foi removida, mas ela existe e é usada. Contradição antiga, fora do escopo.
- **Migração de bancos com dados reais:** a `0004` só converte automaticamente o seed antigo; qualquer outro usuário ou matrícula fora do padrão aborta a migration e exige ajuste manual.
