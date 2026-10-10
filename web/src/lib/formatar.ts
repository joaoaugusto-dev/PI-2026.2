const FUSO = 'America/Sao_Paulo'

/**
 * Data para a tela em pt-BR. Texto só-data (`AAAA-MM-DD`, tipo `date`) é
 * formatado sem conversão de fuso — `new Date('2026-09-30')` é meia-noite UTC e
 * apareceria um dia antes em Brasília. Timestamps (ISO com hora) são mostrados
 * no fuso de Brasília, o do balcão, e não no do navegador. O contrato da API só
 * devolve `timestamptz` (nenhuma coluna `date`), então o ramo de timestamp é o
 * que vale na prática; o de só-data protege um campo futuro do tipo `date`.
 */
export function dataBR(valor: string | null | undefined) {
  if (!valor) return '—'
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`
  return new Date(valor).toLocaleDateString('pt-BR', { timeZone: FUSO })
}

/** Data e hora (`dd/mm/aaaa HH:mm`) no fuso de Brasília; texto só-data fica sem hora. */
export function dataHoraBR(valor: string | null | undefined) {
  if (!valor) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return dataBR(valor)
  return new Date(valor).toLocaleString('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' }).replace(',', '')
}

const CONDICAO: Record<string, string> = { ok: 'OK', avaria: 'Avaria', perda: 'Perda' }

/** `avaria` -> `Avaria`; valor desconhecido vira texto legível (`em_reparo` -> `Em reparo`). */
export function rotuloCondicao(valor: string) {
  return CONDICAO[valor] ?? valor.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())
}

/** "Hoje" no fuso de Brasília (mês 0-based, como `Date`), para não depender do relógio/fuso do navegador. */
export function hojeBrasilia(agora = new Date()) {
  const iso = agora.toLocaleDateString('en-CA', { timeZone: FUSO }) // AAAA-MM-DD
  const [ano, mes, dia] = iso.split('-').map(Number)
  return { iso, ano, mes: mes - 1, dia }
}

/** Dias de calendário de `a` até `b` no fuso de Brasília (positivo se `a` é depois de `b`); aceita `AAAA-MM-DD` ou timestamp. */
export function diasEntre(a: string | Date, b: string | Date) {
  const dia = (v: string | Date) =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date(v).toLocaleDateString('en-CA', { timeZone: FUSO })
  return Math.round((Date.parse(dia(a)) - Date.parse(dia(b))) / 86_400_000)
}

/** "hoje às 21:53", "ontem às 08:10", "07/10 · há 2 dias" — o balcão lê isso de relance; "09/10/2026 · 0 dias" não. */
export function quandoBR(valor: string | null | undefined, agora = new Date()) {
  if (!valor) return '—'
  const dias = diasEntre(agora, valor)
  const hora = new Date(valor).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
  if (dias === 0) return `hoje às ${hora}`
  if (dias === 1) return `ontem às ${hora}`
  return `${dataBR(valor).slice(0, 5)} · há ${dias} dias`
}

/** Prazo relativo a hoje: "hoje", "amanhã", "em 3 dias", "atrasada 2 dias". */
export function prazoBR(valor: string | null | undefined, agora = new Date()) {
  if (!valor) return '—'
  const dias = diasEntre(valor, agora)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias > 1) return `em ${dias} dias`
  return `atrasada ${-dias} ${dias === -1 ? 'dia' : 'dias'}`
}
