# Auditoria automática em jsonb: exemplos reais
# Gerado em: 20/10/2026, 21:22:01 (Brasília)
# Comando: fluxo pela API (criar → retirar → devolver com avaria → editar) e GET /v1/auditoria
# Ambiente: banco de desenvolvimento (soufer_dev @ 127.0.0.1:5432) · commit 43bf5a5 + alterações ainda não commitadas

Fluxo executado: `POST /ferramentas` → `POST /emprestimos` → `PATCH /emprestimos/:id/devolucao` (condição avaria, com `usuarioDevolucaoId: 999999` no corpo, que deve ser ignorado) → `PATCH /ferramentas/:id` (admin).
Retorno HTTP: criar 201, retirada 201, devolução 200.

Trilhas lidas por `GET /v1/auditoria?tabela=…&registroId=…` (ordem cronológica; "(registro completo)" = o INSERT grava a linha inteira):

### Ferramenta (cada mudança de status e a edição aparecem com só as colunas que mudaram)

```json
[
  {
    "operacao": "INSERT",
    "usuario_do_jwt": true,
    "dados_anteriores": null,
    "dados_novos": "(registro completo)"
  },
  {
    "operacao": "UPDATE",
    "usuario_do_jwt": true,
    "dados_anteriores": {
      "status": "disponivel"
    },
    "dados_novos": {
      "status": "em_uso"
    }
  },
  {
    "operacao": "UPDATE",
    "usuario_do_jwt": true,
    "dados_anteriores": {
      "status": "em_uso",
      "motivo_indisponivel": null
    },
    "dados_novos": {
      "status": "indisponivel",
      "motivo_indisponivel": "avaria"
    }
  },
  {
    "operacao": "UPDATE",
    "usuario_do_jwt": true,
    "dados_anteriores": {
      "localizacao": null
    },
    "dados_novos": {
      "localizacao": "Armário 7"
    }
  }
]
```

### Empréstimo (INSERT da retirada e UPDATE da devolução)

```json
[
  {
    "operacao": "INSERT",
    "usuario_do_jwt": true,
    "dados_anteriores": null,
    "dados_novos": "(registro completo)"
  },
  {
    "operacao": "UPDATE",
    "usuario_do_jwt": true,
    "dados_anteriores": {
      "data_devolucao": null,
      "condicao_devolucao": null,
      "usuario_devolucao_id": null
    },
    "dados_novos": {
      "data_devolucao": "2026-10-20T21:22:01.355202-03:00",
      "condicao_devolucao": "avaria",
      "usuario_devolucao_id": 1
    }
  }
]
```

### Ocorrência (aberta sozinha pela trigger fn_abre_ocorrencia, herdando o colaborador)

```json
[
  {
    "operacao": "INSERT",
    "usuario_do_jwt": true,
    "dados_anteriores": null,
    "dados_novos": "(registro completo)"
  }
]
```

### INSERT completo da ferramenta (dados_novos)

```json
{
  "id": 37395,
  "nome": "ZZEVID_Esmerilhadeira",
  "ativo": true,
  "marca": null,
  "eh_kit": false,
  "modelo": null,
  "status": "disponivel",
  "foto_url": null,
  "grupo_id": 2,
  "setor_id": null,
  "descricao": null,
  "created_at": "2026-10-20T21:22:01.308213-03:00",
  "updated_at": "2026-10-20T21:22:01.308213-03:00",
  "localizacao": null,
  "subgrupo_id": null,
  "valor_aquisicao": null,
  "motivo_indisponivel": null,
  "codigo_identificacao": 82,
  "etiqueta_impressa_em": null
}
```

### Prova da regra 6 (responsável vem do JWT, não do corpo)

```text
usuario_devolucao_id gravado no empréstimo: 1  (enviado no corpo: 999999; usuário do token: 1)
```
