import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Highlight } from 'prism-react-renderer'
import { Axe, Bolt, Cog, Drill, Hammer, Ruler, Toolbox, Wrench } from 'lucide-react'
import logoNegativo from './assets/logo-negativo.webp'
import { BLOCOS } from './blocos.js'

/* Um sistema de movimento só: chega desacelerando (quase todo o deslocamento
   nos primeiros quadros, cauda longa, sem quique) e sai acelerando. */
export const EASE = [0.16, 1, 0.3, 1]
export const SAI = [0.55, 0, 1, 0.45]

/* Filho de slide que entra em sequência: o pai (página) dispara o stagger.
   Não faz fade: sobe de dentro de uma máscara. O fade de 0,2 s só evita o
   quadro de "pisca" na borda da máscara. */
export const filho = {
  oculto: { opacity: 0, y: 40, clipPath: 'inset(-80px -80px 100% -80px)' },
  visivel: {
    opacity: 1, y: 0, clipPath: 'inset(-80px -80px -80px -80px)',
    transition: { duration: 0.65, ease: EASE, opacity: { duration: 0.2, ease: 'linear' } },
  },
}

/* Número que sobe contando e pousa no valor real (dado, não "redondo"). */
export function Contagem({ para }) {
  const alvo = Number(para)
  const v = useMotionValue(0)
  const texto = useTransform(v, (x) => Math.round(x))
  useEffect(() => {
    if (Number.isNaN(alvo)) return
    const c = animate(v, alvo, { duration: 1.1, delay: 0.45, ease: EASE })
    return () => c.stop()
  }, [alvo, v])
  return Number.isNaN(alvo) ? para : <motion.span>{texto}</motion.span>
}
export function Entra({ as = 'div', children, ...props }) {
  const C = motion[as]
  // minWidth 0: filho de grid/flex com código longo encolhe em vez de vazar
  return <C variants={filho} {...props} style={{ minWidth: 0, ...props.style }}>{children}</C>
}

/* ---------- código em "print" de snippet ---------- */
const tema = {
  plain: { color: '#EDEDEB' },
  styles: [
    { types: ['comment', 'prolog'], style: { color: '#7C7C79', fontStyle: 'italic' } },
    { types: ['keyword', 'builtin', 'important'], style: { color: '#FF5A63' } },
    { types: ['string', 'char', 'attr-value', 'template-string'], style: { color: '#F3C38B' } },
    { types: ['number', 'boolean'], style: { color: '#F3C38B' } },
    { types: ['function', 'class-name'], style: { color: '#FFFFFF', fontWeight: 600 } },
    { types: ['property', 'attr-name', 'parameter'], style: { color: '#C9D1D9' } },
    { types: ['punctuation', 'operator'], style: { color: '#8E8E8B' } },
    { types: ['tag', 'constant', 'symbol'], style: { color: '#FF8F95' } },
  ],
}

