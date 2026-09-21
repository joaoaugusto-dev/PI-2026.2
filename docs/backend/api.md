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
| GET | `/v1/ferramentas` | Almoxarife | Lista de ferramentas (filtros `q`, `status`, `grupoId`, `sort`) |
| GET | `/v1/ferramentas/:id` | Almoxarife | Detalhe de uma ferramenta |
| GET | `/v1/ferramentas/por-codigo/:codigo` | Almoxarife | Leitura do código |
| GET | `/v1/ferramentas/:id/historico` | Almoxarife | Histórico de empréstimos e ocorrências |
| POST | `/v1/ferramentas` | Almoxarife | Cadastro |
| PATCH | `/v1/ferramentas/:id` | Almoxarife | Atualização parcial |
| PATCH | `/v1/ferramentas/:id/etiqueta-impressa` | Almoxarife | Marca a etiqueta como impressa |
| PATCH | `/v1/ferramentas/:id/disponibilizar` | Almoxarife | Retorno de reparo |
| DELETE | `/v1/ferramentas/:id` | Almoxarife | Baixa lógica (ativo = false) |
| GET/POST/PUT/DELETE | `/v1/colaboradores` | Almoxarife | CRUD |
| GET/POST/PUT/DELETE | `/v1/setores` | Almoxarife | CRUD |
| GET/POST/PUT/DELETE | `/v1/categorias` | Almoxarife | CRUD |
| GET/POST/PUT/DELETE | `/v1/atividades` | Almoxarife | CRUD |
| GET | `/v1/emprestimos` | Almoxarife | Consulta de empréstimos |
| POST | `/v1/emprestimos` | Almoxarife | Retirada |
| PATCH | `/v1/emprestimos/:id/devolucao` | Almoxarife | Devolução |
| GET/PATCH | `/v1/ocorrencias` | Almoxarife | Ocorrências |
| GET/PATCH | `/v1/notificacoes` | Almoxarife | Notificações |
| GET | `/v1/dashboard/kpis` | Almoxarife | KPIs |
| POST | `/v1/importacoes/ferramentas` | Almoxarife | Importação CSV |
| GET | `/v1/relatorios/emprestimos.csv` | Almoxarife | Exportação |

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
