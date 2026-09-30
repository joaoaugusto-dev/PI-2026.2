/** Lê CSV (separador `;` ou `,`, aspas duplas com escape `""`) em linhas indexadas pelo cabeçalho. */
export function lerCsv(texto: string): Record<string, string>[] {
  const limpo = texto.replace(/^﻿/, '')
  const primeira = limpo.split(/\r?\n/, 1)[0] ?? ''
  const sep = primeira.split(';').length >= primeira.split(',').length ? ';' : ','

  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i]
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) {
      linha.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpo[i + 1] === '\n') i++
      linha.push(campo)
      linhas.push(linha)
      ;[linha, campo] = [[], '']
    } else campo += c
  }
  if (campo || linha.length) linhas.push([...linha, campo])

  const [cab, ...corpo] = linhas.filter((l) => l.some((c) => c.trim()))
  if (!cab) return []
  const chaves = cab.map((c) => c.trim().toLowerCase())
  return corpo.map((l) => Object.fromEntries(chaves.map((k, i) => [k, (l[i] ?? '').trim()])))
}

const NUMERO = /^[-+]?\d+([.,]\d+)?$/

/**
 * Injeção de fórmula: no Excel, célula que começa com `=`, `+`, `-`, `@`, tab
 * ou CR vira fórmula. Texto livre (nome de ferramenta, colaborador, inclusive
 * vindo de auto-cadastro) ganha um `'` na frente; número de verdade
 * (`-5`, `+12,5`) passa intacto.
 */
export function neutralizarFormula(celula: string) {
  return /^[=+\-@\t\r]/.test(celula) && !NUMERO.test(celula) ? `'${celula}` : celula
}

/** Gera e baixa um CSV (`;`, com BOM para o Excel abrir com acento). */
export function baixarCsv(nome: string, cabecalho: string[], linhas: string[][] = []) {
  const csv = [cabecalho, ...linhas]
    .map((l) => l.map((c) => `"${neutralizarFormula(c).replaceAll('"', '""')}"`).join(';'))
    .join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
