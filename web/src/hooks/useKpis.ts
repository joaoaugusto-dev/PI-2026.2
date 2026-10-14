import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Rota de `GET /v1/kpis/:rota` mais os parâmetros dela (`de`/`ate` já incluídos nos KPIs de período). */
export interface ConsultaKpi {
  rota: string
  params: Record<string, string | number>
}

const chave = ({ rota, params }: ConsultaKpi) => ['kpis', rota, params] as const

const buscar = async <T,>({ rota, params }: ConsultaKpi) => (await api.get<{ data: T }>(`/kpis/${rota}`, { params })).data.data

/**
 * Um KPI. Ao trocar o período o cartão segura o número anterior (`isPlaceholderData`) em vez de piscar
 * skeleton; os cartões de resumo e o de evolução usam a mesma consulta e saem de uma requisição só.
 */
export function useKpi<T>(consulta: ConsultaKpi) {
  return useQuery({
    queryKey: chave(consulta),
    queryFn: () => buscar<T>(consulta),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

/** Mesmo dado do cartão, para a impressão e a planilha (usa o cache se o cartão já carregou). */
export const garantirKpi = <T,>(cliente: QueryClient, consulta: ConsultaKpi) =>
  cliente.ensureQueryData({ queryKey: chave(consulta), queryFn: () => buscar<T>(consulta), staleTime: 60_000 })

// Formatos de `docs/backend/api.md`, seção "KPIs de gestão".

export interface Evolucao {
  periodo: { de: string; ate: string }
  periodo_anterior: { de: string; ate: string }
  granularidade: 'dia' | 'semana' | 'mes'
  serie: { inicio: string; retiradas: number; devolucoes: number; ocorrencias: number }[]
  totais: Record<'atual' | 'anterior', Record<Metrica, number>>
  variacao_percentual: Record<Metrica, number | null>
}

export type Metrica = 'retiradas' | 'devolucoes' | 'ocorrencias'

export interface Itens<T> {
  itens: T[]
}

export interface ItemFerramenta {
  ferramenta_id: number
  ferramenta_nome: string
  codigo_identificacao: number | null
  categoria_nome: string
  total_retiradas: number
}

export interface ItemCategoria {
  categoria_id: number
  categoria_nome: string
  total_retiradas: number
}

export interface ItemSetor {
  setor_id: number
  setor_nome: string
  total_retiradas: number
}

export interface ItemColaborador {
  colaborador_id: number
  colaborador_nome: string
  matricula: string
  setor_nome: string
  total_retiradas: number
}

export interface ItemTempoPosse {
  categoria_nome: string
  total_devolucoes: number
  horas_medias: number
  dias_medios: number
}

export interface ItemTaxaAvaria {
  categoria_nome: string
  total_devolucoes: number
  total_avarias: number
  percentual: number
}

export interface OcorrenciasPorCategoria {
  total: number
  itens: { categoria_id: number; categoria_nome: string; total: number }[]
}

export interface IndisponiveisAgora {
  total_cadastradas: number
  total_indisponiveis: number
  percentual_do_parque: number
  por_motivo: { motivo: string; total: number }[]
}

export interface EmprestimosAbertos {
  total: number
  atrasados: number
  mais_antigos: {
    emprestimo_id: number
    ferramenta_nome: string
    codigo_identificacao: number | null
    categoria_nome: string
    data_retirada: string
    previsao_devolucao: string
    dias_aberto: number
  }[]
}
