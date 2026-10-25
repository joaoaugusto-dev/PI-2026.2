# API-19 — Hardening do JWT e dos middlewares (registro de execução)

Issue: [#78](https://github.com/joaoaugusto-dev/PI-2026.2/issues/78)
Responsável na issue: Guilherme Portilho da Rosa Santi (@TGuiDev); executada por Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-03 e API-16 (concluídas)
Branch: `feat/api-19-teste-varredura-rotas`
Última atualização: 24/10/2026

> Documento em construção: esta versão registra a revisão da expiração dos tokens (passo 1 da
> issue). Os demais passos, as decisões e o fechamento entram nas próximas etapas da issue.

## Revisão da expiração dos tokens (passo 1)

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

### Testes que fixam a decisão

- [`jwtExpiracao.test.ts`](../../api/src/tests/jwtExpiracao.test.ts) lê o `exp` dos tokens que a API
  de fato emite:
  - padrões do `env.ts` com as variáveis ausentes: `7d` e `15m`;
  - `api/.env` da suíte com os mesmos valores (a suíte falha se alguém alterar o prazo sem decisão);
  - login: `exp - iat` igual a 604800 s (7 dias);
  - `POST /v1/consulta/sessao`: `exp - iat` igual a 900 s (15 min), com `expiraEm: "15m"` na resposta;
  - o token do quiosque nunca vale mais que o da sessão de balcão.
- [`conviteAcesso.test.ts`](../../api/src/tests/conviteAcesso.test.ts): a sessão aberta pelo link de
  convite também vale 7 dias.
- Verificação de que os testes pegam o erro: com `JWT_EXPIRES_IN=8h` e `JWT_CONSULTA_EXPIRES_IN=30m`
  na execução, 5 testes falham.
