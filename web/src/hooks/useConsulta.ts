import { useMutation, useQuery } from '@tanstack/react-query'
import type { FiltrosFerramentas, StatusFerramenta } from '@/hooks/useFerramentas'
import { api } from '@/lib/api'

export interface ColaboradorConsulta {
  id: number
  nome: string
  matricula: string
  papel: 'consulta'
}

export interface SessaoConsulta {
  token: string
  colaborador: ColaboradorConsulta
}

/** Item de `GET /v1/consulta/ferramentas`: só o que o quiosque pode mostrar (sem colaborador, histórico nem valores). */
export interface FerramentaConsulta {
  id: number
  nome: string
  categoria: string
  status: StatusFerramenta
  localizacao: string | null
  codigo_identificacao: number | null
}

interface ListaFerramentasResponse {
  data: FerramentaConsulta[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

/**
 * Abre a sessão de 15 min do quiosque (`POST /v1/consulta/sessao`) — só a
 * matrícula, sem senha (Regra 8). Rota pública: `skipAuthToken` evita
 * carregar o token de uma sessão de almoxarife que porventura esteja ativa
 * na mesma aba — a rota não usa essa credencial, mas não faz sentido
 * mandá-la mesmo assim.
 */
export function useIniciarSessaoConsulta() {
  return useMutation({
    mutationFn: async (matricula: string) => {
      const { data } = await api.post<{ data: SessaoConsulta }>(
        '/consulta/sessao',
        { identificador: matricula },
        { skipAuthToken: true },
      )
      return data.data
    },
  })
}

/**
 * Mesma busca de `/ferramentas`, exclusiva do papel `consulta`, com só nome, categoria, status e localização. Recebe o
 * token da sessão do quiosque por parâmetro e o manda só nesta chamada
 * (`skipAuthHandler401`), em vez de setar o token global de `@/lib/api` —
 * assim uma sessão de almoxarife ativa na mesma aba não é sobrescrita nem
 * derrubada por um 401 que é só do quiosque.
 */
export function useConsultaFerramentas(filtros: FiltrosFerramentas, token: string | null) {
  return useQuery({
    queryKey: ['consulta', 'ferramentas', filtros],
    queryFn: async () => {
      const { data } = await api.get<ListaFerramentasResponse>('/consulta/ferramentas', {
        params: filtros,
        headers: { Authorization: `Bearer ${token}` },
        skipAuthHandler401: true,
      })
      return data
    },
    enabled: !!token,
    placeholderData: (dadoAnterior) => dadoAnterior,
    // Quiosque público: paginar/trocar filtro e voltar não deveria bater na
    // rede de novo a cada foco de janela/remontagem. 15s é curto o bastante
    // pra continuar refletindo mudança de status, sem refetch a cada clique.
    staleTime: 15_000,
    retry: 1,
  })
}

export interface GrupoConsulta {
  nome: string
  categoria: string
  itens: FerramentaConsulta[]
  disponiveis: number
}

/**
 * Junta unidades iguais (mesmo nome e categoria, vizinhas — a API ordena por nome) num cartão só: quem vai ao
 * quiosque pergunta "tem chave allen 10?", não quer ler a mesma linha 5 vezes.
 * ponytail: agrupa só dentro da página; um grupo pode partir na virada de página (página de 100 deixa isso raro).
 * Se incomodar, a API passa a devolver o agregado por nome.
 */
export function agruparPorNome(ferramentas: FerramentaConsulta[]): GrupoConsulta[] {
  const grupos: GrupoConsulta[] = []
  for (const f of ferramentas) {
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo.nome === f.nome && ultimo.categoria === f.categoria) ultimo.itens.push(f)
    else grupos.push({ nome: f.nome, categoria: f.categoria, itens: [f], disponiveis: 0 })
  }
  for (const g of grupos) g.disponiveis = g.itens.filter((f) => f.status === 'disponivel').length
  return grupos
}
