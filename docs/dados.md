# Integração e qualidade de dados

## Importação do inventário legado

Fluxo:

```text
CSV legado
   ↓
Upload
   ↓
Parse
   ↓
Normalização
   ↓
Validação Zod
   ↓
Deduplicação
   ↓
Carga transacional
   ↓
Relatório de aceitos/rejeitados
```

## Normalização

- `trim` em campos textuais.
- `uppercase` quando aplicável.
- Datas `DD/MM/AAAA` convertidas para ISO.
- Valores com vírgula convertidos para `numeric`.
- Deduplicação por `patrimonio_legado`.

## BrasilAPI

A BrasilAPI fornece feriados nacionais para a tabela `feriados`.

Uso:

- cálculo da previsão de devolução em dias úteis;
- classificação de atrasos.

Fallback:

1. cache local;
2. se o cache estiver vazio, considerar sábados e domingos;
3. registrar aviso no log.

## Evidências de qualidade

- constraints e checks;
- índice único parcial para empréstimo aberto;
- validação Zod;
- auditoria em JSONB;
- relatório de rejeição da importação;
- `npm run data:check`.

## Validações do `data:check`

O script deve verificar, entre outros pontos:

- registros órfãos;
- duplicidades;
- ferramenta `em_uso` sem empréstimo aberto;
- ocorrência sem ferramenta `indisponivel`.
