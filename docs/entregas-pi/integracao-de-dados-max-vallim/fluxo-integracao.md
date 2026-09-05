# Fluxo de integração de dados — fontes externas

Este documento registra de onde vêm os dados do SOUFER Tools que **não são
digitados na hora** pelo almoxarife ou pelo colaborador: o inventário legado
da Soufer e a BrasilAPI de feriados.

---

## 1. Inventário legado da manutenção

### Origem

**Atualização da visita técnica (01/09/2026):** a fonte é o **setor de
manutenção**, não o almoxarifado — o almoxarifado só guarda consumíveis, não
o ferramental que o sistema precisa controlar.

A manutenção enviou dois arquivos, no formato em que já os mantém
internamente (planilha/lista simples, sem padronização prévia — conforme
combinado, a normalização é responsabilidade da nossa equipe, não da
Soufer):

| Arquivo | Formato | Conteúdo |
|---|---|---|
| `dados_soufer/LISTA-DE-ITENS-DA-MANUTENÇÃO.docx` | Word, lista de parágrafos | Ferramentas e equipamentos de uso da manutenção (chaves, grifos, escadas, parafusadeira, paleteira, extensões elétricas, torquímetro etc.) |
| `dados_soufer/RELAÇAO-DE-MATERIAIS-NO-SETOR DE-MANUTENÇÃO.xlsx` | Excel, 2 colunas (`ITEM`, `QUANTIDADE`) | ~123 linhas, majoritariamente peças de reposição e material de consumo da manutenção (rolamentos, parafusos, correias, graxa, óleo) |

### Exemplo real de conteúdo

Trecho do `.docx` (ferramentas/equipamentos — candidatos diretos a virar
registros em `ferramentas`):

```text
Chave combinada gedore N ° 50,46,27,26 1un cada
Grifo irwin 24 polegadas 1un
Torquímetro gedore 80-360 NM, 60-260 tbt
Parafusadeira Bosch gsb 18v- 50- 1un
Paleteira TM capacidade.  2.500 kg - 1un
Extensão de fio 2 vias 8 mts - 1un
Chave Allen número 1.5 ,2.5, 3,4, 4.5, 5, 5.5, 6 ,8, 10 ,12  5un cada
Escada de alumínio 6mts  1un
```

Trecho do `.xlsx` (peça/material — provável **não** entrar em `ferramentas`
como está, ver observação abaixo):

```text
('LÂMPADA FLUORESCENTE 100W', 6)
('PARAFUSO ALLEN C/C  M 8 X 40', 10)
('ROLAMENTO 6205-ZZ', '4 pç')
('GRAXA LUBRAX LITH SM 2  (alta pressão)', '20 kg')
('OLEO LUBRIFICANTE HYDRA XP 32', '20 litros')
```

> **Observação para validar com a equipe:** o `.docx` lista itens no
> formato "ferramenta emprestável" (1 chave, 1 escada, 1 parafusadeira —
> compatível com `emprestimos`/`ferramentas.status`). Já o `.xlsx` é, na
> prática, estoque de peças de reposição e insumo de manutenção (parafusos,
> rolamentos, graxa, óleo) — não são itens que fazem sentido como um
> empréstimo individual rastreável. Recomendação: usar o `.docx` como base
> da primeira carga de `ferramentas`; decidir com o time se o `.xlsx` entra
> como catálogo de consumíveis (fora do escopo de empréstimo) ou fica de
> fora do MVP.

### Formato e qualidade dos dados de origem

- Sem código de identificação prévio — cada linha é só um nome descritivo
  livre + quantidade solta no texto (ex.: `"1un"`, `"5un cada"`, `"60 m"`,
  `"3un"`).
- Sem grupo/subgrupo, sem marca/modelo padronizados — tudo dentro do nome do
  item, exigindo normalização manual/heurística antes da carga.
- Alguns nomes têm caracteres corrompidos no arquivo original
  (`ç`/`ã`/`°` aparecem como `?`/mojibake em algumas linhas do `.xlsx`) —
  atenção ao reabrir o arquivo original com encoding UTF-8/Latin-1 correto
  antes de qualquer parser automatizado.
- Linhas em branco / células vazias existem no meio da planilha (ex.: linha
  com item `None`) — o parser de importação (issue de carga, Sprint 1) precisa
  descartar essas linhas.

### Uso previsto

Importação para a tabela `ferramentas` (fluxo completo descrito em
`dados.md`), com a estratégia de carga combinada na visita técnica:

- **Não importar tudo de uma vez.** Priorizar por valor/giro: primeiro
  máquinas e equipamentos maiores (ex.: parafusadeira, paleteira, escadas,
  extensões), depois chaves e itens de menor porte/maior volume.
- Cada linha do `.docx` vira um candidato a registro de `ferramentas`
  (`nome`, `grupo_id`/`subgrupo_id` atribuídos na normalização,
  `codigo_identificacao` gerado pelo trigger do banco — não vem do arquivo).
- O `.xlsx` fica pendente de decisão do time (ver observação acima) antes de
  entrar em qualquer carga.

---

## 2. BrasilAPI — feriados nacionais

### Origem

`GET https://brasilapi.com.br/api/feriados/v1/{ano}` — testada manualmente
em 03/09/2026 para o ano de 2026.

### Exemplo real de retorno

Resposta HTTP 200 completa salva em
[`exemplos/brasilapi-feriados-2026.json`](./exemplos/brasilapi-feriados-2026.json).
Trecho:

```json
[
  {
    "date": "2026-01-01",
    "name": "Confraternização mundial",
    "type": "national",
    "weekday": "quinta-feira"
  },
  {
    "date": "2026-04-21",
    "name": "Tiradentes",
    "type": "national",
    "weekday": "terça-feira"
  }
]
```

### Formato

Array de objetos com 4 campos, todos string:

| Campo | Exemplo | Mapeia para (`feriados`) |
|---|---|---|
| `date` | `"2026-01-01"` | `data` (`date`, único) |
| `name` | `"Confraternização mundial"` | `nome` |
| `type` | `"national"` | `tipo` |
| `weekday` | `"quinta-feira"` | — (não persistido; `ano` é extraído de `date`) |

### Uso previsto

- Cache local na tabela `feriados` (uma carga por ano).
- Cálculo de `previsao_devolucao` em dias úteis (pular fins de semana e
  datas presentes no cache).
- Classificação de empréstimo atrasado.
- Fallback se a API estiver fora: usar o cache local já existente; se o
  cache também estiver vazio, considerar apenas sábado/domingo como não
  úteis e registrar aviso em log (detalhado em `dados.md`).

---

## Referências relacionadas

- `dados.md` — pipeline de importação/normalização e regras de
  qualidade de dados (`data:check`).
- `../../banco-de-dados/dicionario-de-dados.md` — schema completo das 13 tabelas,
  incluindo `ferramentas` e `feriados`.
- `CLAUDE.md`, Seção 3 — regras de negócio inegociáveis.
