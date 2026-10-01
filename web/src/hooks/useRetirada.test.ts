import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { buscarFerramentaPorTermo, identificarColaborador } from '@/hooks/useRetirada'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))
const get = vi.mocked(api.get)
const erroHttp = (status: number, error?: object) => ({ response: { status, data: { error } } })

beforeEach(() => get.mockReset())

describe('buscarFerramentaPorTermo', () => {
  it('código numérico usa /por-codigo e não lista', async () => {
    get.mockResolvedValueOnce({ data: { data: { id: 1, codigo_identificacao: 53 } } })
    const r = await buscarFerramentaPorTermo('SF000053')
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][0]).toBe('/ferramentas/por-codigo/53')
    expect(r.item).toMatchObject({ id: 1 })
  })

  it('404 em /por-codigo cai na busca por nome (nome numérico)', async () => {
    get.mockRejectedValueOnce(erroHttp(404))
    get.mockResolvedValueOnce({ data: { data: [{ id: 7, codigo_identificacao: 9, nome: 'Chave 53' }] } })
    expect((await buscarFerramentaPorTermo('53')).item).toMatchObject({ id: 7 })
  })

  it('erro de rede em /por-codigo não é engolido', async () => {
    get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(buscarFerramentaPorTermo('53')).rejects.toThrow('Network Error')
  })

  it('nome com vários resultados devolve ambíguos', async () => {
    const lista = [{ id: 1, codigo_identificacao: 1 }, { id: 2, codigo_identificacao: 2 }]
    get.mockResolvedValueOnce({ data: { data: lista } })
    expect(await buscarFerramentaPorTermo('chave de fenda')).toEqual({ item: null, ambiguos: lista })
  })
})

describe('identificarColaborador', () => {
  it('404 vira item nulo (abre o cadastro rápido)', async () => {
    get.mockRejectedValueOnce(erroHttp(404))
    expect(await identificarColaborador('zzz')).toEqual({ item: null, ambiguos: [] })
  })

  it('409 COLABORADOR_AMBIGUO traz os candidatos', async () => {
    const candidatos = [{ id: 1, nome: 'A', matricula: '1' }, { id: 2, nome: 'B', matricula: '2' }]
    get.mockRejectedValueOnce(erroHttp(409, { code: 'COLABORADOR_AMBIGUO', details: candidatos }))
    expect(await identificarColaborador('fulano')).toEqual({ item: null, ambiguos: candidatos })
  })

  it('outros erros sobem', async () => {
    get.mockRejectedValueOnce(erroHttp(500, { code: 'X' }))
    await expect(identificarColaborador('a')).rejects.toBeDefined()
  })
})
