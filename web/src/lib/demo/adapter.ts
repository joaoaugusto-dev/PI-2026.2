import { AxiosError, CanceledError, type InternalAxiosRequestConfig } from 'axios'
import * as dados from './fixtures'

/** Respostas do modo demonstração (ver `flag.ts`): roteia a chamada para as fixtures em memória. */
type Rota = (params: Record<string, unknown>, url: string[], body: Record<string, unknown>) => unknown

function pagina<T>(lista: T[], params: Record<string, unknown>) {
  const limit = Number(params.limit ?? 20)
  const page = Number(params.page ?? 1)
  return {
    data: lista.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: lista.length, totalPages: Math.max(1, Math.ceil(lista.length / limit)) },
  }
}

/** Só este erro vira 404 na demo; qualquer outro (JSON malformado, bug de fixture) aparece como é. */
class NaoEncontradoDemo extends Error {}

/** Remove pelo id; lança se não existir (vira 404) — `splice(-1, 1)` apagaria o último item. */
function remover<T extends { id: number }>(lista: T[], id: number) {
  const i = lista.findIndex((item) => item.id === id)
  if (i === -1) throw new NaoEncontradoDemo()
  lista.splice(i, 1)
}

const snake = (k: string) => k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
const paraSnake = (corpo: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(corpo).map(([k, v]) => [snake(k), v]))

/** POST / PATCH /:id / DELETE /:id em memória (some ao recarregar a página). `DELETE` = inativar, como na API. */
function crud<T extends { id: number }>(
  recurso: string,
  lista: T[],
  novo: (id: number) => Partial<T>,
): Record<string, Rota> {
  return {
    [`POST ${recurso}`]: (_, __, corpo) => {
      const item = { id: Math.max(0, ...lista.map((i) => i.id)) + 1, ...novo(0), ...paraSnake(corpo) } as T
      lista.push(item)
      return { data: item }
    },
    [`PATCH ${recurso}/:id`]: (_, [id], corpo) => {
      const item = lista.find((i) => i.id === Number(id))
      if (!item) throw new NaoEncontradoDemo()
      Object.assign(item, paraSnake(corpo))
      return { data: item }
    },
    [`DELETE ${recurso}/:id`]: (_, [id]) => {
      remover(lista, Number(id))
      return { data: { id: Number(id) } }
    },
  }
}

const filtrarNome = <T extends { nome: string }>(lista: T[], q: unknown) =>
  lista.filter((i) => !q || i.nome.toLowerCase().includes(String(q).toLowerCase()))

const rotas: Record<string, Rota> = {
  ...crud('setores', dados.setores, () => ({})),
  ...crud('categorias', dados.categorias, () => ({})),
  ...crud('colaboradores', dados.colaboradores, () => ({ setor_id: null })),
  ...crud('ferramentas', dados.ferramentas, () => ({
    descricao: null,
    marca: null,
    modelo: null,
    subgrupo_id: null,
    setor_id: null,
    localizacao: null,
    status: 'disponivel' as const,
    motivo_indisponivel: null,
    etiqueta_impressa_em: null,
    foto_url: null,
    ativo: true,
    created_at: new Date().toISOString(),
    codigo_identificacao: 999900 + dados.ferramentas.length,
  })),
  'GET colaboradores': (p) =>
    pagina(
      dados.colaboradores.filter(
        (c) => !p.q || [c.nome, c.matricula].some((v) => v.toLowerCase().includes(String(p.q).toLowerCase())),
      ),
      p,
    ),
  'GET health': () => ({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 0,
      environment: 'demo',
      database: { status: 'connected', name: 'demo', serverTime: new Date().toISOString(), error: null },
    },
  }),
  'POST colaboradores/:id/convite': () => ({ data: { token: 'D'.repeat(43), expiraEm: new Date(Date.now() + 7 * 864e5).toISOString() } }),
  'GET setores': (p) => pagina(filtrarNome(dados.setores, p.q), p),
  'GET categorias': (p) => pagina(filtrarNome(dados.categorias, p.q), p),
  'GET ferramentas': (p) => {
    const q = String(p.q ?? '').toLowerCase()
    return pagina(
      dados.ferramentas.filter(
        (f) =>
          (!p.status || f.status === p.status) &&
          (!p.grupoId || f.grupo_id === Number(p.grupoId)) &&
          (!q || f.nome.toLowerCase().includes(q)),
      ),
      p,
    )
  },
  'GET ferramentas/:id': (_, [id]) => {
    const f = dados.ferramentas.find((x) => x.id === Number(id))
    if (!f) throw new NaoEncontradoDemo()
    return { data: f }
  },
  'GET ferramentas/:id/historico': (_, [id]) => ({ data: dados.historicoDe(Number(id)) }),
  'GET colaboradores/:id': (_, [id]) => ({ data: dados.colaboradores.find((c) => c.id === Number(id)) }),
  'GET emprestimos': (p) => {
    const q = String(p.q ?? '').toLowerCase()
    return pagina(
      dados.emprestimos.filter(
        (e) =>
          (!p.situacao || e.situacao === p.situacao) &&
          (!p.setorId || e.setor_id === Number(p.setorId)) &&
          (!q ||
            [e.ferramenta_nome, e.colaborador_nome, e.colaborador_matricula].some((c) => c.toLowerCase().includes(q))),
      ),
      p,
    )
  },
  'GET emprestimos/calendario': (p) => ({ data: dados.calendarioDoMes(String(p.mes)) }),
}

function casar(metodo: string, caminho: string) {
  const partes = caminho.split('/')
  for (const [chave, rota] of Object.entries(rotas)) {
    const [m, padrao] = chave.split(' ')
    const pp = padrao.split('/')
    if (m !== metodo || pp.length !== partes.length) continue
    const capturas: string[] = []
    if (pp.every((p, i) => (p.startsWith(':') ? capturas.push(partes[i]) : p === partes[i]))) return { rota, capturas }
  }
}

export function demoAdapter(config: InternalAxiosRequestConfig) {
  if (config.signal?.aborted) return Promise.reject(new CanceledError(undefined, config))
  const caminho = (config.url ?? '').replace(/^\/|\/$/g, '')
  const achada = casar((config.method ?? 'get').toUpperCase(), caminho)
  const resposta = (status: number, data: unknown) => ({
    data,
    status,
    statusText: '',
    headers: {},
    config,
    request: {},
  })
  if (!achada) {
    const erro = { error: { code: 'DEMO_INDISPONIVEL', message: 'Não disponível no modo demonstração.', details: [] } }
    return Promise.reject(new AxiosError(erro.error.message, 'ERR_BAD_REQUEST', config, {}, resposta(404, erro)))
  }
  try {
    const corpo = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {})
    return Promise.resolve(resposta(200, achada.rota(config.params ?? {}, achada.capturas, corpo)))
  } catch (e) {
    if (!(e instanceof NaoEncontradoDemo)) return Promise.reject(e)
    return Promise.reject(new AxiosError('Registro não encontrado', 'ERR_BAD_REQUEST', config, {}, resposta(404, {})))
  }
}
