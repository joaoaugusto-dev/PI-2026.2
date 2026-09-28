# Decisões pendentes de formalização

Este arquivo registra decisões de arquitetura/regra de negócio que já foram
tomadas pelo time e implementadas no código, mas que ainda **não foram
propagadas para o `CLAUDE.md` raiz** (Seção 3 — Regras de negócio
inegociáveis). Ele existe para que a decisão não se perca entre a
implementação e a atualização formal do guia do projeto.

## Papel `admin` separado de `manutencao` (issue API-149)

**Contexto:** a issue API-149 (auto-cadastro de manutenção com aprovação)
deixava em aberto quem aprova um cadastro pendente: (a) qualquer `manutencao`
ativo, ou (b) um papel/flag de admin dedicado. Antes dessa decisão só existia
`'manutencao'` no enum `papel_usuario`.

**Decisão do time (22/09/2026):** opção (b) — foi criado um papel `admin`
separado no enum `papel_usuario`. Só um usuário com `papel = 'admin'` pode:

- Listar cadastros pendentes de aprovação (`GET /v1/usuarios?ativo=false`).
- Aprovar um cadastro pendente (`PATCH /v1/usuarios/:id/ativar`).

**O que já foi implementado (branch `feat/api-149-auto-cadastro-aprovacao`):**

- Migration `0004_papel_admin_e_auto_cadastro.sql` — adiciona `'admin'` ao
  enum `papel_usuario`, renomeia o valor `almoxarife` para `manutencao`,
  troca `usuarios.email` por `usuarios.colaborador_id` (a matrícula vive só em
  `colaboradores`, com `CHECK` de exatamente 4 dígitos, `0001` a `9999`) e
  remove `usuarios.nome`. Numerada `0004` porque a branch do API-09 já usa
  `0003_colaboradores_identificacao.sql`.
- `POST /v1/auth/registro` (por matrícula, valida contra `colaboradores`),
  `GET /v1/usuarios?ativo=false` e `PATCH /v1/usuarios/:id/ativar`, com
  testes em `authRegistro.test.ts`. A matrícula é única em
  `colaboradores.matricula` e a conta é única por `colaborador_id`.
- Documentação funcional do fluxo em `/docs/backend/arquitetura.md` (seção
  "Perfis" → "Admin" e "Auto-cadastro de manutenção (fluxo)").

**Atualização:** o seed (`db/seed.sql`) agora cria um usuário `admin` de teste
por padrão — colaborador `0053` ("Administrador do Sistema"), matrícula
`0053`, senha `123456` — para que o fluxo de aprovação funcione localmente
sem `UPDATE` manual no banco.

**O que falta (fora do escopo desta issue, quando o time decidir):**

