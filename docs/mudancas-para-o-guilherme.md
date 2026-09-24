# Mudanças do back que cruzam com as suas issues (Guilherme)

Lista rápida para evitar retrabalho e conflito de merge. Vale para a #150 (login por matrícula), feita na branch `feat/api-149-auto-cadastro-aprovacao` (ainda sem PR). Detalhes completos em [`docs/issues/api-150-login-por-matricula.md`](issues/api-150-login-por-matricula.md).

Antes de começar qualquer issue sua (consulta, importação, auditoria, deploy, data:check), passe por aqui. Atualizar este arquivo a cada decisão nova.

## 1. Já feito e que sobrepõe issues suas

### #55 — API-15, rate limit no endpoint de consulta
- [x] Já existe `express-rate-limit` (v8, dependência nova em `package.json`) e um helper reutilizável: [`api/src/middlewares/rateLimit.ts`](../api/src/middlewares/rateLimit.ts) — `criarLimiter({ windowMs, max, message })`, que responde `429 TOO_MANY_REQUESTS` no envelope de erro padrão.
- [x] Aplicado em `POST /v1/consulta/sessao`: **30 tentativas por minuto por IP**.
- [ ] **Diferença para a issue:** o critério da #55 diz "a 6ª tentativa em menos de um minuto retorna 429" e pede limite **por IP e por matrícula tentada**. O que está no código é 30/min só por IP (valor escolhido pelo Henrique). Decidir: manter 30, baixar para 5, e se entra o limite por matrícula.
- [x] `POST /v1/auth/registro` (público) também usa o limitador: **10 tentativas por minuto por IP** (`registroLimiter`), porque as respostas 404/409 revelam quais matrículas existem.
- [ ] O "se sobrar tempo" da #55 (mesmo limite em `/v1/auth/login`) **não foi feito**. Dá para reaproveitar `criarLimiter`.

### #60 — API-16, endpoint e sessão de consulta pública
- [x] `POST /v1/consulta/sessao` já existe: recebe **só a matrícula** (campo `identificador`, 4 dígitos), valida contra `colaboradores` ativos e emite token `papel: 'consulta'` de 15 minutos.
- [x] **Mudou em relação ao texto da issue:** não existe mais "código de crachá". Só matrícula.
- [ ] **Falta (continua sendo sua):** `GET /v1/consulta/ferramentas` aceitando só o token de consulta (sem quem está com a ferramenta, histórico ou valores) e o teste de isolamento entre o token normal e o de consulta. Hoje só a rota `/sessao` existe.

## 2. Impacto direto em outras issues suas

- **#66 DATA-06 (`data:check`):** "colaborador duplicado por matrícula" deixou de ser possível (índice único + `CHECK`). Sugestões de checagens novas: matrícula fora do padrão `^(?!0000)\d{4}$`, `usuarios` sem colaborador ativo, colaborador inativo com conta ativa.
- **#63 DATA-03 (importação CSV):** qualquer CSV com colaboradores precisa de matrícula de **exatamente 4 dígitos numéricos** (`0001` a `9999`). O banco rejeita o resto (o `CHECK` faz o `INSERT` falhar). Ferramentas não mudaram.
- **#65 DATA-05 (auditoria em jsonb):** `usuarios` não tem mais `nome` nem `email`, só `colaborador_id`, `papel`, `ativo` e `senha_hash`. Snapshots de `usuarios` no `jsonb` terão esse formato (nunca gravar `senha_hash`). `auditoria.usuario_id` continua apontando para `usuarios.id`.
- **Seed:** 22 colaboradores (`0001`/`0002` são os dois usuários da manutenção; `0003` a `0022` são os demais) e 2 contas (`0001` e `0002`, senha `123456`).

## 3. Deploy (#58 INFRA-06 e #83 INFRA-11)

- [ ] **`TRUST_PROXY_HOPS=1`** no ambiente da API atrás de Nginx/Traefik. Sem isso o rate limit enxerga o IP do proxy e **todos os clientes dividem o mesmo limite de 30/min**. O Nginx precisa repassar `X-Forwarded-For`. Já está no `.env.example` e em [`docs/nuvem/dokploy.md`](nuvem/dokploy.md).
- [ ] **`JWT_EXPIRES_IN=7d`** (o Dokploy estava com `8h`; o `CLAUDE.md` e o front já assumem 7 dias).
- [ ] **Migration `0004_papel_admin_e_auto_cadastro.sql`** — antes de rodar em `soufer_prod`, conferir:
  - renomeia o enum `almoxarife` para **`manutencao`** e cria `admin`;
  - troca `usuarios.email` por `usuarios.colaborador_id` e remove `email` e `nome` de `usuarios`;
  - `colaboradores.matricula` vira `VARCHAR(4)` com `CHECK`;
  - **aborta com mensagem clara** se existir usuário que não seja um dos dois do seed, ou colaborador com matrícula que não dê para converter (só `MATnnn` é convertido, e vira `0nnn` deslocado em +2). Nesses casos é preciso ajustar os dados à mão antes;
  - exige o setor "Manutenção Geral" existente;
  - ordem no runner: a `0003_colaboradores_identificacao` (branch do API-09) roda antes da `0004`.
- [ ] `npm ci` na API por causa da dependência nova (`express-rate-limit`).
- [ ] Tokens antigos (papel `almoxarife`) recebem `401 TOKEN_OUTDATED`, então todo mundo precisa logar de novo depois do deploy.

## 4. Pontos de merge (conflitos prováveis)

Se a sua branch mexer nestes arquivos, resolver junto com a #150:
- `api/src/routes/v1/consultaRoutes.ts` (limiter e validação da matrícula) e `api/src/middlewares/rateLimit.ts` (novo).
- `api/src/app.ts` e `api/src/config/env.ts` (`trustProxyHops`), `api/.env.example`.
- `api/src/validators/authValidator.ts`, `api/src/services/authService.ts`, `api/src/middlewares/auth.ts`.
- `api/db/seed.sql` e as migrations (`0004` é a nova).

## 5. Como evitar retrabalho daqui para frente

- Ao pegar uma issue, olhar as **abertas do mesmo tema** (`gh issue list --search "<tema>"`) e este arquivo.
- Se algo já estiver feito, marcar aqui em vez de refazer; se o critério da issue divergir do código (como o "6ª tentativa" da #55), registrar a decisão neste arquivo.
