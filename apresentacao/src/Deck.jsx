import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import QRCode from 'qrcode'
import { SLIDES } from './slides.jsx'
import { GraduationCap } from 'lucide-react'
import { Rail, EASE, SAI } from './components.jsx'
import { Logo } from './Tec.jsx'
import { BLOCOS } from './blocos.js'
import { usarSala, codigoDaSala, temServidor } from './sala.js'
import { CamadaDestaque, medir } from './Destaque.jsx'

// Link do controle: esta mesma página com #controle-<código da sala>.
const SALA = temServidor ? codigoDaSala() : null
const URL_CONTROLE = SALA ? `${location.origin}${location.pathname}#controle-${SALA}` : ''

const pagina = {
  oculto: {},
  // o conteúdo começa a subir enquanto a máscara do slide ainda está abrindo
  visivel: { transition: { staggerChildren: 0.06, delayChildren: 0.14 } },
}

function useEscala() {
  const [s, setS] = useState(1)
  useLayoutEffect(() => {
    const f = () => setS(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  return s
}

function lerInicio() {
  const h = location.hash.match(/^#slide-(\d+)$/) // ensaio: abre direto no slide N
  if (h) return Math.min(SLIDES.length - 1, Math.max(0, Number(h[1]) - 1))
  try { return Math.min(SLIDES.length - 1, Math.max(0, Number(sessionStorage.getItem('soufer:slide')) || 0)) } catch { return 0 }
}

export function Deck() {
  const escala = useEscala()
  const [[i, dir], setPos] = useState(() => [lerInicio(), 1])
  const [ajuda, setAjuda] = useState(false)
  const [qr, setQr] = useState('')
  const ir = useCallback((n) => setPos(([atual]) => {
    const alvo = Math.max(0, Math.min(SLIDES.length - 1, n))
    return alvo === atual ? [atual, 1] : [alvo, alvo > atual ? 1 : -1]
  }), [])
  const proximo = useCallback(() => setPos(([a]) => [Math.min(SLIDES.length - 1, a + 1), 1]), [])
  const anterior = useCallback(() => setPos(([a]) => [Math.max(0, a - 1), -1]), [])

  // destaque escolhido no celular; os objetos de cada slide vêm de objetos.js
  const [destaque, setDestaque] = useState(null)
  useEffect(() => { setDestaque(null) }, [i])
  const aoDestaque = (d) => {
    if (d.slide !== i) return
    const [, tipo, n] = d.id?.match(/^([a-z]+)-(\d+)$/) ?? []
    const el = tipo && document.querySelectorAll(`[data-slide="${i}"] [data-objeto="${tipo}"]`)[Number(n) - 1]
    if (!el) return setDestaque(null)
    setDestaque((ant) => ({ id: d.id, tipo: el.dataset.objeto, n: (ant?.n ?? 0) + 1, ...medir(el) }))
  }
  usarSala({ papel: 'palco', sala: SALA, estado: { slide: i, total: SLIDES.length, destaque: destaque?.id ?? null } }, (d) => {
    if (Number.isInteger(d?.slide)) ir(d.slide)
  }, () => {}, aoDestaque)

  useEffect(() => { try { sessionStorage.setItem('soufer:slide', String(i)) } catch { /* sem storage */ } }, [i])
  useEffect(() => { if (URL_CONTROLE) QRCode.toDataURL(URL_CONTROLE, { margin: 1, width: 360, color: { dark: '#1D1D1B', light: '#FFFFFF' } }).then(setQr).catch(() => {}) }, [])

  useEffect(() => {
    const tecla = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); proximo() }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); anterior() }
      else if (e.key === 'Home') ir(0)
      else if (e.key === 'End') ir(SLIDES.length - 1)
      else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.().catch(() => {})
      else if (e.key === 'c' || e.key === 'C' || e.key === '?') setAjuda((a) => !a)
      else if (e.key === 'Escape') setAjuda(false)
      else if (/^[1-9]$/.test(e.key)) {
        const b = BLOCOS[Number(e.key) - 1]
        if (b) ir(SLIDES.findIndex((s) => s.bloco === b.id))
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [proximo, anterior, ir])

  // toque/clique: metade direita avança, esquerda volta; arrastar também
  const toque = useRef(null)
  const onPointerDown = (e) => { toque.current = { x: e.clientX, t: Date.now() } }
  const onPointerUp = (e) => {
    const t0 = toque.current
    toque.current = null
    if (!t0 || ajuda) return
    const dx = e.clientX - t0.x
    if (Math.abs(dx) > 60) return dx < 0 ? proximo() : anterior()
    if (Date.now() - t0.t < 400) (e.clientX > window.innerWidth / 2 ? proximo : anterior)()
  }

  const slide = SLIDES[i]
  const C = slide.C
  const tela = slide.tipo === 'tela'
  // Troca de slide sem fade: o novo abre por máscara pela borda de onde vem e
  // desacelera; o antigo recua um pouco, escurece e sai acelerando por baixo.
  const variantesSlide = {
    entra: (d) => ({ x: d * '14%', zIndex: 2, clipPath: d > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }),
    centro: { x: 0, zIndex: 2, clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)', transition: { duration: 0.65, ease: EASE } },
    sai: (d) => ({ x: d * -8 + '%', zIndex: 1, filter: 'brightness(.78)', transition: { duration: 0.45, ease: SAI } }),
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="viewport" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div className="palco" style={{ transform: `scale(${escala})` }}>
          <AnimatePresence initial={false}>
            {tela && <Rail key="rail" blocoAtual={slide.bloco} />}
          </AnimatePresence>

          {/* conteúdo: dentro da "tela do app" ou em tela cheia */}
          <div className={tela ? 'tela-main' : 'camada'} style={{ transition: 'left 450ms var(--ease)' }}>
            {tela && (
              <header className="topo">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={slide.titulo} className="topo-titulo"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: EASE }}>{slide.titulo}</motion.span>
                </AnimatePresence>
                <span className="topo-meta">PI 2026.2 · {String(i + 1).padStart(2, '0')} / {SLIDES.length}</span>
              </header>
            )}
            <div className={tela ? 'conteudo' : 'camada'}>
              <AnimatePresence custom={dir} initial={false}>
                <motion.div key={i} data-slide={i} className="camada" custom={dir}
                  style={{ background: slide.tipo === 'escuro' ? 'var(--ink)' : 'var(--mist)' }}
                  variants={variantesSlide} initial="entra" animate="centro" exit="sai">
                  <motion.div className="camada" variants={pagina} initial="oculto" animate="visivel">
                    <C />
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
            {tela && slide.stack && (
              <motion.footer key={slide.titulo} className="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.5 }}>
                <span className="rotulo">Tecnologias</span>
                {slide.stack.itens.map((t) => <span key={t} className="stack-item"><Logo nome={t} tamanho={32} />{t}</span>)}
                <span className="stack-materia"><GraduationCap size={22} /><span><b>{slide.stack.materia}</b> · {slide.stack.prof}</span></span>
              </motion.footer>
            )}
            {tela && !slide.stack && <div className="stack" style={{ visibility: 'hidden' }} />}
          </div>

          {/* barra de progresso fina no rodapé */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'transparent', zIndex: 5 }}>
            <motion.div animate={{ scaleX: (i + 1) / SLIDES.length }} transition={{ duration: 0.5, ease: EASE }}
              style={{ height: '100%', background: 'var(--red)', transformOrigin: 'left' }} />
          </div>

          {SALA && <CamadaDestaque destaque={destaque} />}

          <AnimatePresence>
            {ajuda && (
              <motion.div className="ajuda" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerUp={(e) => { e.stopPropagation(); setAjuda(false) }}>
                <div className="ajuda-cartao">
                  {qr && <img src={qr} alt="QR code do controle remoto" style={{ width: 320, borderRadius: 12 }} />}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 22 }}>
                    <div style={{ fontSize: 34, fontWeight: 650 }}>Controle pelo celular</div>
                    <div style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.45 }}>
                      {URL_CONTROLE ? 'Escaneie o QR ou abra este link no celular:' : 'O controle só funciona na versão hospedada (apresentacao-pi.joaoaugusto.dev).'}
                    </div>
                    {URL_CONTROLE && <div className="mono" style={{ fontSize: 19, color: '#fff', wordBreak: 'break-all' }}>{URL_CONTROLE}</div>}
                    <div style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8, marginTop: 8 }}>
                      <kbd>→</kbd> <kbd>espaço</kbd> avança · <kbd>←</kbd> volta · <kbd>1</kbd>–<kbd>4</kbd> pula para cada apresentador · <kbd>F</kbd> tela cheia · <kbd>C</kbd> fecha
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  )
}
