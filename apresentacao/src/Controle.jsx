import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { SLIDES } from './slides.jsx'
import { BLOCOS } from './blocos.js'
import { usarSala } from './sala.js'
import { vibrar, AVISOS } from './vibrar.js'
import { MapaObjetos } from './MapaObjetos.jsx'
import logoNegativo from './assets/logo-negativo.webp'

/* Controle remoto no celular (#controle): passa slide, mostra as notas de
   quem está falando e o cronômetro do bloco contra o tempo combinado. */
const fmt = (s) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, '0')}`

export function Controle({ sala }) {
  const { ativo, conectado, presenca, estadoRemoto, enviar, enviarDestaque } = usarSala({ papel: 'controle', sala })
  const [aba, setAba] = useState('notas')
  const palco = presenca.palco > 0
  const slide = palco && Number.isInteger(estadoRemoto?.slide) ? Math.min(SLIDES.length - 1, estadoRemoto.slide) : null
  const atual = slide !== null ? SLIDES[slide] : null
  const bloco = atual ? BLOCOS.find((b) => b.id === atual.bloco) : null

  // cronômetro por bloco: zera quando o palco entra num bloco novo
  // `cron.id` diz de qual bloco é o início: enquanto não bate com o bloco
  // atual (o render da troca), não se calcula aviso com o tempo do anterior
  const [cron, setCron] = useState({ id: null, inicio: Date.now() })
  const inicio = cron.inicio
  const setInicio = (t) => setCron((c) => ({ ...c, inicio: t }))
  const [, tique] = useState(0)
  useEffect(() => {
    if (bloco && bloco.id !== cron.id) setCron({ id: bloco.id, inicio: Date.now() })
  }, [bloco, cron.id])
  useEffect(() => { const id = setInterval(() => tique((n) => n + 1), 500); return () => clearInterval(id) }, [])

  const decorrido = (Date.now() - inicio) / 1000
  const restante = bloco ? bloco.seg - decorrido : 0
  const fracao = bloco ? Math.min(1, decorrido / bloco.seg) : 0
  const corTempo = restante < 0 ? 'var(--red)' : restante < 30 ? 'var(--late)' : '#fff'

  // vibra uma vez em cada marco (30 s, 10 s, fim); zera junto com o cronômetro
  const avisados = useRef(new Set())
  useEffect(() => { avisados.current = new Set() }, [inicio])
  useEffect(() => {
    if (!bloco || cron.id !== bloco.id) return
    const alcancado = AVISOS.filter((a) => restante <= a.seg).at(-1) // o marco mais avançado já cruzado
    if (!alcancado || avisados.current.has(alcancado.seg)) return
    AVISOS.filter((a) => a.seg >= alcancado.seg).forEach((a) => avisados.current.add(a.seg)) // os anteriores não vibram depois
    vibrar(alcancado.padrao)
  })

  const telaAcesa = useRef(null)
  const manterAcesa = () => {
    if (telaAcesa.current || !navigator.wakeLock) return
    navigator.wakeLock.request('screen').then((l) => { telaAcesa.current = l; l.addEventListener('release', () => { telaAcesa.current = null }) }).catch(() => {})
  }

  const mandar = (n) => {
    if (slide === null) return
    vibrar(12)
    enviar(Math.max(0, Math.min(SLIDES.length - 1, n)))
  }

  const estado = !ativo
    ? 'Escaneie o QR code da apresentação: tecla C no computador.'
    : !conectado ? 'Conectando…'
    : !palco ? 'Abra a apresentação no computador. Este controle encontra ela sozinho.'
    : slide === null ? 'Esperando o palco…'
    : null

  return (
    <div onPointerDown={manterAcesa} style={{
      position: 'fixed', inset: 0, background: 'var(--ink)', color: '#fff', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 18,
      paddingTop: 'max(18px, env(safe-area-inset-top, 0px))', paddingBottom: 'max(18px, env(safe-area-inset-bottom, 0px))',
      paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={logoNegativo} alt="SOUFER Tools" style={{ width: 140 }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,.6)' }}>
          <i style={{ width: 8, height: 8, borderRadius: '50%', background: palco ? 'var(--ok)' : 'var(--gray)', display: 'block' }} />
          {palco ? 'conectado ao palco' : 'sem palco'}
        </span>
      </div>

      {estado ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: 18, lineHeight: 1.5, color: 'rgba(255,255,255,.75)', padding: '0 12px' }}>{estado}</div>
      ) : (
        <>
          {/* quem fala + cronômetro (compacto, uma linha) */}
          <div style={{ background: '#262624', borderRadius: 14, padding: '10px 12px 10px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bloco.nome}</div>
                <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bloco.pessoa}</div>
              </div>
              <span className="mono num" style={{ fontSize: 28, fontWeight: 600, color: corTempo, flex: 'none' }}>{fmt(restante)}</span>
              <button type="button" onClick={() => setInicio(Date.now())} aria-label="Zerar cronômetro"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 10, width: 40, height: 40, display: 'grid', placeItems: 'center', flex: 'none' }}>
                <RotateCcw size={16} />
              </button>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: corTempo === '#fff' ? 'var(--red)' : corTempo, transform: `scaleX(${fracao})`, transformOrigin: 'left', transition: 'transform 500ms linear' }} />
            </div>
          </div>

          {/* slide atual + notas ou mapa de objetos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{atual.titulo}</span>
              <span className="mono num" style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', flex: 'none' }}>{slide + 1} / {SLIDES.length}</span>
            </div>
            <div role="tablist" style={{ flex: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 12, background: '#262624' }}>
              {[['notas', 'Notas'], ['objetos', 'Objetos']].map(([id, nome]) => (
                <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)}
                  style={{ height: 40, borderRadius: 9, border: 0, font: '600 15px var(--sans)', color: '#fff', background: aba === id ? 'rgba(255,255,255,.14)' : 'transparent' }}>
                  {nome}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aba === 'notas' ? (
              <>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
                  {atual.notas.map((n) => (
                    <li key={n} style={{ fontSize: 18, lineHeight: 1.45, paddingLeft: 16, borderLeft: '3px solid var(--red)' }}>{n}</li>
                  ))}
                </ul>
                {SLIDES[slide + 1] && (
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 'auto' }}>
                    Próximo: {SLIDES[slide + 1].titulo}
                    {SLIDES[slide + 1].bloco !== atual.bloco && ` · passa para ${BLOCOS.find((b) => b.id === SLIDES[slide + 1].bloco).pessoa.split(' ')[0]}`}
                  </div>
                )}
              </>
            ) : (
              <MapaObjetos slide={slide} tela={atual.tipo === 'tela'} destaque={estadoRemoto?.destaque} aoEscolher={(id) => enviarDestaque(slide, id)} />
            )}
            </div>
          </div>

          {/* atalhos por apresentador */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flex: 'none' }}>
            {BLOCOS.map((b) => (
              <button key={b.id} type="button" onClick={() => mandar(SLIDES.findIndex((s) => s.bloco === b.id))}
                style={{ height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,.14)', background: b.id === bloco.id ? 'rgba(255,255,255,.12)' : 'transparent', color: '#fff', font: '600 14px var(--sans)' }}>
                {b.pessoa.split(' ')[0]}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, flex: 'none' }}>
            <button type="button" onClick={() => mandar(slide - 1)} disabled={slide === 0} aria-label="Slide anterior"
              style={{ height: 96, borderRadius: 16, border: '1px solid rgba(255,255,255,.18)', background: 'transparent', color: '#fff', display: 'grid', placeItems: 'center', opacity: slide === 0 ? 0.35 : 1 }}>
              <ChevronLeft size={40} />
            </button>
            <button type="button" onClick={() => mandar(slide + 1)} disabled={slide === SLIDES.length - 1}
              style={{ height: 96, borderRadius: 16, border: 0, background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, font: '650 22px var(--sans)', opacity: slide === SLIDES.length - 1 ? 0.35 : 1 }}>
              Próximo <ChevronRight size={34} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
