# Arquitetura

## Visão geral

O sistema é organizado em três camadas principais:

```text
[Usuário]
    |
    v
[React / Front-end]
    |
    | HTTP / JSON
    v
[API Node.js]
    |
    v
[PostgreSQL]
```

Integrações externas:

```text
BrasilAPI ---> API ---> tabela feriados
Leitor Code128 ---> Front-end ---> API
AWS CloudWatch ---> monitoramento
```

## Princípios

- O front-end não acessa diretamente o banco.
- A API é responsável por autenticação, validação e regras de negócio.
- Segredos ficam em `.env`.
- Credenciais e connection strings de banco ficam somente no back-end.
- Autoria das operações críticas é obtida pelo JWT, e não pelo corpo da requisição.
- O prefixo atual da API é `/v1`.

## Perfis

### Manutenção

Acesso operacional completo: ferramentas, colaboradores, retiradas, devoluções, ocorrências, setores, categorias, atividades, importação, calendário e notificações.

**Login (issue API-150):** `POST /v1/auth/login` recebe `{ "matricula": "0001", "senha": "..." }` — não existe e-mail no ambiente fabril. A matrícula tem exatamente 4 dígitos numéricos (`0001` a `9999`) e vive só em `colaboradores` (regra imposta por `CHECK` no banco e por Zod na API); a conta de acesso (`usuarios`) aponta para o colaborador por `colaborador_id`, então uma pessoa tem uma matrícula só. O token JWT (validade de 7 dias) e o objeto `usuario` trazem `id`, `nome`, `matricula` e `papel`. Erros: `401 INVALID_CREDENTIALS` ("Matrícula ou senha inválidos"), `401 USER_INACTIVE` (conta ou colaborador desativado, no login ou no meio da sessão) e `400 VALIDATION_ERROR` (matrícula fora do padrão). O middleware `authenticate` lê nome e matrícula do banco a cada requisição. A matrícula não é secreta (só 9.999 valores possíveis), então `POST /v1/auth/login` tem limite de 10 tentativas por minuto por IP (429 `TOO_MANY_REQUESTS`) — o `loginLimiter` roda depois do `validate()` da rota, então só tentativas com matrícula bem formada (custo real de banco/bcrypt) contam contra o limite.

### Consulta

Modo quiosque sem senha (só matrícula, sem crachá). O operador informa apenas a matrícula (4 dígitos, sem senha). A API busca a matrícula em `colaboradores`, aceita só colaborador ativo e emite um token limitado por 15 minutos. O token permite somente consulta de ferramentas. Como não há senha, `POST /v1/consulta/sessao` tem limite de 30 tentativas por minuto por IP (429 `TOO_MANY_REQUESTS`).

### Admin

Papel adicional no enum `papel_usuario` (`admin`), separado de `manutencao`
(decisão do time em 22/09/2026, issue API-149 — substitui a alternativa
"qualquer manutenção ativo aprova outro" cogitada na issue original). Só um
`admin` pode aprovar um auto-cadastro pendente via
`PATCH /v1/usuarios/:id/ativar` ou listar os pendentes via
`GET /v1/usuarios?ativo=false`. Nesta primeira versão não existe rota para
promover um usuário a `admin` pela API — a promoção é feita direto no banco,
até o time decidir se cria um fluxo de gestão de admins (ver
`/docs/decisoes-pendentes.md`).

### Auto-cadastro de manutenção (fluxo)

1. `POST /v1/auth/registro` (público) recebe `matricula` (4 dígitos numéricos)
   e `senha`. O nome vem do cadastro do colaborador; `papel`, `ativo` e `nome`
   enviados no corpo são ignorados. A matrícula precisa existir em
   `colaboradores` (ativo) e ainda não ter conta de acesso. Cria a conta com
   `papel = 'manutencao'` e `ativo = false` e retorna 201 sem token — o usuário
   não pode logar ainda. Erros: 404 `COLABORADOR_NOT_FOUND` (matrícula sem
   colaborador ativo), 409 `MATRICULA_JA_CADASTRADA` (a matrícula já tem conta,
   inclusive em cadastros simultâneos, barrados pelo índice único de
   `usuarios.colaborador_id`), 400 (matrícula fora do padrão ou senha curta) e
   429 (mais de 10 tentativas por minuto por IP, porque as respostas 404/409
   revelam quais matrículas existem).
