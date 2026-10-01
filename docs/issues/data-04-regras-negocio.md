# DATA-04 — Regras de negócio documentadas (registro de execução)

Issue: [#64 — DATA-04 — Regras de negócio documentadas](https://github.com/joaoaugusto-dev/PI-2026.2/issues/64)
Responsável: Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-11, API-12 (concluídas)
Milestone: Sprint 7
Data da execução: 01/10/2026
Branch: `docs/data-04-regras-negocio` (criada a partir da `development`)
PR: (preencher após abrir)

## Objetivo

Documento único explicando cada regra automática do sistema, pedido como
evidência pelo prof. Max: para cada uma das 10 regras da Seção 3 do
`CLAUDE.md`, onde está implementada, o que acontece se for violada, e um
exemplo real.

## Decisões tomadas antes de implementar

Antes de escrever o documento, levantei evidências de código para cada uma
das 10 regras (migrations, validators, services, testes) e encontrei dois
pontos em que o texto da Seção 3 divergia do comportamento real do sistema.
Resolvi os dois com o time antes de fechar a issue:

- **Regra 7 (código de patrimônio):** o texto diz "`SF` + 6 dígitos", mas o
  código gera um `codigo_identificacao` de 4 dígitos (1-9999), sem prefixo,
  via `fn_gera_codigo_identificacao`. Decisão: documentar o comportamento
  real, com uma nota explícita de divergência — a regra já está marcada como
  "em revisão" no `CLAUDE.md` (pendente de ata sobre scanner vs. lápis
  elétrico), então não fazia sentido inventar uma implementação nova só para
  o texto bater com o documento.
- **Regra 8 (perfis):** o texto (atualizado em 30/09/2026) diz que o `admin`
  "lê e cadastra" Atividades, mas `atividadeRoutes.ts` autorizava só
  `manutencao` em todas as rotas — um `admin` recebia 403 até para listar
  atividades. Decisão: corrigir o código agora (não só documentar a
  divergência), já que a regra já tinha sido decidida pelo time e só não
  tinha sido implementada. `PUT`/`PATCH`/`DELETE` de atividades continuam
  exclusivos de `manutencao` (o texto não menciona o admin editando ou
  inativando atividades, só lendo e cadastrando).

## O que foi feito

- **Correção de código (Regra 8):** `api/src/routes/v1/atividadeRoutes.ts` —
  adicionado `admin` ao `authorize(...)` de `GET /atividades`,
  `GET /atividades/:id` e `POST /atividades`. `PUT`/`PATCH`/`DELETE`
  continuam só de `manutencao`. Dois testes novos em
  `api/src/tests/permissoesCadastros.test.ts`: manutenção mantém acesso
  completo; admin lê/cadastra mas recebe 403 ao editar/inativar.
- **Documento principal:** `/docs/regras-negocio.md`, cobrindo as 10 regras.
  Para as regras 1-9 (técnicas): local de implementação com `arquivo:linha`
  (migration, trigger, validator ou service), o efeito HTTP/banco da
  violação, e um exemplo real extraído de um teste existente. A regra 10
  (institucional do curso) foi documentada como "sem implementação técnica",
  sem forçar um exemplo de código que não existe.
- **Duas lacunas de teste encontradas e registradas no documento** (sem
  corrigir nesta issue, por estarem fora do escopo de "documentar"):
  - Regra 7: a correção de concorrência na geração de código
    (`0005_corrige_concorrencia_codigo_identificacao.sql`) foi validada só
    por um teste de estresse manual durante a API-13, não por um teste
    automatizado permanente na suíte.
  - Regra 9: o caminho de fallback (`BrasilAPI` indisponível →
    sábado/domingo) existe e está implementado, mas não há teste que force a
    falha de rede para exercitá-lo.
- **Bônus "se sobrar tempo":** diagrama de estados da ferramenta (Mermaid),
  inserido no documento principal logo após a Regra 3 — as quatro
  transições reais (retirada, devolução ok, devolução avaria/perda,
  disponibilizar), com nota sobre a exceção dos kits (peça avulsa não muda o
  status do container).

## Testes

- Vitest + Supertest, suíte completa: **281 testes, 24 arquivos, todos
  passando**, rodada antes e depois da correção de autorização em
  atividades e depois de cada revisão do documento.
- Cada citação de `arquivo:linha` do documento principal foi conferida
  manualmente contra o código real antes do commit final (uma citação errada
  foi encontrada e corrigida — ver "Pendências e observações").

## Documentação atualizada

- `/docs/regras-negocio.md`, novo — o entregável principal da issue.
- `api/src/routes/v1/atividadeRoutes.ts`: comentário explicando a regra
  própria de permissões de atividades (diferente dos outros cadastros
  auxiliares).
- Este arquivo (`docs/issues/data-04-regras-negocio.md`), novo.

## Pendências e observações

- Uma citação do primeiro rascunho do documento (exemplo da Regra 7) afirmava
  que um teste cobria o reaproveitamento de código após a baixa de uma
  ferramenta — não existe esse teste na suíte. Corrigido antes de abrir a PR,
  citando o que o teste realmente exercita.
- As duas lacunas de teste encontradas (Regra 7: concorrência sem teste
  automatizado permanente; Regra 9: fallback sem teste que force a falha de
  rede) ficam registradas no documento principal como itens para uma issue
  de testes futura — não fazem parte do "pronto quando" desta issue, que
  pede documentação, não cobertura de teste adicional.
- Nada ficou pendente do escopo da issue: as 10 regras estão documentadas,
  cada uma com exemplo real verificado, e o bônus do diagrama foi incluído.
