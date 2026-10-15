const BR = 'pt-BR'

export const inteiroBR = (n: number) => n.toLocaleString(BR)

export const percentualBR = (n: number) => `${n.toLocaleString(BR, { maximumFractionDigits: 1 })}%`

/** Tempo de posse: abaixo de um dia em horas ("5,5 h"), acima em dias ("2,3 dias"). */
export function duracaoBR(horas: number) {
  if (horas < 24) return `${horas.toLocaleString(BR, { maximumFractionDigits: 1 })} h`
  const dias = horas / 24
  return `${dias.toLocaleString(BR, { maximumFractionDigits: 1 })} ${dias < 1.05 ? 'dia' : 'dias'}`
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Rótulo curto do eixo do gráfico de evolução, a partir do `inicio` (`AAAA-MM-DD`) do balde. */
export function rotuloBalde(inicio: string, granularidade: 'dia' | 'semana' | 'mes') {
  const [ano, mes, dia] = inicio.split('-')
  return granularidade === 'mes' ? `${MESES[Number(mes) - 1]}/${ano.slice(2)}` : `${dia}/${mes}`
}