export function Codigo({ arquivo, codigo, lang = 'tsx', marcar = [], tamanho, style, preencher }) {
  return (
    <div className={preencher ? 'snip snip-cheio' : 'snip'} data-objeto="codigo" data-nome={arquivo} style={style}>
      <div className="snip-janela">
        <div className="snip-barra"><b /><b /><b /><span className="snip-arq">{arquivo}</span></div>
        <Highlight code={codigo.trim()} language={lang} theme={tema}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre style={tamanho ? { fontSize: tamanho } : undefined}>
              {tokens.map((linha, i) => {
                const props = getLineProps({ line: linha })
                return (
                  <span key={i} {...props} className={marcar.includes(i + 1) ? 'marcada' : undefined}>
                    <span className="ln">{i + 1}</span>
                    {linha.map((t, k) => <span key={k} {...getTokenProps({ token: t })} />)}
                    {'\n'}
                  </span>
                )
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}

/* ---------- textura de ferramentas (a mesma ideia do login do app) ---------- */
const icones = [Wrench, Hammer, Drill, Ruler, Cog, Axe, Toolbox, Bolt]
function aleatorio(semente) {
  let s = semente
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}
const grade = (() => {
  const r = aleatorio(7)
  const col = 24, lin = 14
  return Array.from({ length: col * lin }, (_, i) => ({
    I: icones[Math.floor(r() * icones.length)],
    x: ((i % col) + 0.5 + (r() - 0.5) * 0.7) * (100 / col),
    y: (Math.floor(i / col) + 0.5 + (r() - 0.5) * 0.7) * (100 / lin),
    rot: Math.floor(r() * 360),
    tam: 26 + r() * 16,
    op: 0.04 + r() * 0.07,
  }))
})()
export function Textura({ opacidade = 1 }) {
  return (
    <div className="textura" style={{ opacity: opacidade }} aria-hidden="true">
      {grade.map(({ I, x, y, rot, tam, op }, i) => (
        <I key={i} size={tam} strokeWidth={1.6}
          style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, opacity: op, transform: `translate(-50%,-50%) rotate(${rot}deg)` }} />
      ))}
    </div>
  )
}

/* ---------- status (forma + cor, nunca só cor) ---------- */
const st = { disp: ['b-disp', 'Disponível'], uso: ['b-uso', 'Em uso'], ind: ['b-ind', 'Indisponível'], atr: ['b-atr', 'Atrasado'] }
export function Status({ s, texto }) {
  const [c, l] = st[s]
  return <span className={`badge ${c}`}><i />{texto ?? l}</span>
}

/* ---------- foto da pessoa (ou iniciais, se não houver foto) ---------- */
export function Avatar({ pessoa, tamanho = 52 }) {
  return (
    <div className="avatar" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.35, overflow: 'hidden' }}>
      {pessoa.foto
        ? <img src={pessoa.foto} alt={pessoa.pessoa} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : pessoa.iniciais}
    </div>
  )
}

/* ---------- sidebar persistente ---------- */
export function Rail({ blocoAtual }) {
  const bloco = BLOCOS.find((b) => b.id === blocoAtual)
  return (
    <motion.aside className="rail"
      initial={{ x: -340 }} animate={{ x: 0 }} exit={{ x: -340 }}
      transition={{ duration: 0.45, ease: EASE }}>
      <div className="rail-logo"><img src={logoNegativo} alt="SOUFER Tools" /></div>
      <nav className="rail-nav">
        {/* destaque desliza até o bloco de quem está falando (64px + 6px de gap) */}
        <motion.div className="rail-ativo-fundo" initial={false}
          animate={{ y: BLOCOS.findIndex((b) => b.id === blocoAtual) * 70 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ inset: 'auto 16px auto 16px', top: 0, height: 64 }} />
        {BLOCOS.map((b) => (
          <div key={b.id} className={`rail-item${b.id === blocoAtual ? ' ativo' : ''}`}>
            <span>{b.nome}</span>
          </div>
        ))}
      </nav>
      <div className="rail-pe">
        <Avatar pessoa={bloco} />
        <motion.div key={bloco.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
          <div className="rail-pe-nome">{bloco.pessoa}</div>
          <div className="rail-pe-papel">{bloco.papel}</div>
        </motion.div>
      </div>
    </motion.aside>
  )
}

/* ---------- código de barras decorativo (etiqueta 50x25mm) ---------- */
export function Barras({ texto = '000094', largura = 300, altura = 92 }) {
  const r = aleatorio(texto.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 11) % 2147483646 + 1)
  const barras = []
  let x = 0
  while (x < largura) {
    const w = 2 + Math.floor(r() * 4) * 2
    if (barras.length % 2 === 0) barras.push(<rect key={x} x={x} y={0} width={w} height={altura} fill="#1D1D1B" />)
    else barras.push(null)
    x += w
  }
  return (
    <svg width={largura} height={altura + 30} viewBox={`0 0 ${largura} ${altura + 30}`} aria-label={`Código ${texto}`}>
      {barras}
      <text x={largura / 2} y={altura + 25} textAnchor="middle" fill="#1D1D1B" style={{ font: '500 21px var(--mono)', letterSpacing: '.3em' }}>{texto}</text>
    </svg>
  )
}
