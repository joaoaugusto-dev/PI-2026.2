import { hojeBrasilia } from '@/lib/formatar'

/** Período dos KPIs (`de`/`ate` inclusivos, `AAAA-MM-DD`, calendário de Brasília), como a API pede. */
export interface Periodo {
  de: string
  ate: string
}

export type Atalho = '7d' | '30d' | 'mes' | 'mes_anterior' | 'trimestre' | '12m' | 'personalizado'

export const ATALHOS: { id: Exclude<Atalho, 'personalizado'>; rotulo: string }[] = [
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes_anterior', rotulo: 'Mês passado' },
  { id: 'trimestre', rotulo: 'Trimestre' },
  { id: '12m', rotulo: '12 meses' },
]

/** Limite da API (`de`..`ate` inclusivos). */
export const MAX_DIAS = 366

// datas só-dia em UTC: soma de dias sem horário de verão nem fuso do navegador no meio
const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (ano: number, mes: number, dia: number) => new Date(Date.UTC(ano, mes, dia))

export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return iso(d)
}

/** Dias do período, contando as duas pontas (`de = ate` é 1). */
export function diasNoPeriodo({ de, ate }: Periodo) {
  return Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000) + 1
}

/** Intervalo de um atalho, terminando hoje (Brasília); "Mês passado" é o mês fechado. */
export function periodoDoAtalho(atalho: Exclude<Atalho, 'personalizado'>, agora = new Date()): Periodo {
  const { iso: hoje, ano, mes } = hojeBrasilia(agora)
  switch (atalho) {
    case '7d':
      return { de: somarDias(hoje, -6), ate: hoje }
    case '30d':
      return { de: somarDias(hoje, -29), ate: hoje }
    case 'mes':
      return { de: iso(utc(ano, mes, 1)), ate: hoje }
    case 'mes_anterior':
      return { de: iso(utc(ano, mes - 1, 1)), ate: iso(utc(ano, mes, 0)) }
    case 'trimestre':
      return { de: iso(utc(ano, mes - (mes % 3), 1)), ate: hoje }
    case '12m':
      return { de: somarDias(hoje, -364), ate: hoje }
  }
}

/** Mensagem de erro de um período digitado, ou `null` se a API vai aceitar. */
export function erroDoPeriodo(p: Periodo) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.de) || !/^\d{4}-\d{2}-\d{2}$/.test(p.ate)) return 'Informe as duas datas.'
  if (p.de > p.ate) return 'A data inicial é depois da final.'
  if (diasNoPeriodo(p) > MAX_DIAS) return `O período pode ter até ${MAX_DIAS} dias.`
  return null
}

/** Balde do gráfico de evolução: dia até um mês, semana até ~4 meses, mês acima disso. */
export function granularidadeDoPeriodo(p: Periodo): 'dia' | 'semana' | 'mes' {
  const dias = diasNoPeriodo(p)
  return dias <= 31 ? 'dia' : dias <= 120 ? 'semana' : 'mes'
}