2. `POST /v1/auth/login` com esse usuário retorna 401 `USER_INACTIVE` até a
   aprovação.
3. Um `admin` autenticado lista os pendentes em
   `GET /v1/usuarios?ativo=false` (cada item traz `nome` e `matricula` do
   colaborador) e aprova com
   `PATCH /v1/usuarios/:id/ativar`, que exige papel `admin` (senão 403
   `ACCESS_DENIED`) e retorna 409 `USUARIO_JA_ATIVO` se o usuário já estiver
   ativo.
4. Depois da aprovação, o login volta a funcionar normalmente.

## Retirada de ferramenta (fluxo)

Issue API-11. O front identifica o colaborador (`GET /v1/colaboradores/identificar`), obtém uma data sugerida (`GET /v1/emprestimos/previsao-sugerida?dias=N`, onde N é o número de dias úteis que quem retira quer ficar com a ferramenta) e registra a retirada em `POST /v1/emprestimos`. Contrato completo em `docs/backend/api.md`.

Responsabilidades:

1. **API:** valida o corpo (Zod), garante que ferramenta, colaborador, setor, atividade e item de kit existem e estão ativos (404 específico por recurso) e grava `usuario_retirada_id` a partir do JWT (Regra 6; o campo no corpo é descartado). O INSERT roda numa transação que trava a linha da ferramenta (`SELECT ... FOR UPDATE`) e confere `status = 'disponivel'`: o trigger `fn_valida_retirada` pula a checagem de status para kits (a disponibilidade deles é peça a peça), então sem essa conferência um kit `indisponivel` (avaria ou perda) voltaria a sair e perderia o motivo (Regra 2).
2. **Banco:** decide se a ferramenta pode sair. `fn_valida_retirada` e `fn_valida_kit_exclusividade` (triggers) e o índice único parcial `uq_emprestimo_aberto` garantem a Regra 1. O índice cobre a mesma peça (ou a ferramenta simples) emprestada duas vezes; a exclusividade entre "kit inteiro" e "peça avulsa" depende só do `COUNT` do trigger, que sob `READ COMMITTED` não enxerga uma retirada ainda não confirmada, e por isso a API serializa as retiradas da mesma ferramenta com a trava acima. A API traduz esses erros para `409 FERRAMENTA_INDISPONIVEL` no envelope padrão.
3. **Banco:** `fn_sync_status_ferramenta` move a ferramenta para `em_uso` no mesmo INSERT (Regra 2).

A atividade é opcional (Regra 4). Data de devolução sem horário vale até 23:59:59 de Brasília, para o empréstimo não aparecer como atrasado antes do fim do dia na `vw_emprestimos_detalhe`; data e hora sem offset (como o `datetime-local` do navegador) também são lidas como Brasília, e não no fuso do servidor, que na AWS é UTC. A sugestão de previsão usa `adicionarDiasUteis` (feriados da BrasilAPI com cache em tabela e fallback de fim de semana, Regra 9).

## Devolução de ferramenta (fluxo)

Issue API-12. Fecha o empréstimo aberto pela retirada. Contrato completo em `docs/backend/api.md`.

Responsabilidades:

1. **API:** valida o corpo (Zod: `condicaoDevolucao` obrigatória, `observacaoDevolucao` opcional) e grava `usuario_devolucao_id` a partir do JWT (Regra 6; o campo no corpo é descartado). O `UPDATE` roda numa transação que trava a linha do empréstimo (`SELECT ... FOR UPDATE`) e confere `data_devolucao IS NULL` antes de gravar, para que duas devoluções simultâneas do mesmo empréstimo sejam serializadas: a segunda encontra a data já preenchida e recebe `409 EMPRESTIMO_JA_DEVOLVIDO`, em vez de as duas passarem e a trigger de ocorrência disparar duas vezes.
2. **Banco:** decide o resto. `fn_sync_status_ferramenta` muda o status da ferramenta (`disponivel` na condição `ok`; `indisponivel`, com o motivo gravado, em `avaria` ou `perda` — Regra 2 e Regra 3), e `fn_abre_ocorrencia` abre a ocorrência em `avaria` ou `perda`, herdando `colaborador_id` do empréstimo, não do usuário logado. A API não repete essa lógica, só traduz o erro de duplicidade.
3. **Peça avulsa de kit:** o status do kit só é sincronizado quando o registro é do kit inteiro (`item_kit_id IS NULL`); a devolução de uma peça avulsa não muda o status do container, porque o restante do kit continua disponível. A ocorrência é aberta normalmente para a peça (decisão registrada em `docs/decisoes-pendentes.md`, já que o schema atual não modela "peça indisponível" isoladamente).
4. **Extra:** a resposta inclui um campo `resumo` (ex.: "Chave de fenda foi para indisponível por avaria."), montado a partir da condição de devolução, para o front não repetir essa lógica na hora de confirmar a devolução para quem está usando o sistema.

