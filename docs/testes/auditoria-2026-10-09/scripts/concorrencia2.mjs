// Corridas e carga de escrita contra a API. uso: node concorrencia.mjs <tokenManut> <saida.json>
import fs from 'node:fs'
const [, , token, out] = process.argv
const B = 'http://localhost:3998/v1'
const H = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
const call = async (method, path, body) => {
  const s = performance.now()
  const r = await fetch(B + path, { method, headers: H, body: body && JSON.stringify(body) })
  const j = await r.json().catch(() => null)
  return { status: r.status, j, ms: performance.now() - s }
}
const tally = (rs) => rs.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {})
const res = {}

const disp = (await call('GET', '/ferramentas?status=disponivel&limit=100&page=3')).j.data.map((f) => f.id)
const colab = (await call('GET', '/colaboradores?limit=50')).j.data
const prev = (await call('GET', '/emprestimos/previsao-sugerida?dias=2')).j.data.previsaoDevolucao
const corpo = (fid, i = 0) => ({ ferramentaId: fid, colaboradorId: colab[i % colab.length].id, setorDestinoId: colab[i % colab.length].setor_id, previsaoDevolucao: prev, usuarioRetiradaId: 999 })

// 1) 50 retiradas simultâneas da MESMA ferramenta
{
  const fid = disp[0]
  const rs = await Promise.all(Array.from({ length: 50 }, (_, i) => call('POST', '/emprestimos', corpo(fid, i))))
  const ok = rs.find((r) => r.status === 201)
  res.corridaRetirada = { tentativas: 50, statuses: tally(rs), usuarioRetiradaIgnorado: ok?.j?.data?.usuario_retirada_nome, emprestimoId: ok?.j?.data?.id }
  // 2) 30 devoluções simultâneas (avaria) do MESMO empréstimo
  const ds = await Promise.all(Array.from({ length: 30 }, () => call('PATCH', `/emprestimos/${ok.j.data.id}/devolucao`, { condicaoDevolucao: 'avaria', observacaoDevolucao: 'teste corrida', custoEstimado: 10 })))
  const oc = (await call('GET', `/ocorrencias?ferramentaId=${fid}`)).j
  const f = (await call('GET', `/ferramentas/${fid}`)).j.data
  res.corridaDevolucao = { tentativas: 30, statuses: tally(ds), resumo: ds.find((d) => d.status === 200)?.j?.data?.resumo, ocorrenciasDaFerramenta: oc?.meta?.total ?? oc?.data?.length, statusFinal: f.status, motivo: f.motivo_indisponivel }
}
// 3) 30 cadastros simultâneos de ferramenta: códigos devem ser todos distintos
{
  const rs = await Promise.all(Array.from({ length: 30 }, (_, i) => call('POST', '/ferramentas', { nome: `Corrida cadastro ${i}`, grupoId: 1 })))
  const cods = rs.filter((r) => r.status === 201).map((r) => r.j.data.codigo_identificacao)
  res.corridaCadastro = { tentativas: 30, statuses: tally(rs), codigosDistintos: new Set(cods).size, criados: cods.length }
}
// 4) carga de escrita: 20 operadores, cada um com sua ferramenta, retirada -> devolução em laço por 20 s
{
  const fims = performance.now() + 20000
  const lat = { retirada: [], devolucao: [] }
  const st = {}
  await Promise.all(disp.slice(10, 30).map(async (fid, i) => {
    while (performance.now() < fims) {
      const r = await call('POST', '/emprestimos', corpo(fid, i))
      st[r.status] = (st[r.status] ?? 0) + 1; lat.retirada.push(r.ms)
      if (r.status !== 201) continue
      const d = await call('PATCH', `/emprestimos/${r.j.data.id}/devolucao`, { condicaoDevolucao: 'ok' })
      st[d.status] = (st[d.status] ?? 0) + 1; lat.devolucao.push(d.ms)
    }
  }))
  const p = (a, q) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(q * (s.length - 1))].toFixed(1) }
  res.cargaEscrita = { operadores: 20, segundos: 20, statuses: st, ciclos: lat.devolucao.length, opsPorSeg: +((lat.retirada.length + lat.devolucao.length) / 20).toFixed(1),
    retirada: { p50: p(lat.retirada, .5), p95: p(lat.retirada, .95), p99: p(lat.retirada, .99) }, devolucao: { p50: p(lat.devolucao, .5), p95: p(lat.devolucao, .95), p99: p(lat.devolucao, .99) } }
}
fs.writeFileSync(out, JSON.stringify(res, null, 1))
console.log(JSON.stringify(res, null, 1))
