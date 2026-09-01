# Regras do Projeto Integrador (PI)

Antes de criar, planejar ou implementar qualquer coisa neste repositório, consulte
o documento "Orientação PI 2026-2 -DESENVOLVIMENTO DE APLICAÇÃO WEB.pdf" (em
`/docs`). Ele contém as regras/orientações oficiais do PI e têm prioridade sobre
qualquer suposição própria sobre estrutura, tecnologias, entregáveis ou formato do
trabalho.

Sempre que uma decisão de escopo, estrutura ou entrega estiver em jogo, releia o
PDF em vez de assumir — em caso de conflito entre o que for pedido e o que o PDF
exige, sinalize o conflito antes de prosseguir.

# SOUFER Tools — Guia de Execução do Projeto


**Baseado no Plano de Projeto v3.** Alterações da v3 em relação à v2:
- **Arquitetura de banco em aberto:** Supabase é mais recurso do que o necessário
  para este sistema. A rota "certa" seria PostgreSQL próprio no servidor da Soufer,
  com auth própria — mas só é viável se o TI da Soufer liberar espaço. Perguntar
  isso na validação de requisitos (issue DB-01, Seção 8). Enquanto não houver
  resposta, seguir com Supabase (já modelado no DDL). DDL e endpoints valem para
  as duas rotas. Decisão final vai para ata.
- **Leitor de código de barras físico confirmado:** o campo de identificação
  (ferramenta e colaborador) opera por leitura via scanner físico, não digitação
  manual — foco automático + tratamento de Enter (issue FE-09, Seção 8). João leva
  um leitor de código de barras real no dia da apresentação para testar ao vivo com
  o Code128 impresso na etiqueta 50x25mm (issue DOC-08, Seção 8).