- Não existe endpoint para promover um usuário existente a `admin` — hoje
  isso é feito com um `UPDATE` direto no banco. Se o time quiser uma rota
  para isso, precisa de uma nova issue (ver também "Fluxo de solicitação e
  criação de usuário e funções do admin", abaixo).

**Já resolvido:** a Regra 8 do `CLAUDE.md` raiz foi atualizada com o terceiro
perfil `admin` (commits `8210198` e `2e03b86`), então a decisão acima já está
formalizada como regra do projeto. Este arquivo continua útil para o histórico
da decisão e pode ser reduzido a um changelog.

## Fluxo de solicitação e criação de usuário e funções do admin

**Situação:** em aberto. O time ainda precisa decidir como será a solicitação
e a criação de novos usuários, quem poderá solicitar, quem aprovará e quais
funções o `admin` terá.

**Como funciona hoje (implementado na branch `feat/api-149-auto-cadastro-aprovacao`):**

- **Solicitação:** é um auto-cadastro público. A própria pessoa chama
  `POST /v1/auth/registro` com matrícula e senha, sem estar logada. A matrícula
  precisa existir em `colaboradores` (ativo) e ainda não ter conta. A conta
  nasce com papel `manutencao` e `ativo = false`, e não consegue entrar
  (`USER_INACTIVE`).
- **Aprovação:** só o `admin`, com `GET /v1/usuarios?ativo=false` (lista os
  pendentes) e `PATCH /v1/usuarios/:id/ativar`.
- **Manutenção:** não cria, aprova nem edita contas. Ela apenas cadastra
  colaboradores (`/v1/colaboradores`), o que na prática libera a matrícula
  para o auto-cadastro.
- **Admin:** não tem rota para criar usuário, trocar senha, desativar,
  alterar papel nem promover outro admin. Também não acessa as rotas de
  manutenção (ferramentas, colaboradores).
- **Quiosque:** não usa usuário. Qualquer colaborador ativo entra só com a
  matrícula (`POST /v1/consulta/sessao`, papel `consulta`, 15 minutos).

**A decidir:**

1. **Quem pode solicitar a criação de um usuário:** manter o auto-cadastro
   público (qualquer colaborador cadastrado), ou restringir (por exemplo, só
   a manutenção ou o admin solicita/cria a conta de outra pessoa)?
2. **Quem aprova:** manter só o `admin`, ou permitir também a manutenção
   aprovar (a opção (a) que a issue API-149 descartou)?
3. **Quais funções o `admin` terá:** hoje só listar e aprovar pendentes. Avaliar
   criar usuário, desativar/reativar, trocar senha, alterar papel, promover
   outro admin e ter (ou não) acesso às telas de manutenção.
4. **Papel na criação:** toda conta nova nasce `manutencao`; definir quem
   pode criar contas `admin`.

Qualquer que seja a resposta, a decisão precisa ser refletida na Regra 8 do
`CLAUDE.md`, em `/docs/backend/arquitetura.md` (seções "Perfis" e
"Auto-cadastro de manutenção (fluxo)") e na coleção do Insomnia.

## Proposta: interface de "Controle de acessos" para o admin

**Situação:** ideia, ainda não decidida nem planejada. Depende da decisão
sobre as funções do `admin` (seção anterior).

**Ideia:** uma tela do `admin` para administrar as contas de acesso sem
precisar mexer no banco. Funções cogitadas:

- **Gerenciar senhas:** trocar a senha de um usuário (por exemplo, quando a
  pessoa esquece).
- **Liberar usuário bloqueado:** liberar quem errou a senha muitas vezes e
  remover o limitador de tempo para esse usuário.
- **Adicionar novos usuários:** criar contas diretamente, sem depender do
  auto-cadastro.
- **Controlar quantos usuários existem:** listar todas as contas (ativas,
  pendentes e inativas) com contagem por papel e por status.
- **Outras (etc.):** ativar/desativar contas, alterar papel, promover admin e
  histórico de quem fez cada alteração (auditoria).

**Pontos técnicos a considerar antes de planejar:**

- **O bloqueio de hoje não é por usuário.** O limitador de login
  (`loginLimiter`, em `api/src/middlewares/rateLimit.ts`) é por IP: 10
  tentativas por minuto, guardadas em memória, e se libera sozinho depois de
  1 minuto (também some ao reiniciar a API). Não existe bloqueio por conta nem
  contador de tentativas no banco. "Liberar um usuário bloqueado" só faz
  sentido depois de definir esse bloqueio por usuário (por exemplo, colunas de
  tentativas falhas e bloqueado até, ou uma tabela própria), e liberar um
  limitador por IP exigiria trocar o armazenamento em memória por um
  compartilhado.
- **Troca de senha pelo admin:** definir se a senha é redefinida pelo admin
  (senha provisória com troca obrigatória no próximo acesso) e como isso é
  registrado na tabela `auditoria`.
- **Novas rotas:** hoje o `admin` só tem duas (`GET /v1/usuarios` e
  `PATCH /v1/usuarios/:id/ativar`). A tela exigiria novas rotas e issues,
  seguindo o versionamento `/v1` e a Regra 6 (o responsável pelo registro vem
  do JWT, nunca do corpo).
- **Front-end:** nova página protegida pelo papel `admin`, com o layout e a
  responsividade (360px, 768px e 1280px) do restante do sistema.

## Devolução de peça avulsa de kit não deixa o kit indisponível (issue API-12)

**Contexto:** a retirada (API-11) já aceita `itemKitId`, retirando só uma peça
avulsa de um kit sem mexer no status do kit inteiro (`fn_sync_status_ferramenta`
só sincroniza o status do container quando o registro é do kit inteiro,
`item_kit_id IS NULL`, porque o restante do kit continua disponível enquanto
uma peça está fora). A issue API-12 (devolução) não falava explicitamente
desse cenário, então coube decidir o que acontece quando essa peça volta com
avaria ou perda.

**Decisão (28/09/2026, aprovada por Henrique):** permitir a devolução da peça
avulsa e deixar os triggers existentes agirem como estão, sem criar uma
migration nova para esta issue:

- A ocorrência é aberta normalmente para a peça (`fn_abre_ocorrencia` não
  distingue kit inteiro de peça avulsa), herdando o colaborador do empréstimo.
- O status do kit **não muda** quando quem volta é só a peça: o container
  continua com o status que tinha antes (normalmente `disponivel`, com o
  restante das peças livre), mesmo que a peça devolvida tenha vindo com avaria
  ou perda.

**Limitação conhecida:** o schema atual não modela "peça indisponível"
isoladamente — só a ferramenta (kit ou peça simples) tem uma coluna de status.
Uma peça avariada não aparece como indisponível em lugar nenhum da API hoje;
só a ocorrência registra o que aconteceu com ela. Se o time decidir que isso
precisa aparecer (por exemplo, uma peça "fora de uso" dentro do kit), é uma
mudança de schema e entra como uma issue nova, não uma correção desta.
