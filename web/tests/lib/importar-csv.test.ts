import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { importarLinhas, LinhaIgnorada } from '@/lib/importar-csv'

const linhas = [{ n: 'a' }, { n: 'b' }, { n: 'c' }]

describe('importarLinhas', () => {
  it('relata aceitas e rejeitadas sem parar na primeira falha', async () => {
    const r = await importarLinhas(
      linhas,
      async (l) => {
        if (l.n === 'b') throw new Error('duplicado')
      },
      new AbortController().signal,
    )
    expect(r).toEqual({
      resultados: [{ linha: 2 }, { linha: 3, erro: 'duplicado', falha: 'rejeitada' }, { linha: 4 }],
      interrompida: false,
    })
  })

  it('cancelar no meio para o laço e devolve só o que foi enviado', async () => {
    const c = new AbortController()
    const enviadas: string[] = []
    const r = await importarLinhas(
      linhas,
      async (l) => {
        enviadas.push(l.n)
        if (l.n === 'b') c.abort()
      },
      c.signal,
    )
    expect(enviadas).toEqual(['a', 'b'])
    expect(r.interrompida).toBe(true)
    expect(r.resultados).toEqual([{ linha: 2 }, { linha: 3 }])
  })

  it('a linha que estava no ar ao cancelar não vira rejeitada', async () => {
    const c = new AbortController()
    const r = await importarLinhas(
      linhas,
      async () => {
        c.abort()
        throw new Error('request canceled')
      },
      c.signal,
    )
    expect(r).toEqual({ resultados: [], interrompida: true })
  })

  it('já abortado não envia nada', async () => {
    const c = new AbortController()
    c.abort()
    let chamadas = 0
    await importarLinhas(linhas, async () => void chamadas++, c.signal)
    expect(chamadas).toBe(0)
  })

  it('separa falha de rede (reenviar) de recusa da API (corrigir o CSV)', async () => {
    const rede = new AxiosError('Network Error', 'ERR_NETWORK')
    const recusa = new AxiosError('x', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 409,
      statusText: '',
      headers: {},
      config: {} as never,
      data: { error: { message: 'Registro duplicado' } },
    })
    const erros = [rede, recusa]
    const r = await importarLinhas(
      [{ n: 'a' }, { n: 'b' }],
      async () => {
        throw erros.shift()
      },
      new AbortController().signal,
    )
    expect(r.resultados).toEqual([
      { linha: 2, falha: 'rede', erro: 'Falha de rede: a linha não chegou à API. Reenvie.' },
      { linha: 3, falha: 'rejeitada', erro: 'Registro duplicado' },
    ])
  })

  it('linha ignorada de propósito não é rejeitada nem para o laço', async () => {
    const r = await importarLinhas(
      [{ n: 'a' }, { n: 'b' }],
      async (l) => {
        if (l.n === 'a') throw new LinhaIgnorada('Já cadastrada, ignorada.')
      },
      new AbortController().signal,
    )
    expect(r.resultados).toEqual([{ linha: 2, falha: 'ignorada', erro: 'Já cadastrada, ignorada.' }, { linha: 3 }])
  })
})
