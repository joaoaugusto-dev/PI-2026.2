import type { InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { anexarTokenSeNecessario, setAuthToken, setHandler401, tratarErroDeAutenticacao } from '@/lib/api'

function config(overrides: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return { headers: {}, ...overrides } as InternalAxiosRequestConfig
}

describe('anexarTokenSeNecessario', () => {
  beforeEach(() => setAuthToken(null))

  it('anexa o token global quando a chamada não define o próprio Authorization', () => {
    setAuthToken('token-global')
    const resultado = anexarTokenSeNecessario(config())
    expect(resultado.headers.Authorization).toBe('Bearer token-global')
  })

  it('não sobrescreve um Authorization já definido pela própria chamada', () => {
    setAuthToken('token-global')
    const resultado = anexarTokenSeNecessario(config({ headers: { Authorization: 'Bearer token-da-chamada' } as any }))
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

  it('chama handler401 num 401 comum', async () => {
    const handler = vi.fn()
    setHandler401(handler)
    const erro = { response: { status: 401 }, config: config() } as any

    await expect(tratarErroDeAutenticacao(erro)).rejects.toBe(erro)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('não chama handler401 quando a chamada marcou skipAuthHandler401', async () => {
    const handler = vi.fn()
    setHandler401(handler)
    const erro = { response: { status: 401 }, config: config({ skipAuthHandler401: true }) } as any

    await expect(tratarErroDeAutenticacao(erro)).rejects.toBe(erro)
    expect(handler).not.toHaveBeenCalled()
  })

  it('não chama handler401 em erro diferente de 401', async () => {
    const handler = vi.fn()
    setHandler401(handler)
    const erro = { response: { status: 500 }, config: config() } as any

    await expect(tratarErroDeAutenticacao(erro)).rejects.toBe(erro)
    expect(handler).not.toHaveBeenCalled()
  })
})
