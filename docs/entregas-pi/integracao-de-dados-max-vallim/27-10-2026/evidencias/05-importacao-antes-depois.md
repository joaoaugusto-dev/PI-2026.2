# Importação de CSV: o que veio no arquivo × o que foi gravado
# Gerado em: 20/10/2026, 21:22:01 (Brasília)
# Comando: POST /v1/importacoes/ferramentas + SELECT nas linhas aceitas
# Ambiente: banco de desenvolvimento (soufer_dev @ 127.0.0.1:5432) · commit 43bf5a5 + alterações ainda não commitadas

## Linhas do arquivo (como vieram)

```text
01: nome;categoria;marca;modelo;setor;localizacao;descricao;valor
02:   zzevid_furadeira de impacto  ;Ferramentas Manuais;Bosch;GSB 13;Usinagem CNC;Armário 2;;1.234,56
03: ZZEVID_Chave de fenda   Phillips nº 2;Ferramentas Manuais;Tramontina;;;Gaveta 4;;R$ 18,90
04: ZZEVID_Alicate de corte;Categoria Inexistente;Gedore;;;;;45,00
05: ZZEVID_Martelo;Ferramentas Manuais;Tramontina;;;;;12,5,0
06: A;Ferramentas Manuais;;;;;;
07: ZZEVID_Furadeira de impacto;Ferramentas Manuais;Bosch;GSB 13;;;;1234,56
08: ZZEVID_Serra tico-tico;Ferramentas Manuais;Makita;4329;;Armário 1;;99999999999
09: Chave de Impacto Pneumática 1/2 Polegada;Ferramentas Manuais;Ingersoll Rand;2145QiMAX;;;;10,00
```

## Resultado (resumo da API)

```json
{
  "total_linhas": 8,
  "aceitas": 2,
  "rejeitadas": 4,
  "ignoradas": 2
}
```

## Linhas aceitas depois de gravadas no banco

| id | código | nome | marca | modelo | localização | valor | status |
|---|---|---|---|---|---|---|---|
| 37393 | 0082 | ZZEVID_FURADEIRA DE IMPACTO | Bosch | GSB 13 | Armário 2 | 1234.56 | disponivel |
| 37394 | 0083 | ZZEVID_CHAVE DE FENDA PHILLIPS Nº 2 | Tramontina | — | Gaveta 4 | 18.90 | disponivel |

Transformações visíveis acima: o nome foi aparado, teve os espaços repetidos reduzidos e foi gravado em **maiúsculas**; `1.234,56` e `R$ 18,90` viraram o numérico `1234.56` e `18.90`; o código de identificação foi gerado pelo banco (a planilha não traz).

## Linhas que não entraram, e por quê

| Linha | Situação | Motivo |
|---|---|---|
| 4 | rejeitada | Categoria "Categoria Inexistente" não cadastrada |
| 5 | rejeitada | Valor inválido (use o formato 1.234,56) |
| 6 | rejeitada | Nome deve ter no mínimo 2 caracteres |
| 8 | rejeitada | Valor deve ser no máximo 99.999.999,99 |
| 7 | ignorada | Repetida no arquivo (mesma da linha 2) |
| 9 | ignorada | Já cadastrada (código 1) |

## Auditoria das linhas aceitas (trigger do banco, usuário vindo do JWT)

| operação | usuário do JWT | nome |
|---|---|---|
| INSERT | sim | ZZEVID_FURADEIRA DE IMPACTO |
| INSERT | sim | ZZEVID_CHAVE DE FENDA PHILLIPS Nº 2 |

## Banco restaurado

- ferramentas: 101 antes, 101 depois
- emprestimos: 342 antes, 342 depois
- ocorrencias: 45 antes, 45 depois
- colaboradores: 69 antes, 69 depois
- auditoria: 18247 antes, 18247 depois
