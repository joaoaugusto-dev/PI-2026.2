import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api'
import { setModoDemo } from '@/lib/demo/adapter'

describe('modo demonstração', () => {
  afterEach(() => setModoDemo(false))

  it('responde com fixtures na hora, sem rede', async () => {
    setModoDemo(true)
    const t = Date.now()
    const { data } = await api.get('/emprestimos/calendario', { params: { mes: '2026-09' } })
    expect(data.data.length).toBeGreaterThan(0)
    expect(Date.now() - t).toBeLessThan(50)
    const lista = await api.get('/ferramentas', { params: { status: 'indisponivel' } })
    expect(lista.data.data.every((f: { status: string }) => f.status === 'indisponivel')).toBe(true)
  })

  it('rota sem fixture falha de imediato com 404', async () => {
    setModoDemo(true)
    await expect(api.get('/consulta/ferramentas')).rejects.toMatchObject({ response: { status: 404 } })
  })

  it('nunca chega na rede nem anexa credencial', async () => {
    setModoDemo(true)
    const r = await api.get('/setores')
    expect(r.config.headers.Authorization).toBeUndefined()
    expect(r.request).toEqual({})
  })

  it('cadastra, edita e inativa em memória', async () => {
    setModoDemo(true)
    const { data: novo } = await api.post('/setores', { nome: 'Setor Demo Z' })
    await api.patch(`/setores/${novo.data.id}`, { nome: 'Setor Demo Y' })
    expect((await api.get('/setores', { params: { q: 'demo y' } })).data.data).toHaveLength(1)
    await api.delete(`/setores/${novo.data.id}`)
    expect((await api.get('/setores', { params: { q: 'demo y' } })).data.data).toHaveLength(0)
  })

  it('DELETE de id inexistente dá 404 e não apaga o último item', async () => {
    setModoDemo(true)
    const antes = (await api.get('/setores')).data.meta.total
    await expect(api.delete('/setores/999999')).rejects.toMatchObject({ response: { status: 404 } })
    expect((await api.get('/setores')).data.meta.total).toBe(antes)
  })

  it('respeita o cancelamento', async () => {
    setModoDemo(true)
    const c = new AbortController()
    c.abort()
    await expect(api.get('/setores', { signal: c.signal })).rejects.toMatchObject({ code: 'ERR_CANCELED' })
  })

  it('não esconde erro que não é "não encontrado" (corpo malformado)', async () => {
    setModoDemo(true)
    const malformado = { headers: { 'Content-Type': 'text/plain' }, transformRequest: [(d: unknown) => d] }
    await expect(api.post('/setores', '{quebrado', malformado)).rejects.toThrow(SyntaxError)
  })
})
