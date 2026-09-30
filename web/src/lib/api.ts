import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1',
})

// O quiosque de consulta (ConsultaPage) passa o próprio token por chamada,
// em vez de usar este `authToken` global — dá pra ter a sessão do
// almoxarife (restaurada do localStorage pelo AuthProvider) e o quiosque
// ativos na mesma aba sem um pisar no token do outro. Requisição com
// Authorization explícito no config vence o token global (linha abaixo).
declare module 'axios' {
  interface AxiosRequestConfig {
    /** Não chama `handler401` (logout do almoxarife) se esta chamada específica levar 401 — usado pelo quiosque, cujo 401 é tratado localmente em ConsultaPage. */
    skipAuthHandler401?: boolean
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

api.interceptors.request.use((config) => {
  if (authToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

// Token expirado/rejeitado pela API (ex.: usuário desativado, segredo
// rotacionado) — desloga mesmo com sessão persistida por 7 dias no cliente.
let handler401: (() => void) | null = null

export function setHandler401(fn: (() => void) | null) {
  handler401 = fn
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthHandler401) {
      handler401?.()
    }
    return Promise.reject(error)
  },
)
