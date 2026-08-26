# Banco de dados

## Entidades principais

- `usuarios`
- `colaboradores`
- `ferramentas`
- `setores`
- `categorias`
- `atividades`
- `emprestimos`
- `ocorrencias`
- `notificacoes`
- `feriados`
- `auditoria`

## Status de ferramenta

```text
disponivel
em_uso
indisponivel
```

Quando a ferramenta está `indisponivel`, deve existir um motivo:

- `avaria`
- `perda`
- `manutencao_preventiva`
- `baixada`

## Identificação

O sistema gera automaticamente o patrimônio no padrão:

```text
SF + ID com 6 dígitos
```

Exemplo:

```text
SF000452
```

O código de patrimônio também é usado na identificação por código de barras Code128.

## Regra de empréstimo

Uma ferramenta pode possuir somente um empréstimo em aberto. Isso é garantido por índice único parcial em `emprestimos(ferramenta_id)` quando `data_devolucao is null`.

## Triggers

### Validação da retirada

Impede retirada de ferramenta que não esteja disponível.

### Sincronização do status

- Nova retirada → `em_uso`.
- Devolução OK → `disponivel`.
- Devolução com avaria/perda → `indisponivel`.

### Abertura de ocorrência

Devolução com avaria ou perda cria automaticamente uma ocorrência vinculada ao empréstimo.

## Views

### `vw_emprestimos_detalhe`

Centraliza dados de empréstimos, ferramenta, colaborador, setor, atividade, usuários e situação.

### `vw_dashboard_kpis`

Fornece:

- total cadastradas;
- disponíveis;
- em uso;
- indisponíveis;
- atrasadas;
- ocorrências abertas.

### `vw_ocorrencias_por_colaborador`

Agrupa avarias, perdas e custo estimado por colaborador e setor.

## Auditoria

Operações críticas podem ser registradas em `auditoria`, mantendo dados anteriores e posteriores em `jsonb`.
