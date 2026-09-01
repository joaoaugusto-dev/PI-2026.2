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
- **Front:** Vite + React 18 + React Router 6 + TanStack Query + Axios + React
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

O cronograma detalhado (sprints, issues, dependências, responsáveis e status)
não vive mais neste arquivo — ele fica desatualizado rápido demais. A fonte de
verdade é o board de Issues do GitHub:

https://github.com/joaoaugusto-dev/PI-2026.2/issues

Cada sprint é uma milestone (com data de entrega correspondente):

https://github.com/joaoaugusto-dev/PI-2026.2/milestones

Antes de iniciar, planejar ou continuar qualquer issue, consulte a issue
correspondente no GitHub (busque pelo ID, ex. `FE-14`, no título) para ver
status, dependências e descrição atual — não assuma pelo que foi dito em
conversas anteriores. Ao terminar uma issue, atualize o status dela no
GitHub (não neste arquivo).

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