// Gera dist/artifact.html: o Artifact embrulha a página no próprio esqueleto
// (doctype/html/head/body), então aqui sai só o conteúdo, com <title> primeiro.
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
const title = head.match(/<title>[\s\S]*?<\/title>/)[0]
const resto = head
  .replace(title, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')

writeFileSync('dist/artifact.html', `${title}\n${resto.trim()}\n${body.trim()}\n`)
console.log('dist/artifact.html pronto')
