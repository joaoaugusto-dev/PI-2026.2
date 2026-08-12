# Guia de Contribuição

## Fluxo de trabalho

1. Nunca commite diretamente na `main`. Toda mudança entra via Pull Request.
2. Crie uma branch a partir da `main` atualizada.
3. Abra um PR cedo (pode ser rascunho) para facilitar acompanhamento.
4. Peça revisão de pelo menos 1 integrante antes do merge.
5. Use "Squash and merge" para manter o histórico da `main` limpo.

## Convenção de branches

Formato: `tipo/descricao-curta`

| Tipo | Uso |
|------|-----|
| `feature/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `chore/` | Manutenção, configs, dependências |
| `docs/` | Documentação |
| `refactor/` | Refatoração sem mudança de comportamento |

Exemplos: `feature/login-usuario`, `fix/erro-cadastro`, `docs/atualizar-readme`

## Convenção de commits

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(escopo opcional): descrição curta no imperativo

corpo opcional explicando o porquê
```

Tipos comuns: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Exemplos:
- `feat(auth): adicionar login com email e senha`
- `fix(cadastro): corrigir validação de CPF`
- `docs: atualizar instruções de instalação`

## Pull Requests

- Título claro descrevendo a mudança.
- Preencha o template de PR (descrição, como testar, checklist).
- Vincule a issue relacionada com `Closes #<numero>`, se houver.
- Mantenha PRs pequenos e focados em uma única mudança quando possível.

## Issues

- Use os templates de bug report ou feature request.
- Descreva o contexto suficiente para outra pessoa entender e agir sem precisar perguntar.

## Revisão de código

- Revisores devem checar: corretude, legibilidade, e se a mudança resolve o problema descrito.
- Comentários devem ser construtivos; sugira alternativas quando discordar.
- O autor do PR resolve os comentários e solicita nova revisão se necessário.
