import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1',
})

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

api.interceptors.request.use((config) => {
  if (authToken) {
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
    if (error.response?.status === 401) {
      handler401?.()
    }
    return Promise.reject(error)
  },
)