Nota: a numeração de issues do PDF v3 (M0–M14, #01–#84) é anterior ao
replanejamento em sprints — o cronograma da Seção 8 deste arquivo é a fonte de
verdade atual para issues, responsáveis e datas.

---

## 0. Como usar este arquivo

Este é o guia permanente do projeto. Toda sessão de trabalho — sua ou do Claude
Code — deve:

1. **Ler a Seção 3 (regras de negócio) antes de tocar em qualquer código.** Essas
   regras não são negociáveis e várias delas já causaram retrabalho em versões
   anteriores do plano.
2. **Verificar a Seção 8 (cronograma) para saber em que sprint estamos** e pegar só
   as issues daquele sprint (ou anteriores, se ficaram pendentes).
3. **Respeitar o campo "Depende de" de cada issue.** Se a dependência não está
   marcada como concluída, a issue não deve ser iniciada — construir uma tela em
   cima de uma API que ainda não existe gera retrabalho.
4. **Marcar o status ao trabalhar:** `[ ]` pendente, `[~]` em andamento, `[x]`
   concluído. Edite este arquivo diretamente ao mudar o status de uma issue.
5. **Usar o campo "Se sobrar tempo"** como válvula de escape: se surgir uma ideia
   nova no meio da tarefa, ela entra ali como nota, não interrompe o trabalho
   principal nem estoura o prazo da issue.

Este arquivo cobre **processo e sequenciamento**. O contrato técnico completo (DDL
SQL, lista de endpoints, páginas do front) já foi definido antes e deve ser
versionado como `/docs/arquitetura.md` no repositório — este guia referencia esse
documento em vez de repetir o SQL inteiro.

---

## 1. Visão geral

**Produto:** SOUFER Tools — controle web de retirada e devolução de ferramentas do
almoxarifado da Soufer.
**Título institucional (PI 2026.2):** Desenvolvimento de Soluções Web Inteligentes
e Integradas.
**Beneficiado:** Soufer (CNPJ ativo).
**ODS:** 9 (Indústria, Inovação e Infraestrutura), com 12 (Consumo e Produção
Responsáveis) como secundário.
**Apresentações:** 23 a 27 de novembro de 2026.

---

## 2. Equipe

| Pessoa | RA | Papel | Foco principal |
|---|---|---|---|
| Guilherme Portilho da Rosa Santi | 25000151 | Back-end + Infra | Infraestrutura AWS, custos, monitoramento, feriados/importação/auditoria/consistência de dados, rate limit, consulta pública, hardening e testes |
| Henrique de Oliveira Molinari | 25001176 | Back-end | Modelagem SQL, API Node.js completa, triggers, segurança, dados |
| João Augusto de Freitas | 25000019 | Front (líder/facilitador) | Figma, dashboard, ferramentas, retirada, devolução, calendário |
| Kauan Leander Leandrini | 25000795 | Front básico + Apresentação | Cadastros auxiliares, componentes isolados, documentação, vídeo, slides |

Reunião fixa: quarta-feira, 30 min, ata em `/docs/atas/AAAA-MM-DD.md`. Board: GitHub
Projects, uma issue por card, coluna por status.

---

## 3. Regras de negócio inegociáveis

Estas regras já foram decididas e testadas contra o que o almoxarifado da Soufer
precisa. Não redesenhar no meio do desenvolvimento sem atualizar este arquivo:

1. **Um empréstimo aberto por ferramenta.** Garantido por índice único parcial no
   banco (`emprestimos.ferramenta_id` onde `data_devolucao is null`), não por
   validação só na API.
2. **Status da ferramenta tem três estados:** `disponivel`, `em_uso`,
   `indisponivel`. Indisponível é seção separada de "em uso" — nunca aparecem
   juntas nas telas.
3. **Avaria ou perda na devolução abre uma ocorrência automaticamente**, herdando
   o colaborador responsável, e move a ferramenta para `indisponivel` com o
   motivo gravado.
4. **Atividade é campo obrigatório** na retirada — para que a ferramenta vai ser
   usada.
5. **Identificação do colaborador** aceita matrícula, código de crachá ou nome. Se
   não encontrar, abre cadastro rápido no meio do fluxo, sem perder o que já foi
   preenchido.
6. **Responsável pelo registro vem sempre do usuário logado (JWT)** —
   `usuario_retirada_id`, `usuario_devolucao_id`, `registrada_por` e `criado_por`
   nunca são aceitos vindos do corpo da requisição.
7. **Código de patrimônio é gerado a partir do ID** (`SF` + 6 dígitos) e é o
   mesmo valor codificado no código de barras (Code128).
8. **Apenas dois perfis:** `almoxarife` (acesso completo, login normal) e
   `consulta` (sessão de 15 minutos por matrícula/crachá, só leitura de
   disponibilidade, sem senha).
9. **Feriados vêm da BrasilAPI**, com cache em tabela própria e fallback de
   sábado/domingo se a API estiver fora.
10. **Entrega fora do prazo ou impressa = nota zero.** Sem exceção institucional.

---

## 4. Arquitetura e stack

- **Monorepo:** `soufer-tools/` com `/api` e `/web`.
- **Banco:** Supabase (PostgreSQL), projetos `soufer-dev` e `soufer-prod`.
- **API:** Node 20 + Express 5 + `@supabase/supabase-js` + Zod + JWT + Helmet +
  `express-rate-limit` + Pino + Swagger. Testes com Vitest + Supertest.
- **Front:** Vite + React 19 + React Router 7 + TanStack Query + Axios + React
  Hook Form + Zod + Tailwind + shadcn/ui + `recharts` + `react-barcode`.
- **Infra:** AWS EC2 (API, via PM2 + Nginx) + S3/CloudFront (front) + CloudWatch.
  Plano B: Render ou Railway.

Referência completa do schema (DDL, triggers, views), lista de endpoints e mapa de
páginas: `/docs/arquitetura.md` (versionar a partir do plano já fechado com a
equipe).

---

## 5. Convenções

- **Branch:** `main` protegida ← `develop` ← `feat/<area>-<id>-slug`, por exemplo
  `feat/api-07-crud-ferramentas`.
- **Commit:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
  Cada commit referencia o ID da issue quando fizer sentido.
- **PR:** exige pelo menos um aprovador. Ninguém sobe direto na `main`.
- **Envelope de resposta da API:**
  `{ "data": ..., "meta": { "page": 1, "limit": 20, "total": 128 } }`
- **Envelope de erro:**
  `{ "error": { "code": "FERRAMENTA_INDISPONIVEL", "message": "...", "details": [] } }`
- **Versionamento de rota:** prefixo `/v1`; qualquer quebra de contrato vai para
  `/v2`, nunca edita `/v1` de forma incompatível.
- **Responsividade obrigatória:** testar em 360px, 768px e 1280px antes de marcar
  qualquer tela como concluída.

---

## 6. Definition of Done padrão (aplica-se a toda issue, além do DoD específico)

- [ ] Código revisado por pelo menos uma outra pessoa (PR aprovado)
- [ ] Sem `console.log`/dado sensível esquecido no código
- [ ] Tela nova testada em 360px, 768px e 1280px (quando for front)
- [ ] Rota nova testada no Insomnia/Swagger com caso de sucesso e caso de erro
      (quando for back)
- [ ] Documentação afetada atualizada (`/docs/arquitetura.md`, README ou
      dicionário de dados)
- [ ] Commit e PR referenciam o ID da issue

---

## 7. Calendário institucional (fixo, não muda)

| Data | Professor | Entrega oficial no Dia Maker |
|---|---|---|
| 18/08 | Max | Modelo de dados + dicionário de dados — **já venceu, tratar como prioridade máxima do Sprint 0** |
| 25/08 | Marudi | Classificação IaaS/PaaS/SaaS + custos comparados AWS/Azure/GCP |
| 01/09 | Max | Banco criado, tabelas, integração inicial com fonte externa |
| 08/09 | Marcelo | Protótipo navegável no Figma |
| 15/09 | Nivaldo | CRUD de pelo menos uma entidade testado |
| 22/09 | Marcelo | Estruturação inicial do front-end |
| 29/09 | Nivaldo | Validações e tratamento de erros |
| 06/10 | Marudi | Serviços básicos na nuvem com evidências |
| 13/10 | — | Recesso |
| 20/10 | Max | Tratamento, validação e transformação de dados |
| 27/10 | Marcelo | Integração front-API com dados reais |
| 03/11 | Marudi | Relatório de otimização e monitoramento |
| 10/11 | Max + Nivaldo | Camada final de dados + autenticação/segurança |
| 23 a 27/11 | Todos | Apresentações |

---

## 8. Cronograma interno de execução

A ordem real de construção **não é igual** à ordem das entregas oficiais acima —
o banco e a API precisam existir antes do front consumir dados de verdade. Cada
sprint concentra o trabalho pesado até quinta-feira, deixando sexta e o fim de
semana como folga: tempo para polir o que foi feito, testar de novo, ou seguir uma
ideia nova que surgiu durante a semana sem atrasar a entrega seguinte.

Legenda de status: `[ ]` pendente · `[~]` em andamento · `[x]` concluído.

---

### Sprint 0 — Emergencial (sáb 22/08 a ter 25/08)

**Foco:** recuperar a entrega de 18/08 (já vencida) e fechar a de 25/08 no prazo.
**Buffer:** nenhum — sprint de recuperação, sem folga.

#### `[ ]` DB-01 — Levantamento de requisitos com o almoxarifado (João)
- **Depende de:** nada, pode começar agora.
- **Objetivo:** entender o fluxo real de retirada e devolução hoje na Soufer,
  mesmo que informal, para validar os campos do banco antes de programar.
- **Passo a passo:**
  1. Marcar uma conversa curta com o responsável do almoxarifado.
  2. Perguntar: que dados aparecem numa retirada hoje, que atividades existem no
     dia a dia, como um funcionário novo é identificado, se já existe algum
     código de patrimônio nas ferramentas.
  3. Validar com ele a lista de 10 atividades pré-definidas do sistema, ajustando
     o que não bater com a realidade.
  4. Escrever as respostas em `/docs/requisitos.md`.
- **Pronto quando:** `/docs/requisitos.md` commitado e a lista de atividades
  confirmada ou corrigida.
- **Se sobrar tempo:** já tirar fotos de ferramentas reais para usar como exemplo
  visual no Figma mais adiante.

#### `[ ]` DB-02 — Modelo conceitual e lógico (DER) (Henrique)
- **Depende de:** rascunho pode começar em paralelo com DB-01, ajustar depois.
- **Objetivo:** diagrama entidade-relacionamento com as 11 tabelas do sistema
  (setores, categorias, atividades, usuarios, colaboradores, ferramentas,
  emprestimos, ocorrencias, notificacoes, feriados, auditoria).
- **Passo a passo:**
  1. Desenhar o DER em dbdiagram.io ou draw.io com todas as tabelas.
  2. Marcar chaves primárias, estrangeiras e os três enums de status
     (`status_ferramenta`, `condicao_devolucao`, `status_ocorrencia`).
  3. Anotar no próprio diagrama o índice único parcial do empréstimo aberto —
     é fácil esquecer isso na hora de escrever o SQL depois.
  4. Exportar PNG e o arquivo fonte para `/docs/der.png` e `/docs/der.dbml`.
  5. Pedir revisão de outra pessoa da equipe antes de aprovar.
- **Pronto quando:** `/docs/der.png` versionado e revisado por mais um integrante.
- **Se sobrar tempo:** colorir por domínio (cadastro, movimentação, segurança)
  para facilitar a leitura na apresentação final.

#### `[ ]` DB-03 — Dicionário de dados (Henrique)
- **Depende de:** DB-02.
- **Objetivo:** documento campo a campo de cada tabela — tipo, obrigatoriedade,
  domínio de valores, origem do dado.
- **Passo a passo:**
  1. Listar as 11 tabelas do DER.
  2. Para cada campo: tipo, obrigatório (sim/não), valores possíveis quando for
     enum, origem (digitado, calculado, importado, API externa).
  3. Marcar explicitamente `codigo_patrimonio` como campo calculado (gerado do
     `id`, nunca digitado).
  4. Marcar `usuario_retirada_id`/`usuario_devolucao_id`/`registrada_por` como
     "vem do token, nunca do formulário" — reforça a regra 6 da Seção 3.
- **Pronto quando:** `/docs/dicionario-de-dados.md` com as 11 tabelas completas.
- **Se sobrar tempo:** acrescentar uma coluna de "índice/constraint relevante" —
  ajuda bastante na hora de escrever o DDL no Sprint 1.

#### `[ ]` DATA-01 — Documentar as fontes externas (Henrique)
- **Depende de:** nada.
- **Objetivo:** registrar de onde vêm os dados que não são digitados na hora: o
  inventário legado da Soufer e a API de feriados.
- **Passo a passo:**
  1. Pedir ao almoxarifado a planilha ou lista atual de ferramentas, mesmo que
     informal.
  2. Testar manualmente `https://brasilapi.com.br/api/feriados/v1/2026` no
     navegador ou Insomnia e salvar um exemplo de retorno.
  3. Escrever em `/docs/fluxo-integracao.md` as duas fontes, o formato de cada
     uma e o uso previsto (importação de inventário; cálculo de dias úteis).
- **Pronto quando:** documento com as duas fontes descritas e um exemplo real de
  retorno da BrasilAPI salvo.
- **Se sobrar tempo:** se a planilha da Soufer já existir, copiar 5 linhas
  (anonimizadas se precisar) para reaproveitar no seed do Sprint 1.

#### `[ ]` INFRA-01 — Classificação IaaS/PaaS/SaaS com justificativa (Guilherme)
- **Depende de:** nada.
- **Objetivo:** tabela pedida pelo Marudi — para cada peça da solução (banco,
  API, front, monitoramento), o modelo de serviço de nuvem e por quê.
- **Passo a passo:**
  1. Confirmar a classificação: Supabase = PaaS/DBaaS; EC2 = IaaS;
     S3 + CloudFront = PaaS/estático; CloudWatch = SaaS.
  2. Escrever 2 a 3 linhas de justificativa para cada escolha.
  3. Salvar em `/docs/infra-plano.md`.
- **Pronto quando:** documento pronto para apresentar no Dia Maker de 25/08.
- **Se sobrar tempo:** desenhar um diagrama simples da arquitetura (front → API →
  banco) para reaproveitar na apresentação final de novembro.

#### `[ ]` INFRA-02 — Custos nas calculadoras AWS, Azure e GCP (Guilherme)
- **Depende de:** INFRA-01.
- **Objetivo:** planilha comparando o custo mensal estimado do mesmo desenho nos
  três provedores.
- **Passo a passo:**
  1. Simular na calculadora da AWS: EC2 t3.micro + S3 + CloudFront (o banco fica
     de fora por já estar no Supabase, mas simular o equivalente RDS também, para
     efeito de comparação pedida pelo documento).
  2. Repetir a simulação equivalente no Azure.
  3. Repetir no Google Cloud.
  4. Montar `/docs/custos-nuvem.xlsx` com os três valores e prints de cada
     simulação.
- **Pronto quando:** planilha com os três provedores e prints anexados.
- **Se sobrar tempo:** simular também o custo de uma segunda instância em
  standby, para o Plano B de disponibilidade contínua.

#### `[ ]` INFRA-03 — Tabela de equivalência de nomenclatura (Kauan)
- **Depende de:** nada, pode rodar em paralelo com INFRA-01/02.
- **Objetivo:** tabela comparando os nomes que cada provedor dá para o mesmo tipo
  de serviço.
- **Passo a passo:**
  1. Pesquisar o nome equivalente de: máquina virtual, banco relacional
     gerenciado, armazenamento de objetos, CDN, função serverless, monitoramento.
  2. Montar a tabela dentro de `/docs/infra-plano.md`.
  3. Revisar com o Guilherme antes de fechar.
- **Pronto quando:** tabela de 6 linhas x 3 provedores revisada.
- **Se sobrar tempo:** incluir o nome do serviço de fila/mensageria de cada
  provedor — pode ser útil se o sistema de notificações crescer.

#### `[ ]` INFRA-04 — Acesso ao AWS Academy (Guilherme)
- **Depende de:** nada.
- **Objetivo:** garantir que a conta de laboratório está ativa antes de precisar
  fazer o deploy de verdade.
- **Passo a passo:**
  1. Acessar o AWS Academy pelo Classroom/portal da disciplina.
  2. Iniciar o laboratório e confirmar que o console AWS abre.
  3. Anotar o tempo de créditos/horas disponíveis.
  4. Tirar print do console.
- **Pronto quando:** print salvo em `/docs/evidencias-nuvem/` com data e créditos
  anotados.
- **Se sobrar tempo:** já gerar o par de chaves SSH que vai ser usado no deploy
  da EC2 no Sprint 6, para não perder tempo depois.

#### `[ ]` DOC-01 — Setup do repositório (Guilherme)
- **Depende de:** nada.
- **Objetivo:** repositório pronto para todo mundo commitar desde já.
- **Passo a passo:**
  1. Criar o monorepo `soufer-tools` com `/api` e `/web` vazios (cada um com um
     `.gitkeep` ou setup mínimo).
  2. Proteger a branch `main` (exigir PR e aprovação).
  3. Criar `develop` a partir da `main`.
  4. Adicionar template de PR (`.github/pull_request_template.md`) com checklist
     do DoD padrão da Seção 6.
- **Pronto quando:** `main` protegida e template de PR ativo.
- **Se sobrar tempo:** configurar labels no GitHub (`front`, `back`, `infra`,
  `dados`, `docs`) para facilitar o board.

#### `[ ]` DOC-02 — GitHub Project e board (João)
- **Depende de:** DOC-01.
- **Objetivo:** board publicado com todas as issues deste guia importadas.
- **Passo a passo:**
  1. Criar o GitHub Project com colunas Backlog → Sprint atual → Em andamento →
     Review → Concluído.
  2. Criar um milestone por sprint (Sprint 0 a Sprint 11 + Apresentações).
  3. Importar as issues deste arquivo, uma por card, com o ID no título.
- **Pronto quando:** board publicado e compartilhado com a equipe.
- **Se sobrar tempo:** nada aqui — é infraestrutura de processo, seguir para a
  próxima issue.

#### `[ ]` DOC-03 — README inicial (Kauan)
- **Depende de:** DOC-01.
- **Objetivo:** README com o mínimo que qualquer pessoa de fora precisa entender
  do projeto.
- **Passo a passo:**
  1. Descrição curta do projeto e do ODS trabalhado.
  2. Lista da equipe com RA e papel (copiar da Seção 2 deste guia).
  3. Stack usada (copiar da Seção 4).
  4. Seção "Como rodar localmente" com um placeholder, a ser completado quando a
     API e o front tiverem setup (Sprint 1 e 4).
- **Pronto quando:** README na `main`.
- **Se sobrar tempo:** adicionar um badge de build ou de licença, só estética.

#### `[ ]` DOC-04 — Carta de anuência da Soufer (João)
- **Depende de:** nada, mas é urgente — sem isso o PI pode ser invalidado.
- **Objetivo:** documento formal de ciência e concordância da Soufer com o
  projeto, exigido pelo caráter extensionista do PI.
- **Passo a passo:**
  1. Redigir um texto curto explicando o projeto e pedindo a assinatura de um
     responsável da Soufer.
  2. Coletar a assinatura (física ou digital).
  3. Digitalizar e salvar em `/docs/anuencia.pdf`.
- **Pronto quando:** PDF assinado versionado no repositório.
- **Se sobrar tempo:** aproveitar a mesma visita para validar as atividades da
  issue DB-01, se ainda não tiver sido feito.

---

### Sprint 1 (qua 26/08 a ter 01/09) — Entrega oficial 01/09 (Max): banco criado

**Foco:** banco de dados completo no Supabase; setup inicial da API; início do
design system do front (não depende do back, corre em paralelo).
**Buffer:** trabalho pesado até quinta 27/08; sexta 28/08 e o fim de semana ficam
livres para revisar o schema com calma antes da entrega de terça.

#### `[ ]` DB-04 — Criar projetos Supabase dev e prod (Henrique)
- **Depende de:** nada.
- **Objetivo:** dois ambientes isolados, um para testar sem medo e outro que vai
  virar produção.
- **Passo a passo:**
  1. Criar o projeto `soufer-dev` no Supabase.
  2. Criar o projeto `soufer-prod` no Supabase.
  3. Guardar as chaves (`anon` e `service_role`) de cada um.
  4. Criar `/api/.env.example` com as variáveis de ambiente esperadas (sem
     valores reais).
- **Pronto quando:** os dois projetos existem e as chaves estão documentadas (não
  commitadas em texto puro, só em `.env.example` com placeholders).
- **Se sobrar tempo:** já ativar o `pg_cron` e as extensões `unaccent` e
  `pg_trgm` nos dois projetos, que vão ser usadas mais adiante.

#### `[ ]` DB-05 — Executar o DDL completo (Henrique)
- **Depende de:** DB-02, DB-03, DB-04.
- **Objetivo:** todas as 11 tabelas, os 7 enums e os índices criados no
  `soufer-dev`, batendo com o dicionário de dados.
- **Passo a passo:**
  1. Copiar o SQL definido em `/docs/arquitetura.md` (setores, categorias,
     atividades, usuarios, colaboradores, ferramentas, emprestimos, ocorrencias,
     notificacoes, feriados, auditoria).
  2. Rodar como uma migration versionada em `/api/db/migrations/0001_init.sql`
     (não rodar direto no editor do Supabase sem salvar o arquivo).
  3. Conferir que `codigo_patrimonio` é gerado corretamente (`SF000001` ao
     inserir a primeira ferramenta de teste).
  4. Conferir que o índice único parcial do empréstimo aberto existe
     (`uq_emprestimo_aberto`).
- **Pronto quando:** todas as tabelas existem no `soufer-dev` e a migration está
  versionada no repositório.
- **Se sobrar tempo:** rodar o mesmo script no `soufer-prod` desde já, mesmo sem
  dado nenhum — evita divergência entre os dois ambientes lá na frente.

#### `[ ]` DB-06 — Triggers de negócio (Henrique)
- **Depende de:** DB-05.
- **Objetivo:** as três regras automáticas do banco funcionando:
  validação de retirada, sincronização de status, abertura de ocorrência.
- **Passo a passo:**
  1. Criar `fn_valida_retirada` + trigger — impede inserir empréstimo se a
     ferramenta não estiver `disponivel`.
  2. Criar `fn_sync_status_ferramenta` + trigger — muda o status para `em_uso`
     na retirada e para `disponivel`/`indisponivel` na devolução, conforme a
     condição informada.
  3. Criar `fn_abre_ocorrencia` + trigger — ao devolver com avaria ou perda,
     insere automaticamente em `ocorrencias`.
  4. Testar manualmente cada trigger com um `insert`/`update` de exemplo direto
     no SQL Editor do Supabase, conferindo o resultado esperado.
- **Pronto quando:** os três cenários de teste manual (retirada normal, retirada
  de ferramenta já emprestada, devolução com avaria) se comportam como esperado.
- **Se sobrar tempo:** escrever esses três testes manuais como um arquivo
  `/api/db/testes-manuais.sql` para reaproveitar depois nos testes automatizados
  do Sprint 10.

#### `[ ]` DB-07 — Views de leitura (Henrique)
- **Depende de:** DB-06.
- **Objetivo:** `vw_emprestimos_detalhe`, `vw_dashboard_kpis` e
  `vw_ocorrencias_por_colaborador` prontas para a API consultar.
- **Passo a passo:**
  1. Criar `vw_emprestimos_detalhe` (junta empréstimo, ferramenta, colaborador,
     setor, atividade e situação calculada).
  2. Criar `vw_dashboard_kpis` (os 6 números: cadastradas, disponíveis, em uso,
     indisponíveis, atrasadas, ocorrências abertas).
  3. Criar `vw_ocorrencias_por_colaborador` (ranking de avarias/perdas por
     pessoa).
  4. Rodar um `select *` de cada view para conferir que os números batem com os
     dados de teste inseridos na issue DB-06.
- **Pronto quando:** as três views retornam dado coerente.
- **Se sobrar tempo:** nada — deixar para o Sprint 9 quando for otimizar índices,
  não vale a pena otimizar performance agora sem dado de verdade.

#### `[ ]` DB-08 — Seed de dados de teste (Henrique)
- **Depende de:** DB-07.
- **Objetivo:** banco populado com dado suficiente para o front trabalhar sem
  precisar cadastrar tudo na mão.
- **Passo a passo:**
  1. Criar `/api/db/seed.sql` com pelo menos: 4 setores, 5 categorias, as 10
     atividades (já ajustadas na DB-01), 2 usuários `almoxarife` de teste, 20
     colaboradores e 50 ferramentas variadas.
  2. Incluir alguns empréstimos já abertos e alguns já devolvidos (com e sem
     ocorrência), para o dashboard não nascer vazio.
  3. Rodar o seed no `soufer-dev`.
- **Pronto quando:** o `soufer-dev` tem dado realista o bastante para popular
  todas as telas futuras.
- **Se sobrar tempo:** gerar os dados com nomes e situações plausíveis (não
  "Ferramenta 1", "Ferramenta 2") — ajuda a pegar problema de layout com nome
  longo antes da hora.

#### `[ ]` DATA-02 — Sincronizar feriados da BrasilAPI (Guilherme)
- **Depende de:** DB-05.
- **Objetivo:** tabela `feriados` populada e uma função de cálculo de dias
  úteis pronta para ser usada pela API.
- **Passo a passo:**
  1. Escrever um script (`/api/scripts/sincronizar-feriados.js`) que busca
     `https://brasilapi.com.br/api/feriados/v1/{ano}` e insere na tabela
     `feriados`.
  2. Rodar para 2026 e 2027 (o projeto pode atravessar o ano).
  3. Escrever a função `diasUteis(dataInicio, quantidadeDias)` que soma dias
     úteis pulando sábados, domingos e os feriados da tabela.
  4. Escrever um teste simples (pode ser manual por enquanto) comparando o
     resultado com um calendário real.
- **Pronto quando:** a tabela `feriados` tem os dois anos e `diasUteis()`
  calcula certo em pelo menos 3 casos manuais.
- **Se sobrar tempo:** adicionar o fallback documentado na regra 9 — se a
  BrasilAPI cair, considerar só sábado/domingo e logar um aviso.

#### `[ ]` API-01 — Setup do projeto Express (Henrique)
- **Depende de:** DOC-01.
- **Objetivo:** esqueleto da API rodando localmente.
- **Passo a passo:**
  1. Iniciar o projeto Node 20 em `/api` com Express 5.
  2. Configurar ESLint, Prettier e Pino (logs estruturados).
  3. Criar a estrutura de pastas: `config`, `routes`, `controllers`, `services`,
     `repositories`, `middlewares`, `validators`, `utils`.
  4. Conectar ao `soufer-dev` usando `@supabase/supabase-js` e a
     `service_role key` guardada em `.env`.
- **Pronto quando:** `npm run dev` sobe a API sem erro.
- **Se sobrar tempo:** configurar hot-reload com `nodemon` se ainda não estiver.

#### `[ ]` API-02 — Healthcheck e conexão com o banco (Henrique)
- **Depende de:** API-01, DB-05.
- **Objetivo:** rota `/v1/health` respondendo e confirmando que a API conversa
  com o Supabase.
- **Passo a passo:**
  1. Criar `GET /v1/health` retornando `{ status: "ok", db: "ok" }` após fazer
     uma consulta simples no banco (ex.: contar setores).
  2. Testar no Insomnia/Postman.
  3. Salvar a coleção inicial em `/api/docs/insomnia-collection.json`.
- **Pronto quando:** a rota responde 200 com o banco conectado.
- **Se sobrar tempo:** já deixar esse endpoint pronto para o CloudWatch usar
  como alarme lá no Sprint 9 (nada a fazer agora, só anotar no
  `/docs/infra-plano.md`).

#### `[ ]` FE-01 — Design system (João)
- **Depende de:** DB-01 (para as fotos/contexto real, não bloqueante).
- **Objetivo:** paleta, tipografia, espaçamento e os 4 estados de status
  (disponível/em uso/indisponível + atraso) definidos antes de desenhar
  qualquer tela.
- **Passo a passo:**
  1. Definir a paleta: cor primária industrial + verde (disponível), azul (em
     uso), vermelho (indisponível), âmbar (atraso/vence hoje).
  2. Definir a tipografia e a escala de espaçamento (múltiplos de 4px).
  3. Criar uma página de estilos no Figma com esses tokens.
- **Pronto quando:** página de estilos publicada no Figma.
- **Se sobrar tempo:** já criar o componente de badge de status em alta
  fidelidade, vai ser reaproveitado em quase toda tela.

#### `[ ]` FE-02 — Wireframes das telas núcleo (João)
- **Depende de:** FE-01.
- **Objetivo:** wireframes de baixa fidelidade das 9 telas principais, antes de
  partir para o protótipo navegável.
- **Passo a passo:**
  1. Desenhar: Login, Consulta (quiosque), Dashboard, Lista de ferramentas,
     Cadastro de ferramenta com etiqueta, Retirada, Devolução, Indisponíveis,
     Calendário.
  2. Não se preocupar com cor ainda, só com layout e hierarquia de informação.
- **Pronto quando:** os 9 frames existem no Figma.
- **Se sobrar tempo:** esboçar também a tela de Colaboradores e a de
  Notificações, mesmo que elas fiquem para o protótipo de fidelidade média
  depois.

---

### Sprint 2 (qua 02/09 a ter 08/09) — Entrega oficial 08/09 (Marcelo): protótipo Figma

**Foco:** API de leitura completa; protótipo navegável finalizado.
**Buffer:** trabalho pesado até quinta 03/09; sexta 04/09 e fim de semana livres
para ensaiar a navegação do protótipo com calma antes de mostrar pro Marcelo.

#### `[ ]` API-03 — Middleware de autenticação (Henrique)
- **Depende de:** API-02.
- **Objetivo:** todo endpoint protegido consegue saber quem está logado, sem
  depender do que o front manda no corpo da requisição.
- **Passo a passo:**
  1. Criar o middleware `auth` que valida o JWT emitido pelo Supabase Auth e
     injeta `req.usuario` (id, nome, papel).
  2. Criar o middleware `autorizar(...papeis)` que bloqueia com 403 se o papel
     do usuário não estiver na lista permitida.
  3. Aplicar em uma rota de teste (`GET /v1/auth/me`) que devolve os dados do
     usuário logado.
- **Pronto quando:** `GET /v1/auth/me` funciona com token válido e retorna 401
  sem token.
- **Se sobrar tempo:** já escrever o rascunho do middleware de token de
  `consulta` (vai ser usado só no Sprint 6, mas a estrutura pode ser deixada
  pronta agora).

#### `[ ]` API-04 — Middleware de erro e envelope padrão (Henrique)
- **Depende de:** API-01.
- **Objetivo:** toda resposta de erro sai no mesmo formato, definido na Seção 5.
- **Passo a passo:**
  1. Criar o `errorHandler` central do Express.
  2. Mapear erros conhecidos (validação Zod → 400, erro de negócio do trigger →
     409, não encontrado → 404) para o envelope de erro padrão.
  3. Criar um helper `paginar(query)` para não repetir lógica de `page`/`limit`
     em cada rota.
- **Pronto quando:** um erro de validação forçado retorna o envelope certo.
- **Se sobrar tempo:** adicionar um `requestId` no log do Pino, ajuda a rastrear
  problema em produção mais pra frente.

#### `[ ]` API-05 — Rotas de leitura de ferramentas (Henrique)
- **Depende de:** API-03, API-04, DB-08.
- **Objetivo:** o front já consegue listar e detalhar ferramentas reais no
  próximo sprint.
- **Passo a passo:**
  1. `GET /v1/ferramentas` com filtros `q`, `status`, `categoria_id` e
     paginação.
  2. `GET /v1/ferramentas/:id` com detalhe.
  3. `GET /v1/ferramentas/por-codigo/:codigo` (vai ser usado pela leitura de
     código de barras mais adiante).
  4. `GET /v1/ferramentas/:id/historico` juntando empréstimos e ocorrências
     daquela ferramenta.
- **Pronto quando:** as 4 rotas testadas no Insomnia contra o dado do seed.
- **Se sobrar tempo:** adicionar ordenação (`?sort=nome` ou `?sort=status`) —
  pequeno, mas evita um retrabalho de "esqueci de ordenar" depois.

#### `[ ]` API-06 — Documentação Swagger (Henrique)
- **Depende de:** API-05.
- **Objetivo:** documentação viva da API, exigida como evidência técnica.
- **Passo a passo:**
  1. Configurar `swagger-ui-express` servindo em `/docs`.
  2. Documentar as rotas já existentes (health, auth/me, ferramentas).
  3. Atualizar a coleção Insomnia com as mesmas rotas.
- **Pronto quando:** `/docs` abre no navegador com as rotas documentadas.
- **Se sobrar tempo:** nada — manter esse hábito de documentar toda rota nova
  é mais importante do que enriquecer a documentação de agora.

#### `[ ]` FE-03 — Protótipo navegável (João)
- **Depende de:** FE-02.
- **Objetivo:** protótipo clicável no Figma cobrindo o fluxo completo de
  retirada (com o cadastro rápido de colaborador) e devolução com avaria — é
  isso que o Marcelo vai avaliar no dia 08/09.
- **Passo a passo:**
  1. Aplicar os estilos da FE-01 nos wireframes da FE-02.
  2. Ligar os frames em fluxo navegável: login → dashboard → lista de
     ferramentas → retirada → (simular colaborador não encontrado) → cadastro
     rápido → volta pra retirada → confirma.
  3. Fazer o mesmo para devolução com avaria → mostrar a ferramenta indo para
     "indisponíveis".
  4. Gerar o link compartilhável.
- **Pronto quando:** link de apresentação funcionando, sem frame solto.
- **Se sobrar tempo:** adicionar microinterações simples (hover, transição
  entre telas) — só se o resto já estiver garantido.

#### `[ ]` FE-04 — Validar protótipo com o almoxarife (Kauan)
- **Depende de:** FE-03.
- **Objetivo:** feedback de quem vai usar de verdade, antes de qualquer linha de
  código de tela.
- **Passo a passo:**
  1. Mostrar o protótipo (compartilhar tela ou o link) para o responsável do
     almoxarifado da Soufer.
  2. Anotar o que ele achou confuso ou fora da realidade do trabalho dele.
  3. Registrar tudo em ata (`/docs/atas/`).
- **Pronto quando:** ata com o feedback registrada.
- **Se sobrar tempo:** já ajustar no próprio Figma os pontos mais simples de
  corrigir, antes de virar código.

---

### Sprint 3 (qua 09/09 a ter 15/09) — Entrega oficial 15/09 (Nivaldo): CRUD

**Foco:** API de escrita completa — é o maior gargalo do projeto, tudo que o
front precisa fazer depois depende disso.
**Buffer:** trabalho pesado até sexta 11/09; sábado a segunda livres para o
Henrique revisar os casos de erro com calma antes da entrega de terça.

#### `[ ]` API-07 — CRUD completo de Ferramentas (Henrique)
- **Depende de:** API-05.
- **Objetivo:** cadastrar, editar, mudar status e baixar uma ferramenta pela
  API.
- **Passo a passo:**
  1. `POST /v1/ferramentas` — cria e retorna o `codigo_patrimonio` já gerado
     pelo banco.
  2. `PUT /v1/ferramentas/:id` — atualiza os campos editáveis.
  3. `PATCH /v1/ferramentas/:id/etiqueta-impressa` — marca a data de impressão
     da etiqueta.
  4. `PATCH /v1/ferramentas/:id/disponibilizar` — tira a ferramenta de
     `indisponivel` depois do reparo (ação explícita, vira registro de
     auditoria).
  5. `DELETE /v1/ferramentas/:id` — baixa lógica (`ativo = false`), nunca apaga
     de verdade.
- **Pronto quando:** as 5 rotas testadas no Insomnia, incluindo o caso de erro
  (ex.: tentar disponibilizar uma ferramenta que já está disponível).
- **Se sobrar tempo:** nada — esse é o núcleo do sistema, se sobrar tempo aqui
  é melhor adiantar a API-09 (colaboradores) do que enfeitar esta.

#### `[ ]` API-08 — Validação Zod dos formulários de ferramenta (Henrique)
- **Depende de:** API-07.
- **Objetivo:** a API nunca aceita dado incoerente (preço negativo, nome vazio,
  categoria inexistente).
- **Passo a passo:**
  1. Criar o schema Zod de criação e o de edição de ferramenta.
  2. Aplicar o middleware `validate(schema)` nas rotas de escrita.
  3. Testar mandando dado errado de propósito e conferir o envelope de erro.
- **Pronto quando:** três casos de erro testados (campo obrigatório faltando,
  tipo errado, valor fora do domínio).
- **Se sobrar tempo:** reaproveitar o mesmo padrão de schema para deixar pronto
  o de colaborador (issue seguinte).

#### `[ ]` API-09 — CRUD de Colaboradores + identificação (Henrique)
- **Depende de:** API-07 (reaproveita o padrão de validação).
- **Objetivo:** o endpoint mais importante do fluxo de retirada — resolver
  quem é o colaborador por matrícula, crachá ou nome, e cadastrar rápido se não
  achar.
- **Passo a passo:**
  1. `GET /v1/colaboradores/identificar?termo=` — busca por matrícula exata,
     por `codigo_cracha` exato, e por nome com `unaccent`/`pg_trgm` (tolerante a
     acento e erro de digitação). Retorna 404 se não achar nada.
  2. `POST /v1/colaboradores` — cadastro rápido (matrícula, nome, crachá,
     setor, cargo). Grava `criado_por` a partir do JWT.
  3. `PUT /v1/colaboradores/:id` e `DELETE /v1/colaboradores/:id` (inativação).
  4. `GET /v1/colaboradores` com busca e paginação, para a tela de CRUD.
- **Pronto quando:** buscar "joao augusto" acha "João Augusto" mesmo sem
  acento, e o cadastro rápido funciona de ponta a ponta no Insomnia.
- **Se sobrar tempo:** medir o tempo de resposta da busca por nome com os 50
  registros do seed — se estiver lento, é sinal de rever o índice `gin_trgm`.

#### `[ ]` API-10 — CRUD de Setores, Categorias e Atividades (Henrique)
- **Depende de:** API-08.
- **Objetivo:** os três cadastros auxiliares mais simples do sistema, usados em
  vários lugares (retirada, ferramentas, colaboradores).
- **Passo a passo:**
  1. Replicar o mesmo padrão de CRUD (GET lista, GET detalhe, POST, PUT,
     DELETE lógico) para as três entidades.
  2. Como são tabelas pequenas e parecidas, pode ser um único arquivo de rotas
     genérico parametrizado, se preferir — desde que os três fiquem testados
     individualmente.
- **Pronto quando:** as três entidades têm CRUD funcionando no Insomnia.
- **Se sobrar tempo:** adicionar um `GET` combinado (`/v1/opcoes`) que devolve
  setores + categorias + atividades numa chamada só — útil para popular os
  `select` do formulário de retirada sem 3 requisições.

#### `[ ]` API-11 — Registrar retirada (Henrique)
- **Depende de:** API-07, API-09, API-10, DB-06.
- **Objetivo:** o endpoint central do sistema.
- **Passo a passo:**
  1. `POST /v1/emprestimos` recebendo `ferramenta_id`, `colaborador_id`,
     `setor_destino_id`, `atividade_id`, `detalhe_atividade` (opcional),
     `ordem_servico` (opcional) e `previsao_devolucao`.
  2. Calcular `usuario_retirada_id` a partir do `req.usuario` — **nunca** aceitar
     esse campo vindo do corpo, mesmo que o front mande.
  3. Deixar o trigger `fn_valida_retirada` fazer o trabalho de bloquear
     ferramenta indisponível — a API só precisa tratar o erro 409 que vem do
     banco e devolver no envelope padrão.
  4. Testar: retirada normal (201), retirada de ferramenta já emprestada (409),
     retirada sem atividade (400).
- **Pronto quando:** os três casos de teste passam.
- **Se sobrar tempo:** adicionar um cálculo automático de `previsao_devolucao`
  sugerida (hoje + N dias úteis, usando `diasUteis()` da DATA-02), que o front
  pode usar como valor inicial editável.

#### `[ ]` API-12 — Registrar devolução (Henrique)
- **Depende de:** API-11.
- **Objetivo:** fechar o ciclo do empréstimo e, quando for o caso, abrir a
  ocorrência.
- **Passo a passo:**
  1. `PATCH /v1/emprestimos/:id/devolucao` recebendo `condicao_devolucao` (`ok`,
     `avaria`, `perda`) e `observacao_devolucao`.
  2. Calcular `usuario_devolucao_id` a partir do `req.usuario`.
  3. Deixar os triggers `fn_sync_status_ferramenta` e `fn_abre_ocorrencia`
     cuidarem da mudança de status e da criação da ocorrência.
  4. Testar os três casos: devolução OK (ferramenta volta a `disponivel`),
     devolução com avaria (ferramenta vai a `indisponivel` e uma ocorrência
     aparece em `GET /v1/ocorrencias`), tentativa de devolver duas vezes o
     mesmo empréstimo (deve falhar).
- **Pronto quando:** os três casos passam e a ocorrência criada tem o
  colaborador certo.
- **Se sobrar tempo:** incluir na resposta da devolução um resumo já pronto
  ("ferramenta X foi para indisponível por avaria") — economiza lógica no
  front na hora de mostrar a confirmação.

#### `[ ]` API-13 — Endpoints de ocorrências (Henrique)
- **Depende de:** API-12.
- **Objetivo:** o almoxarife consegue acompanhar e fechar as tratativas de
  avaria/perda.
- **Passo a passo:**
  1. `GET /v1/ocorrencias` com filtros `status`, `colaborador_id`, `tipo`.
  2. `PATCH /v1/ocorrencias/:id` para atualizar `status`, `custo_estimado` e
     `observacao_tratativa`.
- **Pronto quando:** o ciclo aberta → em_reparo → resolvida é possível de fazer
  só com essas duas rotas.
- **Se sobrar tempo:** ao marcar uma ocorrência como `resolvida`, sugerir (não
  forçar) chamar automaticamente a `PATCH /disponibilizar` da ferramenta.

---

### Sprint 4 (qua 16/09 a ter 22/09) — Entrega oficial 22/09 (Marcelo): estruturação do front

**Foco:** agora que a API de leitura e escrita existe, o front pode sair do
Figma e virar código de verdade.
**Buffer:** trabalho pesado até quinta 17/09; sexta e fim de semana livres para
ajustar responsividade com calma.

#### `[ ]` FE-05 — Setup do projeto React (João)
- **Depende de:** DOC-01.
- **Objetivo:** esqueleto do front rodando localmente, já com as bibliotecas
  definidas na Seção 4.
- **Passo a passo:**
  1. Criar o projeto com Vite + React 19 em `/web`.
  2. Instalar e configurar Tailwind + shadcn/ui + React Router + TanStack
     Query + Axios.
  3. Aplicar os tokens de cor e tipografia definidos na FE-01.
  4. Criar `/web/.env.example` com a URL da API.
- **Pronto quando:** `npm run dev` abre uma tela em branco já estilizada com os
  tokens do design system.
- **Se sobrar tempo:** configurar o Storybook, se o time achar que vale a pena
  documentar componente por componente (opcional, não é exigido pelo PI).

#### `[ ]` FE-06 — AppLayout e responsividade (João)
- **Depende de:** FE-05.
- **Objetivo:** o esqueleto visual que toda página vai usar: sidebar, header e
  comportamento mobile.
- **Passo a passo:**
  1. Criar o `AppLayout` com sidebar de navegação e header.
  2. Fazer a sidebar virar menu colapsável em telas menores que 768px.
  3. Reservar um espaço no header para o sino de notificações (vai ser
     implementado de verdade só no Sprint 6, pode ficar como ícone estático por
     enquanto).
  4. Testar em 360px, 768px e 1280px.
- **Pronto quando:** o layout não quebra em nenhuma das três larguras.
- **Se sobrar tempo:** adicionar um indicador visual de qual página está ativa
  na sidebar.

#### `[ ]` FE-07 — Login e sessão (João)
- **Depende de:** FE-05, API-03.
- **Objetivo:** o almoxarife consegue entrar de verdade e navegar em rota
  protegida.
- **Passo a passo:**
  1. Criar a tela `/login` com formulário de e-mail e senha (React Hook Form +
     Zod).
  2. Chamar a autenticação do Supabase Auth pelo cliente do front ou por um
     endpoint da própria API (decidir com o Henrique qual caminho, e documentar
     em `/docs/arquitetura.md`).
  3. Guardar o token em memória (nunca em `localStorage` puro sem cuidado) e
     criar um contexto de sessão.
  4. Criar o componente `RotaProtegida` que redireciona para `/login` se não
     houver sessão.
- **Pronto quando:** login real contra a API funciona e uma rota protegida
  bloqueia usuário deslogado.
- **Se sobrar tempo:** adicionar "esqueci minha senha" (fluxo padrão do
  Supabase Auth) — não é exigido, mas é rápido de plugar.

#### `[ ]` FE-08 — Componentes base reutilizáveis (Kauan)
- **Depende de:** FE-05.
- **Objetivo:** os blocos que todas as telas seguintes vão usar, para não
  reinventar tabela e badge em cada tela.
- **Passo a passo:**
  1. `StatusBadge` — recebe o status (`disponivel`/`em_uso`/`indisponivel`) e
     pinta com a cor certa da FE-01.
  2. `DataTable` — tabela genérica com paginação e estado vazio.
  3. `KpiCard` — card com ícone, número grande e rótulo (usado no dashboard no
     Sprint 8, mas o componente pode ser construído já).
  4. `EmptyState` — mensagem amigável quando uma lista vem vazia.
- **Pronto quando:** os 4 componentes existem isolados e têm pelo menos um uso
  de exemplo numa página de teste.
- **Se sobrar tempo:** criar também o `ConfirmDialog` genérico (usado depois em
  ações destrutivas como baixar uma ferramenta).

#### `[ ]` FE-09 — Campo de identificação com leitura de código (João)
- **Depende de:** FE-05, API-05, API-09.
- **Objetivo:** o componente que faz o leitor de código de barras e o leitor de
  crachá funcionarem sem configuração — é o coração da tela de retirada.
- **Passo a passo:**
  1. Criar um input que recebe foco automático ao abrir a tela.
  2. Tratar o evento de `Enter` (é assim que a maioria dos leitores de código
     de barras e de crachá "digita" o valor e confirma).
  3. Ao confirmar, chamar `GET /v1/ferramentas/por-codigo/:codigo` ou
     `GET /v1/colaboradores/identificar?termo=` dependendo do contexto
     (parametrizar o componente para os dois usos).
  4. Se não encontrar, disparar um callback (`onNaoEncontrado`) — quem usa o
     componente decide o que fazer (na retirada, isso abre o modal de cadastro
     rápido, construído no Sprint 5).
- **Pronto quando:** testado digitando manualmente e simulando a leitura
  rápida de um leitor (colar o texto e apertar Enter).
- **Se sobrar tempo:** adicionar um retorno visual (ícone de check) quando o
  reconhecimento for bem-sucedido, antes mesmo de avançar de tela.

#### `[ ]` FE-10 — Esqueleto navegável de todas as páginas (João)
- **Depende de:** FE-06, FE-07.
- **Objetivo:** todas as rotas do sistema existem e navegam entre si, mesmo que
  ainda sem dado real em algumas — é o que o Marcelo vai avaliar no dia 22/09.
- **Passo a passo:**
  1. Criar as rotas: `/`, `/ferramentas`, `/ferramentas/nova`,
     `/ferramentas/:id`, `/retiradas/nova`, `/devolucoes`, `/indisponiveis`,
     `/calendario`, `/emprestimos`, `/colaboradores`, `/cadastros/setores`,
     `/cadastros/categorias`, `/cadastros/atividades`, `/importar`, `/consulta`,
     `*` (404).
  2. Cada página pode começar como um título + "em construção", exceto as que
     já têm dependência pronta (ver Sprint 5 em diante).
  3. Ligar tudo na sidebar do `AppLayout`.
- **Pronto quando:** dá para navegar por todas as rotas sem tela em branco ou
  erro no console.
- **Se sobrar tempo:** já plugar o `DataTable` da FE-08 na lista de ferramentas
  com dado mockado, antecipando o Sprint 5.

---

### Sprint 5 (qua 23/09 a ter 29/09) — Entrega oficial 29/09 (Nivaldo): validações e erros

**Foco:** as telas mais importantes do sistema — retirada e devolução — ganham
vida de verdade.
**Buffer:** trabalho pesado até quinta 24/09 na API; front tem até sexta 25/09
para o fluxo básico e usa segunda 28/09 para lapidar antes da entrega de terça.

#### `[ ]` API-14 — Validação Zod refinada em todas as rotas de escrita (Henrique)
- **Depende de:** API-07 a API-13.
- **Objetivo:** nenhuma rota de escrita aceita dado incoerente, com mensagem de
  erro clara o suficiente para o front mostrar direto no campo certo.
- **Passo a passo:**
  1. Revisar todos os schemas Zod já criados e garantir que a mensagem de erro
     de cada campo é específica (não um genérico "dado inválido").
  2. Garantir que campos sensíveis (`usuario_retirada_id`, `registrada_por`
     etc.) são removidos do body com `.strip()` mesmo se o front mandar.
  3. Testar mandando esses campos "proibidos" de propósito e confirmar que são
     ignorados, não que dão erro.
- **Pronto quando:** os testes de campo proibido e de mensagem específica
  passam em pelo menos 5 rotas diferentes.
- **Se sobrar tempo:** gerar automaticamente a documentação Swagger dos
  schemas Zod (bibliotecas como `zod-to-openapi`), se o tempo permitir.

#### `[ ]` API-15 — Rate limit no endpoint de consulta (Guilherme)
- **Depende de:** API-14.
- **Objetivo:** preparar o terreno para a tela de consulta pública do Sprint 6
  não virar porta de varredura da base de colaboradores.
- **Passo a passo:**
  1. Configurar `express-rate-limit` por IP e por matrícula tentada.
  2. Aplicar num endpoint provisório `/v1/consulta/sessao` (o endpoint completo
     vem no Sprint 6 — aqui só o limite já fica pronto).
- **Pronto quando:** a 6ª tentativa em menos de um minuto retorna 429.
- **Se sobrar tempo:** aplicar o mesmo padrão de rate limit no `/v1/auth/login`
  do almoxarife, por segurança.

#### `[ ]` FE-11 — Lista e detalhe de ferramentas com dado real (João)
- **Depende de:** API-05, FE-08, FE-10.
- **Objetivo:** a tela de ferramentas deixa de ser mock e passa a mostrar o
  banco de verdade.
- **Passo a passo:**
  1. Criar o hook `useFerramentas(filtros)` com TanStack Query chamando
     `GET /v1/ferramentas`.
  2. Plugar filtros de busca, status e categoria na `DataTable`.
  3. Criar a tela de detalhe (`/ferramentas/:id`) mostrando ficha e histórico.
  4. Tratar loading (skeleton) e vazio (usar o `EmptyState`).
- **Pronto quando:** a lista reflete o dado real do `soufer-dev` e os filtros
  funcionam.
- **Se sobrar tempo:** adicionar um `debounce` no campo de busca para não
  disparar uma requisição a cada tecla.

#### `[ ]` FE-12 — Cadastro de ferramenta + geração de código de barras (João)
- **Depende de:** API-07, FE-11.
- **Objetivo:** cadastrar uma ferramenta e sair já com o código de barras
  pronto para imprimir.
- **Passo a passo:**
  1. Formulário de cadastro com React Hook Form + Zod, espelhando a validação
     da API-08.
  2. Ao salvar com sucesso, mostrar o `codigo_patrimonio` retornado pela API.
  3. Renderizar o código com `react-barcode` (Code128) na própria tela de
     confirmação.
  4. Criar a rota `/ferramentas/:id/etiqueta` com layout de impressão em
     50x25mm, usando `window.print()`.
  5. Ao imprimir, chamar `PATCH /v1/ferramentas/:id/etiqueta-impressa`.
- **Pronto quando:** cadastrar uma ferramenta gera e imprime a etiqueta de
  ponta a ponta.
- **Se sobrar tempo:** adicionar upload de foto da ferramenta (usa o Supabase
  Storage) — é enriquecimento, não bloqueia nada.

#### `[ ]` FE-13 — Modal de cadastro rápido de colaborador (João)
- **Depende de:** API-09, FE-09.
- **Objetivo:** quando o campo de identificação (FE-09) não encontra o
  colaborador, abre este modal sem perder o contexto da retirada.
- **Passo a passo:**
  1. Modal com matrícula, nome, código do crachá, setor (select) e cargo.
  2. Ao salvar, chamar `POST /v1/colaboradores` e, no sucesso, fechar o modal
     devolvendo o colaborador recém-criado para o fluxo que estava em
     andamento.
  3. Reaproveitar este mesmo modal depois na tela de CRUD de colaboradores
     (Sprint 8), então não hardcodar nada específico da retirada dentro dele.
- **Pronto quando:** simular um colaborador inexistente no fluxo de retirada e
  completar o cadastro sem perder a ferramenta já selecionada.
- **Se sobrar tempo:** validar duplicidade de matrícula no próprio front antes
  de submeter, para uma resposta mais rápida que esperar o erro da API.

#### `[ ]` FE-14 — Fluxo de retirada completo (João)
- **Depende de:** API-11, FE-09, FE-12, FE-13.
- **Objetivo:** a tela mais importante do sistema, de ponta a ponta.
- **Passo a passo:**
  1. Passo 1: identificar a ferramenta (componente FE-09).
  2. Passo 2: identificar o colaborador (componente FE-09 reaproveitado + modal
     FE-13 se não achar).
  3. Passo 3: escolher a atividade (obrigatório), setor de destino e previsão
     de devolução.
  4. Mostrar "Registrado por: [nome do usuário logado]" como texto fixo, nunca
     editável.
  5. Ao confirmar, chamar `POST /v1/emprestimos` e mostrar mensagem de sucesso
     com um resumo do que foi registrado.
  6. Tratar o erro 409 (ferramenta já emprestada) com uma mensagem clara, não
     um erro genérico.
- **Pronto quando:** o roteiro de demonstração da retirada (ferramenta → nova
  atividade → colaborador não cadastrado → cadastro rápido → confirmação)
  funciona sem travar.
- **Se sobrar tempo:** adicionar um atalho de teclado para avançar entre os
  passos sem usar o mouse — útil de verdade no balcão do almoxarifado.

#### `[ ]` FE-15 — Fluxo de devolução com ocorrência (João)
- **Depende de:** API-12, FE-09.
- **Objetivo:** devolver uma ferramenta, ver quem pegou, e abrir a ocorrência
  quando necessário.
- **Passo a passo:**
  1. Buscar o empréstimo aberto por código de barras da ferramenta.
  2. Mostrar o registro de retirada (quem pegou, matrícula, setor, atividade,
     quando, quem registrou) antes de pedir a condição de devolução.
  3. Botões de condição: OK / Avaria / Perda, com campo de observação
     obrigatório para os dois últimos.
  4. Ao confirmar avaria ou perda, mostrar a confirmação de que a ferramenta
     foi para "Indisponíveis" e que uma ocorrência foi aberta.
- **Pronto quando:** o roteiro de devolução com avaria funciona de ponta a
  ponta e a ferramenta some da lista de "em uso".
- **Se sobrar tempo:** nada — esta tela e a de retirada são o coração do
  projeto, qualquer tempo sobrando aqui deve virar teste manual extra, não
  feature nova.

#### `[ ]` FE-16 — Página de Indisponíveis (João)
- **Depende de:** API-13, FE-15.
- **Objetivo:** seção separada de "em uso", como pedido explicitamente.
- **Passo a passo:**
  1. Listar ferramentas com status `indisponivel`, mostrando motivo, o
     colaborador responsável (via `GET /v1/ocorrencias`) e o status da
     tratativa.
  2. Botão de ação para atualizar a tratativa (`PATCH /v1/ocorrencias/:id`).
  3. Botão "Disponibilizar" quando a tratativa estiver resolvida
     (`PATCH /v1/ferramentas/:id/disponibilizar`).
- **Pronto quando:** a lista nunca mistura com a lista de ferramentas "em uso".
- **Se sobrar tempo:** mostrar o custo total de ocorrências agrupado por
  colaborador, usando a `vw_ocorrencias_por_colaborador` (API ainda não expõe
  isso — se sobrar tempo aqui e no Henrique, vale criar o endpoint junto).

---

### Sprint 6 (qua 30/09 a ter 06/10) — Entrega oficial 06/10 (Marudi): nuvem inicial

**Foco:** primeiro deploy de teste na AWS; telas de calendário, notificação e
consulta pública.
**Buffer:** trabalho pesado até quinta 01/10; sexta a domingo livres — deploy
costuma ter imprevisto de configuração, é bom ter esse colchão.

#### `[ ]` INFRA-05 — Provisionar EC2 e preparar o servidor (Guilherme)
- **Depende de:** INFRA-04.
- **Objetivo:** máquina na nuvem pronta para rodar a API.
- **Passo a passo:**
  1. Criar a instância EC2 t3.micro na conta do AWS Academy.
  2. Configurar o security group liberando as portas 22 (SSH), 80 e 443.
  3. Instalar Node 20 na instância.
  4. Confirmar acesso via SSH com a chave criada na INFRA-04.
- **Pronto quando:** SSH funcionando e Node 20 instalado, com print salvo em
  `/docs/evidencias-nuvem/`.
- **Se sobrar tempo:** documentar o passo a passo em
  `/docs/plano-implantacao.md` enquanto está fresco na memória — vai poupar
  tempo se precisar recriar a instância depois.

#### `[ ]` INFRA-06 — Deploy da API com PM2 e Nginx (Guilherme)
- **Depende de:** INFRA-05, API-15.
- **Objetivo:** a API rodando de forma persistente na nuvem, não só localmente.
- **Passo a passo:**
  1. Clonar o repositório na instância e configurar o `.env` de produção
     apontando para o `soufer-prod`.
  2. Rodar a API com PM2 em modo cluster.
  3. Configurar `pm2 startup` + `pm2 save` para sobreviver a um reboot.
  4. Configurar Nginx como reverse proxy da porta 80 para a porta da API.
  5. Testar `GET /v1/health` pela URL pública.
- **Pronto quando:** a API responde publicamente e sobrevive a um `reboot` de
  teste da instância.
- **Se sobrar tempo:** já configurar HTTPS com Let's Encrypt/Certbot, adiantando
  o que está planejado para o Sprint 9.

#### `[ ]` INFRA-07 — Bucket S3 + CloudFront para o front (Guilherme)
- **Depende de:** FE-10 (precisa ter algo para publicar).
- **Objetivo:** versão de teste do front acessível publicamente.
- **Passo a passo:**
  1. Rodar `npm run build` no `/web` e subir o conteúdo para um bucket S3
     configurado como site estático.
  2. Criar uma distribuição CloudFront apontando para o bucket.
  3. Apontar o `.env` de produção do front para a URL pública da API (da
     INFRA-06).
- **Pronto quando:** a URL do CloudFront abre o front e ele consegue fazer
  login contra a API em produção.
- **Se sobrar tempo:** nada — deixar para o Sprint 9 qualquer otimização de
  cache do CloudFront.

#### `[ ]` API-16 — Endpoint e sessão de consulta pública (Guilherme)
- **Depende de:** API-15.
- **Objetivo:** o modo quiosque descrito na regra 8 da Seção 3.
- **Passo a passo:**
  1. `POST /v1/consulta/sessao` recebendo matrícula ou código de crachá,
     validando contra `colaboradores` ativos, e emitindo um token de escopo
     limitado válido por 15 minutos.
  2. `GET /v1/consulta/ferramentas` aceitando só esse token, retornando nome,
     categoria, status e localização — nunca quem está com a ferramenta, nem
     histórico, nem valores.
  3. Testar que o token normal do almoxarife **não** funciona nessa rota e
     vice-versa.
- **Pronto quando:** os dois tokens são realmente isolados um do outro.
- **Se sobrar tempo:** registrar em log (não em tabela de negócio) quem
  consultou o quê, para auditoria simples sem virar feature de rastreio.

#### `[ ]` API-17 — Calendário e notificações (Henrique)
- **Depende de:** API-11, DATA-02.
- **Objetivo:** dar suporte às telas FE-18 e FE-19 deste sprint.
- **Passo a passo:**
  1. `GET /v1/emprestimos/calendario?mes=AAAA-MM` retornando as devoluções
     previstas agrupadas por dia.
  2. Criar `fn_gerar_notificacoes()` no banco e agendar no `pg_cron` para rodar
     de segunda a sexta às 07:00 (horário de Brasília).
  3. `GET /v1/notificacoes?lida=false` e `PATCH /v1/notificacoes/:id/lida`.
  4. Rodar a função manualmente uma vez para conferir que as notificações
     aparecem certas com o dado do seed.
- **Pronto quando:** rodar a função gera notificações de "vence hoje" e
  "atrasado" coerentes com o dado de teste.
- **Se sobrar tempo:** adicionar a notificação de "ocorrência pendente há mais
  de N dias", que já está prevista no enum `tipo_notificacao` mas não é
  obrigatória para o MVP.

#### `[ ]` FE-17 — Tela de consulta (quiosque) (João)
- **Depende de:** API-16.
- **Objetivo:** tela pública simples, sem sidebar nem login, para o funcionário
  esporádico.
- **Passo a passo:**
  1. Criar `/consulta` fora do `AppLayout` normal (layout próprio, mais
     simples).
  2. Campo único de matrícula/crachá, chama `POST /v1/consulta/sessao`.
  3. Após a sessão, mostrar busca de ferramentas somente leitura, com o
     `StatusBadge` da FE-08.
  4. Expirar a tela de volta ao campo inicial depois de 15 minutos de
     inatividade.
- **Pronto quando:** um colaborador consegue ver se uma ferramenta está
  disponível sem enxergar nada além disso.
- **Se sobrar tempo:** deixar essa tela num visual mais "totem", com fonte
  maior — pensando em uso num tablet fixo no almoxarifado.

#### `[ ]` FE-18 — Calendário de vencimentos (João)
- **Depende de:** API-17.
- **Objetivo:** visão mensal para o almoxarife cobrar devoluções.
- **Passo a passo:**
  1. Grade mensal (`react-day-picker` ou grade própria) mostrando quantos
     empréstimos vencem em cada dia.
  2. Cor por situação: vermelho vencido, âmbar vence hoje, azul futuro.
  3. Clicar num dia abre a lista de empréstimos daquele dia, com colaborador,
     setor e ramal.
  4. Filtro por setor.
- **Pronto quando:** navegar entre meses funciona e os dados batem com
  `GET /v1/emprestimos/calendario`.
- **Se sobrar tempo:** adicionar um botão "ligar" (`tel:`) direto no ramal do
  colaborador, para cobrança rápida.

#### `[ ]` FE-19 — Sino de notificações (João)
- **Depende de:** API-17, FE-06.
- **Objetivo:** o almoxarife não precisa entrar no calendário todo dia para
  saber o que venceu.
- **Passo a passo:**
  1. Plugar o sino reservado no `AppLayout` (FE-06) com contador de não lidas.
  2. Dropdown com os itens do dia, cada um levando para o empréstimo
     correspondente.
  3. Marcar como lida ao clicar.
- **Pronto quando:** o contador reflete `GET /v1/notificacoes?lida=false` e
  atualiza ao marcar como lida.
- **Se sobrar tempo:** tocar um som discreto ou destacar visualmente quando
  chegar uma notificação nova durante a sessão (via polling curto).

---

### Recesso (qua 07/10 a ter 13/10)

Sem entrega oficial. Usar como buffer natural: revisar tudo que ficou pendente
dos sprints 0 a 6, gravar um teste de estresse do fluxo completo (retirada →
devolução com avaria → aparecer em indisponíveis) e descansar — a reta final
começa no sprint seguinte.

---

### Sprint 7 (qua 14/10 a ter 20/10) — Entrega oficial 20/10 (Max): qualidade de dados

**Foco:** importação do inventário legado, regras de negócio documentadas,
auditoria.
**Buffer:** trabalho pesado até quinta 15/10; sexta a domingo livres.

#### `[ ]` DATA-03 — Importação de CSV do inventário (Guilherme)
- **Depende de:** API-07, DATA-01.
- **Objetivo:** trazer o inventário real (ou o exemplo levantado na DATA-01)
  para dentro do sistema sem digitar ferramenta por ferramenta.
- **Passo a passo:**
  1. `POST /v1/importacoes/ferramentas` recebendo um arquivo CSV.
  2. Fazer o parse com `csv-parse`, normalizar (trim, uppercase no nome,
     conversão de datas `DD/MM/AAAA` → ISO, valor com vírgula → numeric).
  3. Validar cada linha com Zod; linhas inválidas não bloqueiam as válidas.
  4. Deduplicar por `patrimonio_legado`.
  5. Retornar um relatório: quantas linhas foram aceitas, quantas rejeitadas e
     por quê.
- **Pronto quando:** importar um CSV de teste com propositalmente 2 linhas
  erradas mostra o relatório certo e as linhas boas entram no banco.
- **Se sobrar tempo:** permitir reimportar corrigindo só as linhas rejeitadas
  (gerar um CSV de erro para o almoxarife baixar, corrigir e reenviar).

#### `[ ]` DATA-04 — Regras de negócio documentadas (Henrique)
- **Depende de:** API-11, API-12.
- **Objetivo:** documento único explicando cada regra automática do sistema,
  pedido como evidência pelo prof. Max.
- **Passo a passo:**
  1. Listar cada trigger e validação (as 10 regras da Seção 3 são a base).
  2. Para cada uma: onde está implementada (banco ou API), o que acontece se
     for violada, e um exemplo real.
  3. Salvar em `/docs/regras-negocio.md`.
- **Pronto quando:** documento cobre as 10 regras com exemplo de cada.
- **Se sobrar tempo:** adicionar um diagrama de estados da ferramenta
  (disponível → em_uso → disponível/indisponível → disponível) — visual ajuda
  na apresentação final.

#### `[ ]` DATA-05 — Auditoria em jsonb (Guilherme)
- **Depende de:** DB-05.
- **Objetivo:** rastrear quem mudou o quê, exigência de qualidade de dados.
- **Passo a passo:**
  1. Criar triggers genéricos de auditoria (`INSERT`/`UPDATE`/`DELETE`) nas
     tabelas `ferramentas`, `emprestimos` e `ocorrencias`, gravando
     `dados_antes`/`dados_depois` em `jsonb`.
  2. Testar alterando um registro e conferindo que a linha de auditoria
     aparece com o diff certo.
- **Pronto quando:** as três tabelas críticas geram registro de auditoria em
  toda alteração.
- **Se sobrar tempo:** criar uma tela simples (mesmo que só para o próprio
  time, não precisa estar no menu principal) de consulta da auditoria por
  entidade — bom para debug e para mostrar na apresentação.

#### `[ ]` DATA-06 — Script de consistência `data:check` (Guilherme)
- **Depende de:** DATA-03, DATA-05.
- **Objetivo:** um comando que aponta problema de dado antes que ele vire bug
  em produção.
- **Passo a passo:**
  1. Criar `npm run data:check` em `/api` que roda um conjunto de consultas
     SQL: ferramentas `em_uso` sem empréstimo aberto correspondente,
     ocorrência sem ferramenta `indisponivel`, colaborador duplicado por
     matrícula, empréstimo com `previsao_devolucao` antes da `data_retirada`.
  2. Imprimir um relatório legível no terminal.
- **Pronto quando:** rodar o script no `soufer-dev` (mesmo sem problema real)
  retorna "tudo certo" e, ao forçar uma inconsistência manual, o script
  detecta.
- **Se sobrar tempo:** rodar esse script como parte do pipeline de CI (se
  houver), avisando antes de mesclar um PR.

#### `[ ]` DATA-07 — Documentar o fluxo completo de integração (Kauan)
- **Depende de:** DATA-01, DATA-03.
- **Objetivo:** diagrama e texto mostrando a jornada do dado, do CSV legado e
  da BrasilAPI até a tela do usuário.
- **Passo a passo:**
  1. Desenhar o diagrama: CSV/BrasilAPI → normalização/validação → banco →
     views → API → front.
  2. Escrever o texto explicando cada seta do diagrama.
  3. Consolidar em `/docs/fluxo-integracao.md` (já iniciado na DATA-01).
- **Pronto quando:** documento com diagrama e texto completos.
- **Se sobrar tempo:** revisar com o Henrique se algum detalhe técnico ficou
  simplificado demais ou errado.

#### `[ ]` FE-20 — Tela de importação CSV (João)
- **Depende de:** DATA-03.
- **Objetivo:** o almoxarife consegue importar o inventário sem usar o
  Insomnia.
- **Passo a passo:**
  1. Tela `/importar` com upload de arquivo.
  2. Mostrar uma prévia das primeiras linhas antes de confirmar o envio.
  3. Depois do envio, mostrar o relatório de aceitas/rejeitadas retornado pela
     API, com destaque nas rejeitadas.
- **Pronto quando:** importar o CSV de teste da DATA-03 funciona pela
  interface, sem precisar do Insomnia.
- **Se sobrar tempo:** permitir baixar um modelo de CSV vazio com o cabeçalho
  certo, direto da tela.

---

### Sprint 8 (qua 21/10 a ter 27/10) — Entrega oficial 27/10 (Marcelo): integração final

**Foco:** dashboard com dado real, histórico com filtros, CRUDs restantes,
testes de ponta a ponta.
**Buffer:** trabalho pesado até quinta 22/10; sexta a domingo livres.

#### `[ ]` API-18 — Endpoint de KPIs do dashboard (Henrique)
- **Depende de:** DB-07.
- **Objetivo:** `GET /v1/dashboard/kpis` consultando a `vw_dashboard_kpis`.
- **Passo a passo:**
  1. Criar a rota simples que faz `select * from vw_dashboard_kpis`.
  2. Testar contra o dado real acumulado nos sprints anteriores.
- **Pronto quando:** os 6 números batem com uma contagem manual de conferência.
- **Se sobrar tempo:** adicionar um segundo endpoint
  `GET /v1/dashboard/atrasos` já pronto para o gráfico da FE-21.

#### `[ ]` FE-21 — Dashboard com KPIs e gráfico reais (João)
- **Depende de:** API-18, FE-08.
- **Objetivo:** a tela inicial mostra os 6 cartões de KPI e um gráfico útil,
  com dado de verdade, atualizando sozinho.
- **Passo a passo:**
  1. Criar o hook `useDashboardKpis` com TanStack Query chamando
     `GET /v1/dashboard/kpis`, com `refetchInterval` de 60 segundos.
  2. Montar a grade de `KpiCard` (2 colunas no mobile, 3 no tablet, 6 no
     desktop) para: Cadastradas, Disponíveis, Em uso, Indisponíveis,
     Atrasadas, Ocorrências abertas.
  3. Adicionar um gráfico (`recharts`) de empréstimos por setor ou por
     atividade nos últimos 30 dias.
  4. Tratar loading (skeleton) e erro (mensagem + botão de tentar de novo).
- **Pronto quando:** os 6 números batem com o banco real e a tela é responsiva
  em 360/768/1280.
- **Se sobrar tempo:** animação de contagem crescente ao carregar os números,
  ou um mini-sparkline dentro de cada card — só depois de tudo funcionando.

#### `[ ]` FE-22 — Histórico de empréstimos com filtros e exportação (João)
- **Depende de:** API-11, FE-08.
- **Objetivo:** consulta e exportação do histórico completo.
- **Passo a passo:**
  1. Tela `/emprestimos` com filtros por período, situação, setor e atividade.
  2. `GET /v1/relatorios/emprestimos.csv` chamado ao clicar em "Exportar".
  3. Testar que o CSV baixado abre certo no Excel/Google Sheets.
- **Pronto quando:** filtro e exportação funcionam com o dado acumulado.
- **Se sobrar tempo:** salvar o último filtro usado no `localStorage` do
  navegador, para não perder ao voltar na tela.

#### `[ ]` FE-23 — CRUD de colaboradores na interface (Kauan)
- **Depende de:** API-09, FE-13.
- **Objetivo:** tela completa de gestão de colaboradores, reaproveitando o
  modal de cadastro rápido já feito.
- **Passo a passo:**
  1. Tela `/colaboradores` com `DataTable`, busca e paginação.
  2. Reaproveitar o modal da FE-13 para criar e editar.
  3. Ação de inativar (não apagar).
- **Pronto quando:** criar, editar e inativar um colaborador funciona pela
  tela.
- **Se sobrar tempo:** nada — é uma boa hora de ajudar o João na FE-22 se
  este CRUD terminar rápido.

#### `[ ]` FE-24 — CRUDs de setores, categorias e atividades (Kauan)
- **Depende de:** API-10.
- **Objetivo:** os três cadastros auxiliares navegáveis pela interface.
- **Passo a passo:**
  1. Três telas simples (`/cadastros/setores`, `/cadastros/categorias`,
     `/cadastros/atividades`), cada uma com tabela e modal de criar/editar.
  2. Pode reaproveitar um componente genérico de "CRUD simples" para os três,
     já que a estrutura é idêntica.
- **Pronto quando:** os três cadastros funcionam pela interface.
- **Se sobrar tempo:** adicionar confirmação antes de inativar um item que já
  está em uso por alguma ferramenta ou empréstimo.

#### `[ ]` FE-25 — Teste de ponta a ponta dos fluxos críticos (Todos)
- **Depende de:** FE-14, FE-15, FE-16, FE-21.
- **Objetivo:** rodar o roteiro de demonstração completo pela primeira vez de
  ponta a ponta, com a equipe toda presente.
- **Passo a passo:**
  1. Cadastrar uma ferramenta nova e imprimir a etiqueta.
  2. Fazer uma retirada com colaborador novo (testando o cadastro rápido).
  3. Fazer uma devolução com avaria e conferir que a ferramenta aparece em
     Indisponíveis.
  4. Conferir que o dashboard e o calendário refletem tudo isso.
  5. Anotar qualquer travamento ou tela que não bate com o esperado.
- **Pronto quando:** o roteiro roda sem erro visível, do início ao fim.
- **Se sobrar tempo:** gravar esse teste em vídeo — pode virar o rascunho do
  vídeo de demonstração da apresentação final.

---

### Sprint 9 (qua 28/10 a ter 03/11) — Entrega oficial 03/11 (Marudi): otimização

**Foco:** segurança de borda e monitoramento da infraestrutura.
**Buffer:** trabalho pesado até quinta 29/10; sexta a domingo livres.

#### `[ ]` INFRA-08 — HTTPS, Helmet, CORS e rate limit geral (Guilherme)
- **Depende de:** INFRA-06.
- **Objetivo:** fechar os buracos básicos de segurança de borda antes da reta
  final.
- **Passo a passo:**
  1. Configurar HTTPS na instância com Certbot (se ainda não tiver sido feito
     no Sprint 6).
  2. Confirmar que o Helmet está ativo na API com os headers padrão.
  3. Restringir o CORS só ao domínio do CloudFront (nada de `*` em produção).
  4. Aplicar rate limit geral em todas as rotas autenticadas, além do que já
     existe na consulta.
- **Pronto quando:** checar os headers de resposta confirma Helmet ativo e o
  CORS bloqueia origem não autorizada.
- **Se sobrar tempo:** rodar um scanner básico de segurança (ex.:
  `npm audit`) e corrigir vulnerabilidades de severidade alta.

#### `[ ]` INFRA-09 — CloudWatch: métricas, logs e alarme (Guilherme)
- **Depende de:** INFRA-06.
- **Objetivo:** monitoramento de verdade, não só "parece que está no ar".
- **Passo a passo:**
  1. Configurar o agente do CloudWatch na instância EC2 para logs da API.
  2. Criar um alarme que dispara se `/v1/health` parar de responder.
  3. Configurar um dashboard básico de CPU e memória da instância.
- **Pronto quando:** o alarme dispara de verdade num teste manual (parar a API
  de propósito por um minuto).
- **Se sobrar tempo:** configurar uma notificação por e-mail quando o alarme
  disparar.

#### `[ ]` INFRA-10 — Otimização de bundle e cache do CloudFront (Guilherme)
- **Depende de:** INFRA-07.
- **Objetivo:** front carregando rápido antes da apresentação.
- **Passo a passo:**
  1. Rodar a análise do bundle do build de produção e identificar
     dependências grandes desnecessárias.
  2. Configurar cache de arquivos estáticos no CloudFront.
  3. Medir o tempo de carregamento antes e depois.
- **Pronto quando:** houver uma melhora mensurável registrada em
  `/docs/relatorio-infra.md`.
- **Se sobrar tempo:** comprimir as imagens usadas no front (fotos de
  ferramentas, ícones customizados).

#### `[ ]` DOC-05 — Relatório técnico de infraestrutura (Guilherme)
- **Depende de:** INFRA-08, INFRA-09, INFRA-10.
- **Objetivo:** documento pedido explicitamente pelo prof. Marudi.
- **Passo a passo:**
  1. Descrever os ajustes de segurança, as otimizações e as evidências de
     monitoramento feitas neste sprint.
  2. Anexar prints do CloudWatch e do teste do alarme.
- **Pronto quando:** `/docs/relatorio-infra.md` pronto para a entrega de
  03/11.
- **Se sobrar tempo:** nada — este é o entregável oficial do sprint, manter o
  foco em deixá-lo completo.

---

### Sprint 10 (qua 04/11 a ter 10/11) — Entrega oficial 10/11 (Max + Nivaldo): segurança e dados finais

**Foco:** última entrega técnica antes do buffer de fechamento.
**Buffer:** trabalho pesado até quinta 05/11; sexta a domingo livres — depois
disso começa o buffer geral do Sprint 11.

#### `[ ]` API-19 — Hardening do JWT e dos middlewares (Guilherme)
- **Depende de:** API-03, API-16.
- **Objetivo:** revisão final de segurança de autenticação antes do code
  freeze.
- **Passo a passo:**
  1. Revisar o tempo de expiração do token do almoxarife e do token de
     consulta.
  2. Confirmar que toda rota sensível passa por `auth` + `autorizar(...)`.
  3. Testar explicitamente: token de consulta tentando acessar rota de
     almoxarife (deve dar 403), token vencido (deve dar 401).
- **Pronto quando:** os dois testes de invasão simulada falham como esperado
  (ou seja, o sistema bloqueia certo).
- **Se sobrar tempo:** revisar se algum segredo ficou hardcoded em algum
  arquivo por engano, antes do deploy final.

#### `[ ]` API-20 — Testes automatizados dos fluxos críticos (Guilherme)
- **Depende de:** API-11, API-12.
- **Objetivo:** garantir com testes (não só manualmente) que retirada,
  devolução e cálculo de dias úteis continuam funcionando.
- **Passo a passo:**
  1. Configurar Vitest + Supertest em `/api`.
  2. Escrever teste de retirada (sucesso e conflito de ferramenta já
     emprestada).
  3. Escrever teste de devolução com avaria (confere que a ocorrência foi
     criada).
  4. Escrever teste de `diasUteis()` pulando um feriado conhecido.
- **Pronto quando:** `npm test` roda os quatro casos e todos passam.
- **Se sobrar tempo:** adicionar teste do cadastro rápido de colaborador
  dentro do fluxo de retirada.

#### `[ ]` DATA-08 — Consolidar a documentação do fluxo de dados (Henrique)
- **Depende de:** DATA-04, DATA-07.
- **Objetivo:** fechar a documentação de dados como exigido na entrega
  conjunta de 10/11.
- **Passo a passo:**
  1. Revisar `/docs/regras-negocio.md` e `/docs/fluxo-integracao.md` e
     atualizar qualquer coisa que mudou desde o Sprint 7.
  2. Preparar uma demonstração rápida (prints ou vídeo curto) do fluxo
     completo origem → API → tela, para mostrar no Dia Maker.
- **Pronto quando:** os dois documentos refletem o estado atual do sistema.
- **Se sobrar tempo:** nada — ir direto para o Sprint 11.

---

### Sprint 11 — Buffer final (qua 18/11 a dom 22/11)

**Foco:** nenhuma feature nova. Só correção, estabilização, documentação
final e os entregáveis de apresentação. Sprint único de buffer — o Sprint 10
(entrega técnica final) agora vence 17/11, então sobrou só essa janela antes
da semana fixa de apresentações (23–27/11); os antigos Sprint 11 e Sprint 12
foram fundidos aqui.

#### `[ ]` DOC-06 — Code freeze (Todos)
- **Depende de:** todos os sprints anteriores.
- **Objetivo:** parar de adicionar funcionalidade nova a partir de 11/11.
- **Passo a passo:**
  1. Revisar o board — qualquer issue do MVP que ainda esteja aberta vira
     prioridade máxima; qualquer ideia nova vira nota para "trabalhos
     futuros" no README, não entra no código.
- **Pronto quando:** o board não tem nenhuma issue do MVP em aberto.

#### `[ ]` DOC-07 — Bug bash geral (Todos)
- **Depende de:** DOC-06.
- **Objetivo:** achar e corrigir os últimos problemas antes de travar o
  deploy final.
- **Passo a passo:**
  1. Cada pessoa testa as telas que não são "as suas", com o olhar de quem
     nunca viu o sistema.
  2. Registrar cada problema como issue rápida, corrigir e fechar no mesmo
     dia.
  3. Revisar responsividade mais uma vez em 360/768/1280 em todas as telas.
- **Pronto quando:** nenhum bug crítico conhecido continua em aberto.

#### `[ ]` INFRA-11 — Deploy final em produção (Guilherme)
- **Depende de:** DOC-07.
- **Objetivo:** a versão que vai ser apresentada já estável, rodando com dado
  real (ou o mais realista possível).
- **Passo a passo:**
  1. Rodar a migration e o seed final no `soufer-prod`.
  2. Fazer o deploy definitivo da API e do build do front.
  3. Rodar o roteiro de demonstração completo direto na URL pública.
- **Pronto quando:** a URL pública sustenta o roteiro de demonstração sem
  erro.

#### `[ ]` DOC-08 — Testar etiqueta e leitor no local (João)
- **Depende de:** FE-12, INFRA-11.
- **Objetivo:** confirmar que o código de barras impresso funciona de verdade
  fora do computador — é o tipo de detalhe que quebra demo ao vivo.
- **Passo a passo:**
  1. Imprimir etiquetas reais de pelo menos 3 ferramentas.
  2. Testar a leitura com um leitor físico se disponível, ou um app leitor de
     código de barras no celular como alternativa.
  3. Ajustar o tamanho/contraste da etiqueta se a leitura falhar.
- **Pronto quando:** as etiquetas impressas são lidas sem erro.

#### `[ ]` DOC-09 — README final (Kauan)
- **Depende de:** INFRA-11.
- **Objetivo:** documento de entrega completo.
- **Passo a passo:**
  1. Atualizar a seção "Como rodar localmente" com os passos reais (que
     ficaram como placeholder desde a DOC-03).
  2. Adicionar prints das telas principais.
  3. Revisar a arquitetura e os integrantes com RA.
  4. Pedir revisão de mais uma pessoa antes de considerar pronto.
- **Pronto quando:** README revisado por duas pessoas.

#### `[ ]` PRES-01 — Vídeo Formação para a Vida (Kauan)
- **Depende de:** nada técnico, mas precisa da apostila indicada no PI.
- **Objetivo:** vídeo de 3 a 5 minutos com todos os integrantes aparecendo,
  sobre a apostila "Compreendendo a linguagem como atividade humana",
  relacionando com o projeto.
- **Passo a passo:**
  1. Ler a apostila e extrair os conceitos centrais.
  2. Escrever um roteiro curto relacionando esses conceitos com a comunicação
     dentro da equipe e com a Soufer.
  3. Gravar com todos os quatro aparecendo — sem IA, sem podcast só de voz.
  4. Editar para ficar entre 3 e 5 minutos.
- **Pronto quando:** vídeo dentro do tempo, todos aparecendo, enviado pelo
  Classroom.

#### `[ ]` PRES-02 — Slides da apresentação (Kauan)
- **Depende de:** DOC-09.
- **Objetivo:** slides com roteiro de demonstração funcional.
- **Passo a passo:**
  1. Estrutura sugerida: problema → solução → arquitetura → demonstração ao
     vivo → ODS → desafios → aprendizados.
  2. Incluir o diagrama de arquitetura já feito na INFRA-01.
  3. Deixar um slide de "plano B" caso a internet falhe na apresentação
     (vídeo gravado da demo, feito na FE-25).
- **Pronto quando:** slides revisados por todo o time.

#### `[ ]` PRES-03 — Ensaio geral (Todos)
- **Depende de:** PRES-02, INFRA-11.
- **Objetivo:** ninguém apresenta pela primeira vez no dia da banca.
- **Passo a passo:**
  1. Rodar a apresentação completa com tempo cronometrado.
  2. Cada pessoa apresenta a parte que lhe cabe.
  3. Simular uma falha (internet cair) e testar o plano B do vídeo gravado.
- **Pronto quando:** o ensaio cabe no tempo e todos sabem sua parte de cor o
  suficiente para não ler o slide.

#### `[ ]` PRES-04 — Relatório Final de Extensão na Intranet (Cada um)
- **Depende de:** DOC-04, DATA-07.
- **Objetivo:** cada estudante preenche individualmente — sem isso o PI é
  invalidado e pode impedir a conclusão do curso.
- **Passo a passo:**
  1. Acessar o formulário na Intranet.
  2. Preencher descrição, ODS, beneficiado, contextualização, desafios,
     cronograma, síntese, aspectos positivos, dificuldades, resultados,
     sugestões e componentes da equipe.
  3. Enviar **no mesmo período da entrega do PI**, não depois.
- **Pronto quando:** os quatro relatórios estão enviados e aprovados (ou, se
  invalidado, corrigido dentro do prazo do calendário acadêmico).

#### `[ ]` DOC-10 — Entrega final no Classroom (João)
- **Depende de:** PRES-01, PRES-02, PRES-04, INFRA-11.
- **Objetivo:** fechar o pacote de entrega antes do prazo.
- **Passo a passo:**
  1. Conferir o repositório GitHub: código, README, histórico de commits dos
     quatro integrantes, sprint reports e atas.
  2. Anexar o link do repositório, o link do vídeo e os slides no Classroom.
  3. Conferir a data-limite no Calendário Acadêmico antes de enviar.
- **Pronto quando:** tudo anexado, digital, dentro do prazo — nunca impresso,
  nunca depois do prazo.

---

### Apresentações (23 a 27/11)

#### `[ ]` PRES-05 — Apresentação final (Todos)
- **Depende de:** tudo.
- **Objetivo:** demonstração funcional, presença de todos, oratória e
  conteúdo.
- **Lembrete crítico:** quem faltar no dia da apresentação fica sem nota de
  apresentação (2,0 pontos) — confirmar a presença de todos com antecedência.

---

## 9. Checklist final de entrega

- [ ] Repositório com código, README e commits de todos os quatro integrantes
- [ ] Sprint reports e atas no repositório
- [ ] Aplicação hospedada em nuvem, acessível na apresentação
- [ ] Plano de implantação e custos dos três provedores
- [ ] Documentação da camada de integração de dados
- [ ] Vídeo Formação para a Vida (3–5 min, todos aparecendo, sem IA)
- [ ] Slides e demonstração funcional
- [ ] Relatório Final de Extensão enviado na Intranet por cada estudante
- [ ] ODS demonstrado na apresentação e no relatório
- [ ] Entrega no Classroom dentro do prazo

# Guia de Contribuição

O fluxo de trabalho, convenções de branches/commits, processo de PR e o
checklist de Definition of Done vivem em `CONTRIBUTING.md` (raiz do
repositório) — consulte esse arquivo em vez de assumir convenções próprias.
Ele tem prioridade sobre qualquer descrição resumida que apareça em outro
lugar deste guia.

## Idioma
Todas as respostas, comentários de PR e reviews devem ser em português do Brasil.