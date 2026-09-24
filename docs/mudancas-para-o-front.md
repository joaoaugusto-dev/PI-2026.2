# Mudanças do back que afetam o front

Lista rápida para o João revisar. Vale para as issues #150 (login por matrícula) e #149 (auto-cadastro). Status: `[ ]` back ainda vai fazer, `[x]` já no código.

## 1. Login por matrícula (sem e-mail) — #150

- [x] `POST /v1/auth/login` recebe `{ "matricula": "0001", "senha": "123456" }` (antes: `email`).
- [x] O objeto `usuario` (no login e em `GET /v1/auth/me`) traz `matricula` no lugar de `email`.
- [x] O JWT também carrega `matricula` em vez de `email`.
- [x] Erro de credencial continua `401 INVALID_CREDENTIALS`; a mensagem passa a ser "Matrícula ou senha inválidos".
- **No front:** trocar o campo do login para matrícula, o tipo `Usuario` em `web/src/lib/auth.tsx` (`email` → `matricula`) e a função `login(matricula, senha)`.
- O front "já trocado" **não está em nenhuma branch nem PR do GitHub** (conferido em 24/09/2026): `main`, `develop`-like e todas as `feat/*`/`fix/*` ainda têm e-mail em `LoginPage.tsx` e `auth.tsx`, e a `CadastroPage` não existe. Deve estar só na sua máquina: **faça push da troca** para o back poder ser testado com ela. O que precisa mudar está em [7. Teste de ponta a ponta](#7-teste-de-ponta-a-ponta-24092026).

## 2. Regra da matrícula

- Exatamente **4 dígitos numéricos**, de `0001` a `9999`. Sem letras, sem espaços.
- Vale para o login **e** para o cadastro de colaborador (`colaboradores.matricula`).
- **No front:** validar `^\d{4}$` (e rejeitar `0000`) nos formulários de login, cadastro e cadastro rápido de colaborador. Usar `inputMode="numeric"` e `maxLength={4}`.
- O back devolve `400` (`VALIDATION_ERROR`) com `details` por campo quando a matrícula é inválida.
- Colaborador desativado (`ativo = false`) perde o login: `401 USER_INACTIVE`, e o token em uso deixa de valer na próxima requisição.

## 2.1 Quiosque (modo consulta) — só matrícula

- `POST /v1/consulta/sessao` continua recebendo `{ "identificador": "0003" }`, agora com a **matrícula de 4 dígitos** (o crachá deixou de existir; só matrícula). Sem senha.
- Matrícula fora do padrão: `400 VALIDATION_ERROR` (antes ia direto para a busca e dava 404). Matrícula sem colaborador ativo: `404 COLABORADOR_NOT_FOUND`.
- **Novo:** limite de 30 tentativas por minuto por IP. Acima disso: `429 TOO_MANY_REQUESTS`. O front deve tratar o 429 com uma mensagem clara ("aguarde um minuto").
- **No front:** nos textos e placeholders, trocar "matrícula, crachá ou nome" por "matrícula ou nome" (ex.: `RetiradaPage.tsx`).

## 3. Nome do papel: `almoxarife` → `manutencao`

- Quem disponibiliza as ferramentas é a **manutenção**, não o almoxarifado.
- O valor do papel na API é agora `manutencao` (e `admin` para quem aprova cadastros).
- **No front:** trocar qualquer comparação com `'almoxarife'` por `'manutencao'`. Procurar `almoxarife` no código.
- Textos de tela: nada de "almoxarife" ou "almoxarifado", usar "manutenção" (ex.: "Manutenção central · Fábrica 1" no `DashboardPage`, "Manutenção · Turno A" no `CabecalhoApp`; já ajustados em `web/src`).

## 4. Usuários de teste (seed)

| Matrícula | Nome | Senha |
|---|---|---|
| `0001` | Manutenção Principal | `123456` |
| `0002` | Manutenção Suporte | `123456` |

- A matrícula é a identidade da pessoa e vive em `colaboradores`; `0001` e `0002` são os dois usuários da manutenção. Os outros 20 colaboradores passam de `MAT001…MAT020` para `0003…0022`.
- **No front:** atualizar dados de exemplo, mocks e placeholders que usem `MATxxx` ou e-mail.

## 5. Auto-cadastro com aprovação — #149

- [x] `POST /v1/auth/registro` recebe `{ "matricula": "0003", "senha": "123456" }` (só matrícula e senha; o **nome vem do cadastro do colaborador**, não mande `nome`). Cria a conta **inativa**, sem token, e responde 201 com `{ id, nome, matricula, papel: "manutencao", ativo: false }`.
- [x] A matrícula precisa ser de um colaborador **ativo** que **ainda não tem conta**. Erros: `404 COLABORADOR_NOT_FOUND`, `409 MATRICULA_JA_CADASTRADA`, `400 VALIDATION_ERROR` (matrícula fora do padrão ou senha com menos de 6 caracteres) e `429 TOO_MANY_REQUESTS` (mais de 10 tentativas por minuto por IP).
- [x] Depois do cadastro, o login retorna `401 USER_INACTIVE` até um `admin` aprovar. A mensagem para o usuário pode ser "Cadastro enviado, aguarde a aprovação".
- [x] Papel `admin`: `GET /v1/usuarios?ativo=false` lista pendentes (`{ id, nome, matricula, papel, ativo, created_at, updated_at }`, paginado) e `PATCH /v1/usuarios/:id/ativar` aprova (`403` se não for admin, `404` se não existe, `409 USUARIO_JA_ATIVO`).
- **No front:** a `CadastroPage` (não existe no repositório) e a tela de aprovação do admin ainda precisam ser feitas; não há como promover alguém a admin pela API (hoje é `UPDATE` no banco, e o seed não cria admin).

## 6. Ainda em aberto (pode mudar o contrato)

- Decidido e implementado: uma pessoa, uma matrícula. A conta (`usuarios`) aponta para o colaborador, e o registro só aceita matrícula de colaborador ativo já cadastrado.
- Decidido e implementado: colaborador desativado perde o login (`401 USER_INACTIVE`).
- Como promover alguém a admin (hoje só por `UPDATE` no banco) e se o seed cria um admin de teste.

## 6.1 Onde isso bate no front atual (arquivos)

Conferido em `web/src` nesta branch. Marque `[x]` quando resolvido.

- [ ] **`lib/auth.tsx` — tipo `Usuario`:** `email: string` vira `matricula: string`; `login(email, senha)` vira `login(matricula, senha)` e o `api.post('/auth/login', ...)` envia `{ matricula, senha }`.
- [ ] **`lib/auth.tsx` — sessão já salva no navegador (importante):** a sessão persiste 7 dias em `localStorage` (`soufer:sessao`) com o `usuario` antigo (tem `email`, não tem `matricula`). O token antigo continua válido na API, então quem estava logado entra com um `usuario` desatualizado. Duas saídas, escolher uma: (a) trocar a chave para `soufer:sessao:v2`, forçando um novo login; ou (b) ao restaurar a sessão, chamar `GET /v1/auth/me` e sobrescrever o `usuario`.
- [ ] **`pages/LoginPage.tsx`:** campo e-mail → matrícula (`inputMode="numeric"`, `maxLength={4}`, validação `^\d{4}$` sem `0000`), rótulo "Matrícula", mensagem de erro "Matrícula ou senha inválidos." A mensagem para conta desativada é outra: `401 USER_INACTIVE` ("Usuário inativo. Contate o administrador.").
- [ ] **`components/fluxo/CadastroRapidoColaborador.tsx`:** hoje só exige matrícula não vazia. Passar a validar 4 dígitos numéricos, senão a API devolve `400`.
- [ ] **`pages/RetiradaPage.tsx`:** textos "Informe matrícula, crachá ou nome" e "Matrícula, crachá ou nome" → sem "crachá".
- [ ] **Dados de exemplo (mocks):** as matrículas do front (`4412`, `6620`, `2874`, ...) já têm 4 dígitos, mas **não existem no banco**. Ao integrar com a API, o seed tem colaboradores `0003` a `0022` e usuários `0001`/`0002`. Para testar o login e o quiosque, usar essas.
- [ ] **Perfis:** o `papel` que a API devolve é `manutencao` ou `admin` (quiosque: `consulta`). Hoje `RotaProtegida` não olha o papel; se algum dia olhar, usar esses valores.

## 6.2 Contrato de erros que o front precisa tratar

| Situação | Status | `error.code` |
|---|---|---|
| Matrícula ou senha errada | 401 | `INVALID_CREDENTIALS` |
| Conta desativada (ou colaborador desativado), no login **ou** no meio da sessão | 401 | `USER_INACTIVE` |
| Token antigo, emitido antes do rename do papel (`almoxarife`) | 401 | `TOKEN_OUTDATED` |
| Matrícula fora do padrão de 4 dígitos | 400 | `VALIDATION_ERROR` (`details[].field = "matricula"`; no quiosque o campo é `identificador`) |
| Quiosque: matrícula sem colaborador ativo | 404 | `COLABORADOR_NOT_FOUND` |
| Quiosque: mais de 30 tentativas por minuto por IP | 429 | `TOO_MANY_REQUESTS` |

Formato do `GET /v1/auth/me`: `{ data: { usuario: { id, nome, papel, matricula } } }` (sem `email`). O `nome` vem do cadastro do colaborador.

## 7. Teste de ponta a ponta (24/09/2026)

Testei o login no navegador (Chrome headless) contra a API local (`soufer_dev`, seed atual), usando uma **cópia temporária** do `web/` fora do repositório. Nada foi alterado no `web/` do projeto.

| Cenário | Resultado |
|---|---|
| Front **atual** (e-mail) contra a API nova | `POST /auth/login` com `{ email, senha }` devolve **400**; a tela mostra "E-mail ou senha inválidos." Não loga. |
| Front com a troca mínima abaixo, `0001` / `123456` | `POST` com `{ matricula, senha }` devolve **200**, vai para o Dashboard e salva `usuario = { id, nome: "Manutenção Principal", matricula: "0001", papel: "manutencao" }` no `localStorage` |
| Senha errada | 401 "Matrícula ou senha inválidos." |
| Matrícula `ABCD` | Barrada no próprio formulário (nem chama a API): "Informe a matrícula com 4 dígitos" |

### Troca mínima que fez o login funcionar

`web/src/lib/auth.tsx`:
- `Usuario`: `email: string` -> `matricula: string`
- `login: (matricula: string, senha: string) => Promise<void>`
- `api.post('/auth/login', { matricula, senha })`

`web/src/pages/LoginPage.tsx`:
- schema: `matricula: z.string().regex(/^(?!0000)\d{4}$/, 'Informe a matrícula com 4 dígitos')` (no lugar de `z.email(...)`)
- `login(dados.matricula, dados.senha)` e mensagem "Matrícula ou senha inválidos."
- campo: `id="matricula"`, rótulo "Matrícula", `inputMode="numeric"`, `maxLength={4}` (sem `type="email"`), e `register('matricula')`/`errors.matricula`

> **Atenção:** o comentário do João na issue #150 fala em `z.string().length(4)`. Isso aceita letras (`ABCD`). A regra do time é **só dígitos, de `0001` a `9999`**, então use o regex acima (ou `.regex(/^\d{4}$/)`). O back rejeita letras e `0000` com 400 de qualquer forma.

### Dois problemas que apareceram e o front precisa tratar

1. **Sessão antiga no navegador.** Quem estava logado antes tem no `localStorage` (`soufer:sessao`) um token de 7 dias com `papel: "almoxarife"` e `email`. O back agora responde **`401 TOKEN_OUTDATED`** ("Sessão de uma versão anterior. Faça login novamente.") para esses tokens. Mas o front **não percebe**: ao restaurar a sessão ele não chama a API (o Dashboard usa dados de exemplo), então continua "logado" com o usuário antigo até alguma chamada real dar 401 (aí o `setHandler401` desloga). Solução, escolher uma:
   - trocar a chave para `soufer:sessao:v2` (descarta sessões antigas), **ou**
   - ao restaurar, chamar `GET /v1/auth/me` e, se falhar, deslogar; se passar, usar o `usuario` retornado.
2. **Nome no cabeçalho é fixo.** `CabecalhoApp.tsx` mostra "Marcos Andrade" escrito no código, não o `usuario` logado. Com o login real, o cabeçalho deveria usar `usuario.nome` (e `usuario.matricula`, se quiser exibir).

### O que ainda falta para fechar a #150
- Push da troca do front (item 1 acima) e refazer este teste com ela.
- `CadastroPage` (auto-cadastro, #149): não existe no repositório; o contrato do registro por matrícula já está implementado no back (seção 5).

Atualizar este arquivo a cada decisão nova.
