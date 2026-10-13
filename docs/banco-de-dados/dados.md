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

Implementado em `POST /v1/importacoes/ferramentas` (DATA-03), parte da importação e exportação CSV genérica da API (contrato completo em
[`docs/backend/api.md`](../backend/api.md#importação-e-exportação-csv)).

- `trim` em campos textuais, e espaços internos repetidos viram um só.
- `uppercase` no nome da ferramenta.
- Valores com vírgula (`1.234,56`, `R$ 89,90`) convertidos para `numeric` (`valor_aquisicao`).
- Categoria e setor informados pelo nome e resolvidos para o id.
- Deduplicação por `nome` + `marca` + `modelo` (sem diferenciar maiúsculas e espaços), contra as ferramentas ativas e
  dentro do próprio arquivo. As linhas duplicadas são **ignoradas**, não rejeitadas, então a carga pode ser feita em ondas.

Diferenças em relação ao plano original da issue:

- **Sem `patrimonio_legado`:** a coluna foi removida com a troca para o código de 4 dígitos (ver dicionário de dados), e o
  inventário levantado na DATA-01 não tem número de patrimônio.
- **Sem conversão de datas `DD/MM/AAAA`:** `ferramentas` não tem coluna de data, e o inventário não traz datas.
- **Limitação:** unidades idênticas (por exemplo, 5 chaves Allen iguais) têm a mesma chave de duplicidade, então só a
  primeira entra. Para cadastrar as outras, diferencie as linhas (pelo modelo, por exemplo) ou use o cadastro manual.

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
