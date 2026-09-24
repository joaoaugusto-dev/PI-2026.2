# API

## Base

A API utiliza o prefixo:

```text
/v1
```

## Autenticação

O middleware de autenticação decodifica o JWT e injeta o usuário em `req.usuario`.

Os campos de autoria não devem ser aceitos pelo cliente:

- `usuario_retirada_id`
- `usuario_devolucao_id`
- `registrada_por`
- `criado_por`

Esses valores são determinados pelo back-end.

## Endpoints principais

| Método | Rota | Perfil | Função |
|---|---|---|---|
| GET | `/v1/health` | Público | Healthcheck |
| POST | `/v1/auth/login` | Público | Login |
| GET | `/v1/auth/me` | Autenticado | Usuário atual |
| POST | `/v1/consulta/sessao` | Público | Token limitado de consulta |
| GET | `/v1/consulta/ferramentas` | Consulta | Busca somente leitura |
| GET | `/v1/ferramentas` | Manutenção | Lista de ferramentas (filtros `q`, `status`, `grupoId`, `sort`) |
| GET | `/v1/ferramentas/:id` | Manutenção | Detalhe de uma ferramenta |
| GET | `/v1/ferramentas/por-codigo/:codigo` | Manutenção | Leitura do código |
| GET | `/v1/ferramentas/:id/historico` | Manutenção | Histórico de empréstimos e ocorrências |
| POST | `/v1/ferramentas` | Manutenção | Cadastro |
| PATCH | `/v1/ferramentas/:id` | Manutenção | Atualização parcial |
| PATCH | `/v1/ferramentas/:id/etiqueta-impressa` | Manutenção | Marca a etiqueta como impressa |
| PATCH | `/v1/ferramentas/:id/disponibilizar` | Manutenção | Retorno de reparo |
| DELETE | `/v1/ferramentas/:id` | Manutenção | Baixa lógica (ativo = false) |
| GET/POST/PUT/DELETE | `/v1/colaboradores` | Manutenção | CRUD |
| GET/POST/PUT/DELETE | `/v1/setores` | Manutenção | CRUD |
| GET/POST/PUT/DELETE | `/v1/categorias` | Manutenção | CRUD |
| GET/POST/PUT/DELETE | `/v1/atividades` | Manutenção | CRUD |
| GET | `/v1/emprestimos` | Manutenção | Consulta de empréstimos |
| POST | `/v1/emprestimos` | Manutenção | Retirada |
| PATCH | `/v1/emprestimos/:id/devolucao` | Manutenção | Devolução |
| GET/PATCH | `/v1/ocorrencias` | Manutenção | Ocorrências |
| GET/PATCH | `/v1/notificacoes` | Manutenção | Notificações |
| GET | `/v1/dashboard/kpis` | Manutenção | KPIs |
| POST | `/v1/importacoes/ferramentas` | Manutenção | Importação CSV |
| GET | `/v1/relatorios/emprestimos.csv` | Manutenção | Exportação |

## Resposta de sucesso

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 128
  }
}
```

## Resposta de erro

```json
{
  "error": {
    "code": "FERRAMENTA_INDISPONIVEL",
    "message": "...",
    "details": []
  }
}
```

## Códigos

`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
