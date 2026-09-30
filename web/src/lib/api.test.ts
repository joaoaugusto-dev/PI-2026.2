import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { anexarTokenSeNecessario, setAuthToken, setHandler401, tratarErroDeAutenticacao } from '@/lib/api'

function config(overrides: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return { headers: {}, ...overrides } as InternalAxiosRequestConfig
}

// Objeto mínimo com só o que tratarErroDeAutenticacao lê (response.status e
// config) — não é um AxiosError de verdade (faltam message/name/toJSON/etc),
// por isso o cast passa por `unknown` em vez de mentir com `Partial`.
function erroAxios(overrides: { status: number; config?: InternalAxiosRequestConfig }): AxiosError {
  return { response: { status: overrides.status }, config: overrides.config ?? config() } as unknown as AxiosError
}

describe('anexarTokenSeNecessario', () => {
  beforeEach(() => setAuthToken(null))
  afterEach(() => setAuthToken(null))

  it('anexa o token global quando a chamada não define o próprio Authorization', () => {
    setAuthToken('token-global')
    const resultado = anexarTokenSeNecessario(config())
    expect(resultado.headers.Authorization).toBe('Bearer token-global')
  })

  it('não sobrescreve um Authorization já definido pela própria chamada', () => {
    setAuthToken('token-global')
    const cabecalhos = { Authorization: 'Bearer token-da-chamada' } as InternalAxiosRequestConfig['headers']
    const resultado = anexarTokenSeNecessario(config({ headers: cabecalhos }))
    expect(resultado.headers.Authorization).toBe('Bearer token-da-chamada')
  })

  it('não anexa o token global quando skipAuthToken é true', () => {
    setAuthToken('token-global')
    const resultado = anexarTokenSeNecessario(config({ skipAuthToken: true }))
    expect(resultado.headers.Authorization).toBeUndefined()
  })

  it('não anexa nada quando não há token global', () => {
    const resultado = anexarTokenSeNecessario(config())
    expect(resultado.headers.Authorization).toBeUndefined()
  })
})

describe('tratarErroDeAutenticacao', () => {
  beforeEach(() => setHandler401(null))
  afterEach(() => setHandler401(null))

  it('chama handler401 num 401 comum', async () => {
    const handler = vi.fn()
    setHandler401(handler)
    const erro = erroAxios({ status: 401 })

    await expect(tratarErroDeAutenticacao(erro)).rejects.toBe(erro)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('não chama handler401 quando a chamada marcou skipAuthHandler401', async () => {
    const handler = vi.fn()
    setHandler401(handler)
    const erro = erroAxios({ status: 401, config: config({ skipAuthHandler401: true }) })

    await expect(tratarErroDeAutenticacao(erro)).rejects.toBe(erro)
    expect(handler).not.toHaveBeenCalled()
  })

  it('não chama handler401 em erro diferente de 401', async () => {
    const handler = vi.fn()
    setHandler401(handler)
    const erro = erroAxios({ status: 500 })

    await expect(tratarErroDeAutenticacao(erro)).rejects.toBe(erro)
    expect(handler).not.toHaveBeenCalled()
  })
})
