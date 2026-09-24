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

**O que falta (fora do escopo desta issue, quando o time decidir):**

- Não existe endpoint para promover um usuário existente a `admin` — hoje
  isso é feito com um `UPDATE` direto no banco. Se o time quiser uma rota
  para isso, precisa de uma nova issue.
- Nenhum usuário `admin` é criado por padrão no seed (`db/seed.sql`) — quem
  for rodar o fluxo localmente precisa inserir um manualmente até o time
  decidir se isso entra no seed.
- **Atualizar o `CLAUDE.md` raiz (Seção 3 — Regras de negócio
  inegociáveis)** com esta decisão como regra formal do projeto, incluindo o
  ajuste da Regra 8 ("Apenas dois perfis: `manutencao` e `consulta`") para
  refletir o novo terceiro perfil `admin`. Essa edição foi deixada de fora
  desta issue a pedido do time — quem for atualizar o `CLAUDE.md` deve copiar
  o essencial deste documento para lá e então este arquivo pode ser removido
  ou reduzido a um changelog.
