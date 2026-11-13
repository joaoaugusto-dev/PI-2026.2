/* Vibração do controle. Android: Vibration API com o padrão pedido.
   iPhone não tem Vibration API; no Safari 18+ o clique num <input switch>
   nativo dispara um toque háptico curto, então o padrão vira N toques.
   ponytail: o truque do iPhone depende do Safari; sem ele, não vibra e segue. */
export function vibrar(padrao) {
  try {
    if (navigator.vibrate && navigator.vibrate(padrao)) return
  } catch { /* sem vibração */ }
  const lista = Array.isArray(padrao) ? padrao : [padrao]
  const ligado = lista.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0)
  const toques = Math.min(8, Math.max(1, Math.round(ligado / 120)))
  for (let i = 0; i < toques; i++) setTimeout(toqueIphone, i * 110)
}

let rotulo = null
function toqueIphone() {
  if (!rotulo) {
    const caixa = document.createElement('input')
    caixa.type = 'checkbox'
    caixa.setAttribute('switch', '')
    caixa.id = 'toque-haptico'
    caixa.hidden = true
    rotulo = document.createElement('label')
    rotulo.htmlFor = caixa.id
    rotulo.hidden = true
    document.body.append(caixa, rotulo)
  }
  rotulo.click()
}

// Avisos do cronômetro: leve perto do fim, forte quando estoura.
export const AVISOS = [
  { seg: 30, padrao: 60 }, // 30 s: um toque leve
  { seg: 10, padrao: [60, 90, 60] }, // 10 s: dois toques leves
  { seg: 0, padrao: [400, 120, 400, 120, 700] }, // acabou: forte e longo
]
