# Validação nas rotas de escrita: requisições inválidas e a resposta da API
# Gerado em: 20/10/2026, 21:22:01 (Brasília)
# Comando: requisições HTTP reais à API (app em memória)
# Ambiente: banco de desenvolvimento (soufer_dev @ 127.0.0.1:5432) · commit 43bf5a5 + alterações ainda não commitadas

Cada caso abaixo foi executado de verdade. A resposta é sempre o envelope padrão de erro `{ "error": { "code", "message", "details" } }`.

| # | Caso | Requisição | HTTP | `error.code` | Mensagem / detalhe |
|---|---|---|---|---|---|
| 1 | Ferramenta com nome de 1 letra | `POST /v1/ferramentas` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — nome: Nome deve ter no mínimo 2 caracteres |
| 2 | Ferramenta sem categoria (grupoId) | `POST /v1/ferramentas` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — grupoId: grupoId deve ser um número |
| 3 | Colaborador com matrícula inválida | `POST /v1/colaboradores` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — matricula: Matrícula deve ter exatamente 4 dígitos numéricos (0001 a 9999) |
| 4 | Retirada sem previsão de devolução | `POST /v1/emprestimos` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — previsaoDevolucao: previsaoDevolucao é obrigatória |
| 5 | Retirada com previsão no passado | `POST /v1/emprestimos` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — previsaoDevolucao: previsaoDevolucao não pode estar no passado |
| 6 | Retirada de ferramenta inexistente | `POST /v1/emprestimos` | **404** | FERRAMENTA_NOT_FOUND | Ferramenta não encontrada |
| 7 | Retirada com JSON malformado | `POST /v1/emprestimos` | **400** | INVALID_JSON | O corpo da requisição não é um JSON válido. |
| 8 | KPI com período invertido (de depois de ate) | `GET /v1/kpis/ferramentas-mais-retiradas` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — de: "de" não pode ser depois de "ate" |
| 9 | KPI com data impossível (30 de fevereiro) | `GET /v1/kpis/taxa-avaria` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — de: não é uma data válida |
| 10 | Auditoria com tabela desconhecida | `GET /v1/auditoria` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — tabela: tabela deve ser uma de: ferramentas, emprestimos, ocorrencias, colaboradores |
| 11 | Auditoria sem token | `GET /v1/auditoria` | **401** | TOKEN_NOT_PROVIDED | Token de autenticação não fornecido |
| 12 | Auditoria com perfil manutenção (só admin) | `GET /v1/auditoria` | **403** | ACCESS_DENIED | Perfil 'manutencao' não possui permissão para acessar esta rota — {"requiredRoles":["admin"],"userRole":"manutencao"} |
| 13 | Edição de ferramenta pela manutenção (só admin) | `PATCH /v1/ferramentas/37396` | **403** | ACCESS_DENIED | Perfil 'manutencao' não possui permissão para acessar esta rota — {"requiredRoles":["admin"],"userRole":"manutencao"} |
| 14 | Consulta tentando rota de balcão | `GET /v1/ferramentas` | **403** | ACCESS_DENIED | Perfil 'consulta' não possui permissão para acessar esta rota — {"requiredRoles":["manutencao","admin"],"userRole":"consulta"} |
| 15 | Importação de CSV sem a coluna obrigatória | `POST /v1/importacoes/ferramentas` | **400** | VALIDATION_ERROR | Coluna(s) obrigatória(s) ausente(s) no cabeçalho: categoria — cabecalho: Colunas aceitas: nome, categoria, marca, modelo, setor, localizacao, descricao, valor |
| 16 | Importação de recurso desconhecido | `POST /v1/importacoes/usuarios` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — recurso: Recurso deve ser um de: ferramentas, colaboradores, categorias, setores |
| 17 | Segunda retirada da mesma ferramenta (um empréstimo aberto por ferramenta, regra 1) | `POST /v1/emprestimos` | **409** | FERRAMENTA_INDISPONIVEL | Ferramenta 37396 não está disponível para empréstimo (status atual: em_uso) |
| 18 | Devolução com condição inexistente | `PATCH /v1/emprestimos/5629/devolucao` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — condicaoDevolucao: condicaoDevolucao deve ser ok, avaria ou perda |
| 19 | Devolução "ok" com custo estimado | `PATCH /v1/emprestimos/5629/devolucao` | **400** | VALIDATION_ERROR | Erro de validação nos dados enviados — custoEstimado: custoEstimado só se aplica a devolução com avaria ou perda |

## Respostas completas de alguns casos

### 1. Ferramenta com nome de 1 letra

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erro de validação nos dados enviados",
    "details": [
      {
        "field": "nome",
        "message": "Nome deve ter no mínimo 2 caracteres",
        "rule": "too_small"
      }
    ]
  }
}
```

### 2. Ferramenta sem categoria (grupoId)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erro de validação nos dados enviados",
    "details": [
      {
        "field": "grupoId",
        "message": "grupoId deve ser um número",
        "rule": "invalid_type"
      }
    ]
  }
}
```

### 3. Colaborador com matrícula inválida

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erro de validação nos dados enviados",
    "details": [
      {
        "field": "matricula",
        "message": "Matrícula deve ter exatamente 4 dígitos numéricos (0001 a 9999)",
        "rule": "invalid_string"
      }
    ]
  }
}
```

### 4. Retirada sem previsão de devolução

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erro de validação nos dados enviados",
    "details": [
      {
        "field": "previsaoDevolucao",
        "message": "previsaoDevolucao é obrigatória",
        "rule": "invalid_type"
      }
    ]
  }
}
```

### 5. Retirada com previsão no passado

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Erro de validação nos dados enviados",
    "details": [
      {
        "field": "previsaoDevolucao",
        "message": "previsaoDevolucao não pode estar no passado",
        "rule": "custom"
      }
    ]
  }
}
```

### 7. Retirada com JSON malformado

```json
{
  "error": {
    "code": "INVALID_JSON",
    "message": "O corpo da requisição não é um JSON válido.",
    "details": []
  }
}
```

### 17. Segunda retirada da mesma ferramenta (um empréstimo aberto por ferramenta, regra 1)

```json
{
  "error": {
    "code": "FERRAMENTA_INDISPONIVEL",
    "message": "Ferramenta 37396 não está disponível para empréstimo (status atual: em_uso)",
    "details": []
  }
}
```

## Contraste: a mesma retirada, válida

A primeira retirada de "ZZEVID_Validacao" (HTTP 201) foi aceita; só a segunda foi barrada com 409.
