# 🤝 Guia de Contribuição — SOUFER Tools (PI 2026.2)

Este documento orienta o fluxo de trabalho, convenções de branches, commits e processo de revisão de código da equipe.

---

## 🌳 Estrutura de Branches

Adotamos o seguinte fluxo de ramificação:

```
main (produção / entregas oficiais)
  └── develop (integração contínua)
        ├── feat/<area>-<id>-<slug>
        ├── fix/<area>-<id>-<slug>
        └── docs/<id>-<slug>
```

- **`main`**: Código estável e pronto para entregas oficiais. Protegida contra push direto.
- **`develop`**: Branch de integração onde as features finalizadas se encontram. Protegida contra push direto.
- **Branches de trabalho**: Criadas sempre a partir da `develop` atualizada.

### Padrão de Nomes de Branches:

Formato: `<tipo>/<area>-<id>-<slug-descritivo>`

| Prefixo | Finalidade | Exemplo |
|---|---|---|
| `feat/` | Nova funcionalidade ou tela | `feat/api-07-crud-ferramentas`, `feat/web-02-dashboard` |
| `fix/` | Correção de bug | `fix/api-05-validacao-jwt`, `fix/web-01-alinhamento-mobile` |
| `docs/` | Alteração puramente em documentação | `docs/doc-01-setup-repo`, `docs/db-02-der` |
| `chore/` | Configurações, dependências, scripts | `chore/db-04-setup-postgres` |
| `refactor/` | Refatoração de código sem mudar regra | `refactor/api-auth-middleware` |

---

## 📝 Convenção de Commits

Utilizamos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição no imperativo e minúsculo>

[corpo opcional explicando o motivo da mudança]

[rodapé com referência à issue, ex: Closes #12]
```

### Tipos permitidos:
- `feat`: nova funcionalidade para o usuário ou API
- `fix`: correção de um bug
- `docs`: alterações na documentação
- `style`: formatação, ponto e vírgula, sem alteração de código
- `refactor`: refatoração de código (nem feat nem fix)
- `test`: adição ou refatoração de testes
- `chore`: alterações em build, configs, dependências

### Exemplos:
- `feat(api-07): adicionar endpoint de listagem de ferramentas com paginação`
- `fix(web-02): ajustar quebra de layout no card de empréstimo em 360px`
- `docs(db-03): atualizar tipos no dicionario de dados`

---

## 🔄 Fluxo de Pull Request (PR)

1. **Atualize sua branch base** (`develop`) antes de abrir o PR.
2. Abra o Pull Request direcionando para `develop` (ou `main` apenas em releases de sprint).
3. O PR carregará automaticamente o template padrão (`.github/pull_request_template.md`).
4. Preencha todos os campos: descrição, como testar, evidências visuais/testes e marque o checklist do **Definition of Done (DoD)**.
5. Solicite a revisão de pelo menos **1 integrante** da equipe.
6. Após aprovação e checks verdes, realize o **Squash and Merge**.

---

## ✅ Definition of Done (DoD) Obrigatório

Antes de qualquer PR ser aprovado e mergeado, todos os itens abaixo devem ser garantidos:

1. [ ] **Revisão:** Código revisado e aprovado por pelo menos um colega da equipe.
2. [ ] **Limpeza & Segurança:** Nenhum `console.log`, arquivo temporário ou segredo/chave (`.env`) commitado.
3. [ ] **Responsividade (Front):** Telas validadas rigorosamente em **360px**, **768px** e **1280px**.
4. [ ] **Qualidade de API (Back):** Rotas testadas no Insomnia/Swagger (cenários de sucesso e erro).
5. [ ] **Documentação Atualizada:** `/docs/arquitetura.md`, README, dicionário de dados ou diagramas atualizados.
6. [ ] **Rastreabilidade:** Commits e PR referenciam o ID da issue correspondente. Se o PR conclui a issue, a descrição do PR deve incluir `Closes #<número>` (ou `Fixes #<número>`) para que o GitHub feche a issue automaticamente no merge.
