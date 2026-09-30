import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

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
    /** Não anexa o `authToken` global nesta chamada mesmo que exista um ativo — usado por rotas públicas (ex. `POST /consulta/sessao`) que não devem carregar a credencial de uma sessão que porventura esteja ativa na mesma aba. */
    skipAuthToken?: boolean
    /** Não chama `handler401` (logout do almoxarife) se esta chamada específica levar 401 — usado pelo quiosque, cujo 401 é tratado localmente em ConsultaPage. */
    skipAuthHandler401?: boolean
  }
}

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

/** Exportado só para o teste de `api.test.ts` chamar direto, sem depender de rede/mocks. */
export function anexarTokenSeNecessario(config: InternalAxiosRequestConfig) {
  if (authToken && !config.headers.Authorization && !config.skipAuthToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
}

api.interceptors.request.use(anexarTokenSeNecessario)

// Token expirado/rejeitado pela API (ex.: usuário desativado, segredo
// rotacionado) — desloga mesmo com sessão persistida por 7 dias no cliente.
let handler401: (() => void) | null = null

export function setHandler401(fn: (() => void) | null) {
  handler401 = fn
}

/** Exportado só para o teste de `api.test.ts` chamar direto, sem depender de rede/mocks. */
export function tratarErroDeAutenticacao(error: AxiosError) {
  if (error.response?.status === 401 && !error.config?.skipAuthHandler401) {
    handler401?.()
  }
  return Promise.reject(error)
}

api.interceptors.response.use((response) => response, tratarErroDeAutenticacao)
