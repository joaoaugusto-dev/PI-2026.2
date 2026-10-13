# API-16 — Endpoint e sessão de consulta pública (registro de execução)

Issue: [#60](https://github.com/joaoaugusto-dev/PI-2026.2/issues/60)
Responsável na issue: Guilherme Portilho da Rosa Santi (@TGuiDev); finalizada por Henrique de Oliveira Molinari (@henrique-molinari)
Depende de: API-15 (concluída)
Branch: `feat/api-16-consulta-publica`
Última atualização: 05/10/2026

## Objetivo

O modo quiosque da regra 8: o colaborador abre uma sessão curta só com a matrícula e consulta a disponibilidade das ferramentas, sem ver quem está com elas, histórico ou valores. O token de consulta e o da manutenção/admin precisam ser realmente isolados.

## Situação antes desta entrega

`POST /v1/consulta/sessao` (token de 15 minutos) e o isolamento básico de papel já existiam. Faltavam: restringir os campos do `GET /v1/consulta/ferramentas` (a rota reaproveitava a listagem completa da manutenção, com descrição, marca, modelo, ids de grupo/setor, motivo de indisponibilidade, foto etc., e sem o nome da categoria), testes que garantissem os campos e o isolamento por completo, o log de auditoria e a documentação.

## Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| Projeção própria (`listarParaConsulta`), e não "listar sem alguns campos" | Coluna nova em `ferramentas` não vaza para o quiosque por acidente. |
| Campos: `id`, `nome`, `categoria`, `status`, `localizacao`, `codigo_identificacao` | A issue pede nome, categoria, status e localização; `id` (chave da lista) e código de patrimônio são usados pela tela do quiosque. `categoria` é o nome do grupo (JOIN com `grupos_ferramentas`). |
| Busca (`q`) continua olhando descrição, marca e modelo, sem devolvê-los | Mantém a busca útil sem expor os campos. |
| Filtros e busca compartilhados com a listagem da manutenção (`montarFiltro`) | Uma regra só; sem risco de as duas listagens divergirem. |
| Log em Pino, sem tabela de negócio | Pedido do "se sobrar tempo": auditoria simples, sem virar feature de rastreio. |
| Admin também recebe 403 na rota de consulta | A rota é exclusiva do papel `consulta`; o admin tem as telas da manutenção. |
| Código de crachá **não** entra | Descartado na #150; o quiosque usa só matrícula. |

## O que foi feito

### API
- [`ferramentaService.ts`](../../api/src/services/ferramentaService.ts): `montarFiltro` extraído de `listar`; novo `listarParaConsulta` com a projeção restrita.
- [`ferramentaController.ts`](../../api/src/controllers/ferramentaController.ts): `listarParaConsulta`, que também registra a consulta no log (`evento: consulta_ferramentas`, id e matrícula do colaborador, `q`, `status`, `grupoId`, página e total).
- [`consultaRoutes.ts`](../../api/src/routes/v1/consultaRoutes.ts): a rota passa a usar o controller novo; Swagger atualizado.

### Front
- [`useConsulta.ts`](../../web/src/hooks/useConsulta.ts): tipo `FerramentaConsulta` no lugar de `Ferramenta`. A tela do quiosque só usa campos que continuam vindo.

### Testes ([`consultaFerramentas.test.ts`](../../api/src/tests/consultaFerramentas.test.ts))
- Retorno com exatamente `id`, `nome`, `categoria`, `status`, `localizacao` e `codigo_identificacao`.
- `categoria` vem do nome do grupo e o filtro por status continua valendo.
- Isolamento: manutenção → 403; admin → 403; sem token → 401; token expirado → 401 `TOKEN_EXPIRED`; token de consulta em `/v1/ferramentas`, `/v1/dashboard`, `/v1/emprestimos` e `/v1/notificacoes` → 403.
- Token real emitido por `/v1/consulta/sessao`: validade de 15 minutos (`exp - iat = 900`), lista ferramentas e não abre rota da manutenção.
- Log de auditoria registrado com a matrícula e os filtros.

### Documentação
- [`docs/backend/arquitetura.md`](../backend/arquitetura.md), [`docs/backend/api.md`](../backend/api.md), [`docs/mudancas-para-o-guilherme.md`](../mudancas-para-o-guilherme.md) e [`api/docs/insomnia-collection.json`](../../api/docs/insomnia-collection.json) (consulta com token de consulta e com token da manutenção).

## Como verificar

1. `cd api && npx vitest run src/tests/consultaFerramentas`.
2. No Insomnia: `POST /v1/consulta/sessao` com uma matrícula ativa, colocar o token em `tokenConsulta` e chamar `GET /v1/consulta/ferramentas` (200, só os 6 campos).
3. Chamar a mesma rota com o token da manutenção (403) e `GET /v1/ferramentas` com o token de consulta (403).

## Limitações conhecidas

- A auditoria é só log (Pino): a retenção depende do CloudWatch, então não é evidência durável. Se a Soufer precisar disso como prova, será preciso uma tabela própria. O texto livre `q` é truncado em 100 caracteres antes de ir para o log.

## Se sobrar tempo (fora do escopo)

- Auditoria da abertura de sessão do quiosque (hoje só a consulta de ferramentas é logada).
