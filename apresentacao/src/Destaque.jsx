import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE, SAI } from './components.jsx'

/* Destaque de um objeto do slide, escolhido no mapa do celular. Desenhado
   numa camada por cima do palco (não mexe no elemento, que tem o transform
   dele dono do motion).

   Uma gramática só, de câmera: o resto do slide escurece e o foco FECHA em
   cima do objeto, vindo de um enquadramento maior (chega desacelerando, sai
   acelerando, sem mola e sem contorno brilhante). Cada tipo tem um verbo
   próprio, e o vermelho só aparece nele, sempre com o mesmo sentido: "olhe
   aqui".
     titulo   grifado, linha a linha
     lista    uma faixa percorre os itens, um de cada vez
     grafico  uma cabeça de leitura varre da esquerda para a direita
     kpi      o cartão dá um passo à frente
     grupo    o conjunto dá um passo à frente
     imagem, diagrama, codigo, celular   sobem até o centro, ampliados,
              legíveis do fundo da sala; o código acende as linhas marcadas */
const VERMELHO = '#E30613'
const TINTA = '12,12,11'
const sai = { opacity: 0, transition: { duration: 0.22, ease: SAI } }

// Foco: escurece tudo menos o objeto. O recorte (com o raio do objeto) fecha
// de 1,3x para 1x; a sombra de 4000px é o escurecimento.
function Foco({ r, folga = 14, raio = 16, escuro = 0.5 }) {
  return (
    <motion.div exit={sai} initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE, opacity: { duration: 0.2, ease: 'linear' } }}
      style={{ position: 'absolute', left: r.x - folga, top: r.y - folga, width: r.w + folga * 2, height: r.h + folga * 2, borderRadius: raio, boxShadow: `0 0 0 4000px rgba(${TINTA},${escuro})` }} />
  )
}

function Titulo({ d }) {
  // o recorte abraça as linhas de texto, não o bloco (que pode ter outro texto junto)
  const x0 = Math.min(...d.linhas.map((l) => l.x)), y0 = Math.min(...d.linhas.map((l) => l.y))
  const x1 = Math.max(...d.linhas.map((l) => l.x + l.w)), y1 = Math.max(...d.linhas.map((l) => l.y + l.h))
  return (
    <>
      <Foco r={{ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }} folga={22} raio={14} escuro={0.34} />
      {d.linhas.map((l, k) => (
        <motion.div key={k} exit={sai} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.55, delay: 0.25 + k * 0.22, ease: EASE }}
          style={{ position: 'absolute', left: l.x - 12, top: l.y + l.h * 0.16, width: l.w + 24, height: l.h * 0.72, borderRadius: 6, background: 'rgba(227,6,19,.26)', transformOrigin: 'left', skewX: -4 }} />
      ))}
    </>
  )
}

// Uma faixa pousa no primeiro item e percorre os demais, parando em cada um.
function Lista({ d }) {
  const itens = d.filhos.length ? d.filhos : [d.r]
  const [i, setI] = useState(0)
  useEffect(() => {
    if (i >= itens.length - 1) return
    const t = setTimeout(() => setI(i + 1), 700)
    return () => clearTimeout(t)
  }, [i, itens.length])
  const a = itens[i]
  const caixa = { left: a.x - 12, top: a.y - 6, width: a.w + 24, height: a.h + 12 }
  return (
    <>
      <Foco r={d.r} folga={16} raio={14} escuro={0.45} />
      <motion.div exit={sai} initial={{ opacity: 0, ...caixa }} animate={{ opacity: 1, ...caixa }}
        transition={{ duration: 0.45, ease: EASE, opacity: { duration: 0.2, ease: 'linear' } }}
        style={{ position: 'absolute', borderRadius: 8, background: 'rgba(227,6,19,.22)' }} />
    </>
  )
}

// Cabeça de leitura: passa uma vez pelos dados e sai pela direita.
function Grafico({ d }) {
  const f = 14
  return (
    <>
      <Foco r={d.r} folga={f} raio={18} escuro={0.5} />
      <motion.div exit={sai} style={{ position: 'absolute', left: d.r.x, top: d.r.y - f, width: d.r.w, height: d.r.h + f * 2, overflow: 'hidden', borderRadius: 18 }}>
        <motion.div initial={{ x: -160 }} animate={{ x: d.r.w }} transition={{ duration: 1.6, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 160, background: 'linear-gradient(90deg, transparent, rgba(227,6,19,.2))', borderRight: `3px solid ${VERMELHO}` }} />
      </motion.div>
    </>
  )
}

