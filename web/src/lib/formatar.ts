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
