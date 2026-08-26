# Processos e regras de negócio

## Retirada

1. Identificar a ferramenta por código de barras, patrimônio ou nome.
2. Identificar o colaborador por matrícula, crachá ou nome.
3. Se o colaborador não existir, abrir cadastro rápido.
4. Informar a atividade.
5. Informar detalhe e ordem de serviço, quando aplicável.
6. Definir setor de destino.
7. Calcular previsão de devolução em dias úteis.
8. Registrar o usuário logado automaticamente.
9. Confirmar a retirada.

A mesma ferramenta não pode possuir dois empréstimos abertos.

## Devolução

1. Buscar o empréstimo aberto.
2. Exibir dados da retirada.
3. Informar condição:
   - OK;
   - avaria;
   - perda.
4. Se OK, a ferramenta volta para `disponivel`.
5. Se avaria/perda, uma ocorrência é aberta automaticamente.
6. A ferramenta passa para `indisponivel`.

## Indisponíveis

Uma ferramenta indisponível fica em seção própria e não aparece como disponível ou em uso.

O fluxo da ocorrência pode ser:

```text
aberta
  ↓
em_reparo
  ↓
cobrada
  ↓
resolvida / baixada
```

Após o reparo, a disponibilização deve ser uma ação explícita e auditável.

## Consulta

O usuário informa matrícula ou utiliza crachá.

A API valida o colaborador e emite token limitado por 15 minutos.

A consulta permite visualizar somente:

- nome;
- categoria;
- status;
- localização padrão.

Não permite:

- escrita;
- histórico;
- valores;
- identificação de quem está usando a ferramenta.

## Notificações

Um job diário gera notificações para:

- devolução prevista para hoje;
- empréstimo atrasado;
- ocorrência pendente.

O sino do cabeçalho apresenta o contador de não lidas.

## Código de barras

O patrimônio é gerado automaticamente no formato `SF000000`.

O código é impresso em etiqueta de 50 x 25 mm com:

- código de barras Code128;
- código legível;
- nome abreviado da ferramenta.
