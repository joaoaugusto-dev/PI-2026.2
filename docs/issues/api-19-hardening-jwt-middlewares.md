# API-19 — Hardening do JWT e dos middlewares (registro de execução)

Issue: [#78](https://github.com/joaoaugusto-dev/PI-2026.2/issues/78)
Responsável na issue: Guilherme Portilho da Rosa Santi (@TGuiDev); executada por Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-03 e API-16 (concluídas)
Branch: `feat/api-19-teste-varredura-rotas`
Última atualização: 24/10/2026

## Objetivo

Revisão final de segurança da autenticação antes do code freeze: conferir os prazos dos tokens, garantir que
toda rota sensível passa por `authenticate` e `authorize(...)` e provar, com testes de invasão simulada, que o
sistema bloqueia certo. A parte "se sobrar tempo" (segredos esquecidos no código) também foi feita.

## Situação antes desta entrega

O básico já funcionava: `authenticate` com 401 por token ausente, inválido ou vencido, revalidação de `ativo` a
cada requisição, `authorize` por perfil e token de consulta de 15 minutos. Faltavam:

- um teste que garantisse isso em **todas** as rotas (os testes anteriores cobriam rotas escolhidas à mão, e uma
  rota nova sem proteção passaria despercebida);
- `GET /v1/opcoes` só passava por `authenticate`: o token do quiosque conseguia ler setores, categorias e atividades;
- o JWT era verificado sem fixar o algoritmo, e o token da sessão de balcão e o do quiosque se distinguiam só pelo
  campo `papel` do payload;
- só `NODE_ENV=production` era protegido contra o segredo JWT e a senha do banco de exemplo: um deploy com
  `NODE_ENV` esquecido subiria assinando token com a chave que está no repositório;
- o `db:seed` (contas com senha `123456`) só bloqueava a string exata `production`.

## Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| `GET /v1/opcoes` exige `manutencao` ou `admin` (403 para consulta) | O quiosque só usa `POST /consulta/sessao` e `GET /consulta/ferramentas`; o front nunca chamou `/opcoes` com esse token. |
| `GET /v1/auth/me` continua só com `authenticate`, de propósito | Devolve apenas os dados do próprio usuário do token; não há o que restringir por perfil. Está na lista de exceções do teste de varredura e documentada no código e no Swagger. |
| Algoritmo fixo em `HS256` na assinatura e na verificação | Fecha `alg: none` e a troca de algoritmo, sem custo. |
| `audience` nos tokens: `soufer-sessao` (manutenção/admin) e `soufer-consulta` (quiosque) | Separa os dois tokens por construção, e não só pelo `papel`. Não adotei `issuer`: só há um emissor, então não acrescenta nada. |
| Token sem `aud` responde 401 `TOKEN_OUTDATED`; `aud` que não bate com o papel responde 401 `TOKEN_INVALID` | Mesmo tratamento já usado para o papel antigo `almoxarife`: o front trata qualquer 401 como logout e pede novo login. |
| Assinar e verificar num módulo só (`utils/tokenJwt.ts`) | Algoritmo e audience nunca divergem entre quem emite (`authService`) e quem confere (`authenticate`). |
| Segredo JWT e senha do banco padrão só com `NODE_ENV=development` ou `test`, escritos assim | `production`, `staging`, valor vazio, ausente ou com erro de digitação passam a exigir `JWT_SECRET` (32+ caracteres) e `DB_PASSWORD` reais. Não obriguei `NODE_ENV` a existir: um ambiente sem ele sobe, desde que tenha segredos de verdade. |
| `db:seed` só roda com `NODE_ENV=development` ou `test` | Mesma regra: o seed cria contas admin com senha `123456`. |
| Textos de exemplo do `dokploy.md` entram na lista de segredos recusados | `gere_uma_chave_jwt_secreta_longa_e_aleatoria_aqui` tem 49 caracteres e passaria na checagem de tamanho. |
| Prazos mantidos: 7 dias (balcão) e 15 minutos (quiosque) | Ver a revisão da expiração abaixo. |

## O que foi feito

### API
- [`utils/tokenJwt.ts`](../../api/src/utils/tokenJwt.ts) (novo): `assinarToken`, `decodificarToken`, constantes de algoritmo e audience.
- [`middlewares/auth.ts`](../../api/src/middlewares/auth.ts): verificação com algoritmo fixo e conferência do `aud` contra o papel.
- [`services/authService.ts`](../../api/src/services/authService.ts): os três pontos que emitem token (login, link de convite e sessão de consulta) usam `assinarToken`.
- [`routes/v1/opcoesRoutes.ts`](../../api/src/routes/v1/opcoesRoutes.ts): `authorize('manutencao', 'admin')` e resposta 403 no Swagger.
- [`routes/v1/authRoutes.ts`](../../api/src/routes/v1/authRoutes.ts): comentário e descrição do Swagger explicando por que `/auth/me` é aberta a todo perfil autenticado.
- [`config/env.ts`](../../api/src/config/env.ts): segredos padrão só em `development`/`test`, mensagem de erro que diz qual `NODE_ENV` foi lido, lista de segredos recusados ampliada e `env.ambienteLocal`.
- [`scripts/seed.ts`](../../api/scripts/seed.ts): guarda por `env.ambienteLocal`.
- `.env.example`, [`api/README.md`](../../api/README.md) e [`docs/nuvem/dokploy.md`](../nuvem/dokploy.md): `NODE_ENV` documentado e obrigatório em todo ambiente do Dokploy.

### Testes (suíte completa da API ao fim da issue: 47 arquivos, 758 testes passando)
- [`segurancaRotas.test.ts`](../../api/src/tests/segurancaRotas.test.ts): lê o roteador do Express e, para as 77 rotas de `/v1`
  (8 públicas, 69 protegidas):
  - toda rota fora da lista explícita de públicas precisa ter `authenticate` na cadeia;
  - sem token: 401 `TOKEN_NOT_PROVIDED`; token vencido de manutenção e de consulta: 401 `TOKEN_EXPIRED`;
  - token de consulta: 403 `ACCESS_DENIED`, exceto `GET /consulta/ferramentas` (rota do quiosque) e `GET /auth/me`;
  - as listas de exceções não podem ficar velhas (cada entrada precisa existir no roteador) e a leitura da árvore
    não pode passar vazia.
- [`invasaoSimuladaJwt.test.ts`](../../api/src/tests/invasaoSimuladaJwt.test.ts): os dois cenários do "pronto quando".
  Consulta em `GET /v1/ferramentas`, `POST /v1/emprestimos` e `GET /v1/auditoria` devolve 403; token vencido de
  manutenção, admin e consulta devolve 401 `TOKEN_EXPIRED`.
- [`jwtHardening.test.ts`](../../api/src/tests/jwtHardening.test.ts): token `alg: none`, token HS512 com o segredo e o `aud` certos,
  segredo errado, `aud` trocado entre sessão e consulta (nos dois sentidos), token sem `aud` e `aud` desconhecido;
  tokens emitidos por `/consulta/sessao` saem com `HS256`, `aud` de consulta e 15 minutos.
- [`envSegredos.test.ts`](../../api/src/tests/envSegredos.test.ts): reimporta o `env.ts` com o ambiente montado e confere as
  recusas e os padrões de desenvolvimento, inclusive os textos de exemplo e o `ambienteLocal`.
- [`jwtExpiracao.test.ts`](../../api/src/tests/jwtExpiracao.test.ts) e `conviteAcesso.test.ts`: o `exp` dos tokens emitidos.
- `opcoes.test.ts`: 403 para consulta e 200 para admin.
- Os 27 arquivos de teste que assinavam token na mão passaram a usar `assinarToken` (sem isso todos receberiam `TOKEN_OUTDATED`).
- Verificação de que o teste de varredura pega o erro: ao tirar `authenticate` e `authorize` de `GET /v1/dashboard`, 5 casos falharam.

## Revisão da expiração dos tokens (passo 1 da issue)

### Conclusão

Os dois prazos estão corretos e coerentes com a regra de negócio 8 do `CLAUDE.md`. Nenhum foi alterado.

| Token | Quem usa | Validade | Configuração | Onde é emitido |
|---|---|---|---|---|
| Sessão de balcão | `manutencao` e `admin` | 7 dias | `JWT_EXPIRES_IN` (padrão `7d`) | `POST /v1/auth/login` e `POST /v1/auth/convites/:token/senha` |
| Sessão do quiosque | `consulta` | 15 minutos | `JWT_CONSULTA_EXPIRES_IN` (padrão `15m`) | `POST /v1/consulta/sessao` |

### Por que 7 dias na sessão de balcão

A sessão é persistida no front (FE-07) e o prazo foi ajustado de 8 h por turno para 7 dias justamente
para evitar login diário na manutenção. O risco é compensado por duas travas que já existiam:

- o `authenticate` revalida `ativo` (da conta e do colaborador) no banco a **cada requisição**: um
  usuário desativado perde o acesso na próxima chamada, não só no próximo login;
- o token de consulta, que não passa por essa revalidação, vale apenas 15 minutos e não abre nenhuma
  rota de balcão (403 em todas, comprovado pela varredura de rotas).

### Riscos aceitos, a revisar se o produto mudar

1. **Não há revogação de token no servidor.** Um token de balcão roubado vale até os 7 dias, a menos que
   o usuário seja desativado. Não existe "sair de todos os dispositivos" nem troca de senha que
   invalide sessões abertas.
2. **O papel vem do token, não do banco.** A revalidação lê só `ativo`, nome e matrícula. Hoje nenhum
   fluxo da API rebaixa um papel (o único `UPDATE` de papel é o `db:admin`, que promove a `admin`), então
   não há como um admin ser rebaixado dentro da janela de 7 dias. Se um dia houver essa tela, o
   `authenticate` precisa passar a ler `papel` do banco.

## Revisão de segredos hardcoded ("se sobrar tempo")

Busca manual (o `gitleaks` não estava disponível e o Docker estava parado), sobre todas as refs do histórico
do git (885 commits) e sobre os 522 arquivos versionados: chaves de nuvem e de serviços, chaves privadas,
tokens do GitHub e do Slack, JWT reais, URLs com credencial, atribuições de `secret`/`password`/`token`, IPs e domínios.

**Resultado: nenhum segredo real versionado.**

- Nenhum `.env` jamais foi commitado: no histórico só entraram `api/.env.example` e `web/.env.example`, com valores vazios; o `.gitignore` cobre `.env` e `.env.*`.
- Os "tokens" dos docs e das coleções do Insomnia são de mentira (`eyJ...` truncado, `token.invalido.123`); as coleções usam `localhost`.
- O front não tem chave nem URL fixa (a API vem de `VITE_API_URL`).
- Pontos que não são vazamento, apenas registrados: a senha de desenvolvimento `123456` e o hash bcrypt dela em `api/db/seed.sql` e no `seed.ts` (o seed agora só roda em `development`/`test`) e PINs de teste de 6 dígitos em `docs/testes/auditoria-2026-10-09/scripts/` (ambiente local efêmero).
- Achado corrigido: o texto de exemplo do `dokploy.md` passaria na validação do `env.ts` (ver decisões).

Limitação: a varredura procurou os padrões acima; não substitui uma ferramenta dedicada. Se a equipe quiser uma
segunda passada, basta rodar o `gitleaks` pela imagem oficial com o Docker ligado.

## Como verificar

1. `cd api && npx vitest run src/tests/segurancaRotas src/tests/invasaoSimuladaJwt src/tests/jwtHardening src/tests/envSegredos src/tests/jwtExpiracao`.
2. Suíte completa: `cd api && npx vitest run` e `npx tsc --noEmit`.
3. No Insomnia: importar [`soufer-tools-seguranca.json`](../insomnia/soufer-tools-seguranca.json) e seguir o
   [`teste-api-seguranca.md`](../insomnia/teste-api-seguranca.md).
4. Conferir a regra de ambiente: `NODE_ENV=staging npm start` sem `JWT_SECRET` deve recusar subir com a mensagem do `env.ts`.

## Atenção no deploy

- **Todas as sessões de 7 dias já emitidas deixam de valer** (token sem `aud` dá 401 `TOKEN_OUTDATED`) e todo usuário
  precisa fazer login de novo. O front já trata qualquer 401 como logout. Faça o deploy antes dos ensaios da apresentação.
- Todo ambiente do Dokploy (inclusive o de desenvolvimento) precisa de `NODE_ENV` e, fora de `development`/`test`, de `JWT_SECRET`
  (32+ caracteres) e `DB_PASSWORD` próprios, senão a API recusa subir. Um ambiente publicado com `NODE_ENV=development`
  continua aceitando os segredos padrão do repositório: use segredos reais também ali.

## Limitações conhecidas

- Os dois riscos aceitos da revisão da expiração (sem revogação no servidor; papel lido do token).
- As fotos em `/v1/uploads` são públicas de propósito (nomes com UUID, ver `docs/backend/arquitetura.md`) e ficam fora da varredura de rotas, que cobre só o roteador `/v1`.
- Os limites de tentativa (login e sessão de consulta) ficam na memória de cada processo; em PM2 cluster o limite efetivo multiplica pelo número de instâncias.

## Se sobrar tempo (fora do escopo)

- Revogação de sessão no servidor (lista de tokens revogados ou `token_version` na tabela `usuarios`), junto com a leitura do `papel` do banco.
- `GET /v1/auth/me` não é usada pelo front hoje; avaliar em `docs/rotas-candidatas-a-remocao.md`.
- Segunda passada de segredos com `gitleaks` no CI.