## Ocorrências (fluxo)

Issue API-13. Acompanha e fecha as tratativas de avaria/perda abertas pela devolução (`fn_abre_ocorrencia`, ver [Devolução de ferramenta](#devolução-de-ferramenta-fluxo)). Contrato completo em `docs/backend/api.md`.

Responsabilidades:

1. **API:** `GET /v1/ocorrencias` filtra por `status`, `colaborador_id` e `tipo`, com paginação; `PATCH /v1/ocorrencias/:id` atualiza `status`, `custo_estimado` e `observacoes_resolucao`. Nenhuma das duas cria ocorrência — quem abre é o trigger da devolução.
2. **API:** a regra de "sem retrocesso" do status (`aberta < em_reparo < cobrada < resolvida < baixada`) é validada aqui, não no banco, comparando o rank do status atual com o de destino dentro de uma transação com `SELECT ... FOR UPDATE` na linha da ocorrência (mesmo padrão da devolução). `resolvida_por` e `data_resolucao` vêm do JWT (Regra 6) e só são gravados na transição de entrada para `resolvida` — reenviar o mesmo status não os sobrescreve.
3. **Nomes resolvidos:** desde a migration `0004_papel_admin_e_auto_cadastro.sql`, `usuarios` não guarda `nome`/`email` — a conta liga a um colaborador por `usuarios.colaborador_id`, e é de lá que vem o nome. `registrada_por_nome` e `resolvida_por_nome` seguem esse join (`usuarios → colaboradores`), o mesmo padrão já usado em `vw_emprestimos_detalhe` para `usuario_retirada_nome`/`usuario_devolucao_nome`.

## Banco

O banco de dados adotado é o **PostgreSQL** (hospedado na nuvem via AWS RDS ou em infraestrutura dedicada). Todas as tabelas, tipos ENUM, triggers, constraints, views e índices parciais são mantidos nativamente via scripts SQL/migrations.

As extensões `unaccent` e `pg_trgm` são usadas na identificação de colaborador
(`GET /v1/colaboradores/identificar`, API-09): matrícula exata primeiro e,
se não achar, nome tolerante a acento e erro de digitação via um índice GIN
(`gin_trgm_ops`) sobre uma função `IMMUTABLE` que encapsula `unaccent()`
(exigido pelo Postgres para indexar a expressão). Detalhes em
`docs/banco-de-dados/dicionario-de-dados.md`.

## Infraestrutura prevista

- API: AWS EC2 com Node 20, PM2 e Nginx.
- Front-end: AWS S3 + CloudFront.
- Monitoramento: CloudWatch.
- Banco: PostgreSQL (AWS RDS).

## CI/CD e revisão automatizada

O repositório usa a GitHub Action oficial `anthropics/claude-code-action` em dois
workflows (`.github/workflows/`):

- **`claude.yml`** — assistente sob demanda. Dispara quando alguém menciona
  `@claude` em um comentário de issue, comentário de review, review de PR ou no
  corpo/título de uma issue. Usa o token em `secrets.CLAUDE_CODE_OAUTH_TOKEN`.
- **`claude-code-review.yml`** — revisão automática. Dispara em todo PR aberto,
  atualizado ou reaberto e roda o plugin `code-review` do
  `claude-code-plugins`, postando comentários inline no PR.

Não substitui a aprovação humana exigida na Seção 5/6 do `CLAUDE.md`
(pelo menos um aprovador) — é uma checagem automática adicional antes da
revisão humana.