// Eleva uma cópia do próprio objeto: nasce exatamente em cima dele (sem
// salto) e sobe para o centro ('centro') ou dá um passo à frente ('lugar').
// Ao apagar, volta para onde estava, acelerando.
function Elevar({ d, modo = 'centro' }) {
  const { r } = d
  const lugar = modo === 'lugar'
  const k = lugar
    ? Math.max(1, Math.min(d.tipo === 'kpi' ? 1.14 : 1.05, 1840 / r.w, 1000 / r.h))
    : Math.max(1, Math.min(1720 / r.w, 940 / r.h, 2.2))
  const alvo = lugar
    ? { x: -(r.w * (k - 1)) / 2, y: -(r.h * (k - 1)) / 2 }
    : { x: (1920 - r.w * k) / 2 - r.x, y: (1080 - r.h * k) / 2 - r.y }
  return (
    <>
      <motion.div exit={sai} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0, background: `rgba(${TINTA},${lugar ? 0.55 : 0.74})`, backdropFilter: `blur(${lugar ? 6 : 10}px)` }} />
      <motion.div
        initial={{ x: 0, y: 0, scale: 1 }} animate={{ ...alvo, scale: k }}
        exit={{ x: 0, y: 0, scale: 1, transition: { duration: 0.32, ease: SAI } }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, transformOrigin: '0 0', filter: 'drop-shadow(0 40px 60px rgba(0,0,0,.45))' }}>
        {/* depois de pousar, empurra devagar: o quadro parado ainda respira */}
        <motion.div className="sem-anim" initial={{ scale: 1 }} animate={{ scale: 1.02 }} transition={{ duration: 10, ease: 'linear' }}
          style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: d.html }} />
      </motion.div>
    </>
  )
}

const Lugar = ({ d }) => <Elevar d={d} modo="lugar" />

const GESTOS = { celular: Elevar, imagem: Elevar, diagrama: Elevar, codigo: Elevar, kpi: Lugar, grupo: Lugar, titulo: Titulo, lista: Lista, grafico: Grafico }

export function CamadaDestaque({ destaque }) {
  const G = destaque ? GESTOS[destaque.tipo] : null
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}>
      <AnimatePresence>{G && <G key={destaque.id + destaque.n} d={destaque} />}</AnimatePresence>
    </div>
  )
}

const COM_COPIA = ['imagem', 'diagrama', 'codigo', 'celular', 'kpi', 'grupo']

/* Medição em coordenadas do palco (1920x1080), descontando a escala. */
export function medir(el, completo = true) {
  const palco = document.querySelector('.palco').getBoundingClientRect()
  const k = palco.width / 1920
  const conv = (r) => ({ x: (r.left - palco.left) / k, y: (r.top - palco.top) / k, w: r.width / k, h: r.height / k })
  const r = conv(el.getBoundingClientRect())
  const tipo = el.dataset.objeto
  let linhas = []
  if (tipo === 'titulo') {
    // uma linha por linha de texto, do tamanho do texto (não do bloco)
    const faixa = document.createRange()
    faixa.selectNodeContents(el)
    const porTopo = new Map()
    for (const q of faixa.getClientRects()) {
      if (q.width < 2) continue
      const c = conv(q), chave = Math.round(c.y / 8)
      const ant = porTopo.get(chave)
      porTopo.set(chave, ant ? { x: Math.min(ant.x, c.x), y: Math.min(ant.y, c.y), w: Math.max(ant.x + ant.w, c.x + c.w) - Math.min(ant.x, c.x), h: Math.max(ant.h, c.h) } : c)
    }
    linhas = [...porTopo.values()]
  }
  // lista: um retângulo por item (sem os espaçadores vazios)
  const filhos = completo && tipo === 'lista'
    ? [...el.children].filter((c) => c.textContent.trim() !== '').map((c) => conv(c.getBoundingClientRect())).filter((c) => c.w > 2)
    : []
  // objetos que sobem: uma cópia do próprio elemento, do tamanho exato dele
  let html
  if (completo && COM_COPIA.includes(tipo)) {
    const c = el.cloneNode(true)
    Object.assign(c.style, {
      margin: '0', transform: 'none', clipPath: 'none', opacity: '1', filter: 'none',
      position: 'relative', left: 'auto', top: 'auto', right: 'auto', bottom: 'auto',
      width: `${r.w}px`, height: `${r.h}px`, boxSizing: 'border-box',
      color: getComputedStyle(el).color, // a cópia mora fora do slide escuro
    })
    c.removeAttribute('data-objeto-id')
    html = c.outerHTML
  }
  return { r, linhas, filhos, html }
}

/* Lista os objetos marcados com data-objeto dentro do slide atual. */
export function listarObjetos(raiz) {
  const contagem = {}
  return [...raiz.querySelectorAll('[data-objeto]')].map((el) => {
    const tipo = el.dataset.objeto
    contagem[tipo] = (contagem[tipo] || 0) + 1
    const id = `${tipo}-${contagem[tipo]}`
    el.dataset.objetoId = id
    const { r } = medir(el, false)
    return { id, tipo, nome: el.dataset.nome || tipo, x: r.x / 1920, y: r.y / 1080, w: r.w / 1920, h: r.h / 1080 }
  })
}

// atalho para marcar um elemento: <div {...objeto('imagem', 'Quadro branco')}>
export const objeto = (tipo, nome) => ({ 'data-objeto': tipo, 'data-nome': nome })
