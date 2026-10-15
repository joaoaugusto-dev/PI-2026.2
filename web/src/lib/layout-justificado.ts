/**
 * Layout justificado (o mesmo princípio da galeria de fotos do Flickr/Google Fotos): cada linha preenche a
 * largura inteira e cada peça ganha largura proporcional à sua `proporcao` (largura ÷ altura). A altura da
 * linha sai da conta: `(largura útil) ÷ (soma das proporções)`.
 *
 * Em vez de encher a linha de forma gulosa (que deixa a última linha esquisita), a quebra é escolhida por
 * programação dinâmica: entre todas as formas de cortar a sequência em linhas, mantendo a ordem, fica a que
 * deixa as alturas mais perto da `alturaAlvo`. Uma linha em que alguma peça ficaria mais estreita que a
 * `larguraMin` dela não vale (peça sozinha sempre vale: a linha é a tela inteira).
 */
export interface Peca {
  id: string
  proporcao: number
  larguraMin: number
  alturaMin: number
}

export interface PecaPosicionada {
  id: string
  largura: number
}

export interface Linha {
  altura: number
  pecas: PecaPosicionada[]
}

export interface Area {
  largura: number
  alturaAlvo: number
  /** Teto da altura de uma linha: uma peça sozinha num monitor largo não vira um outdoor. */
  alturaMax: number
  espaco: number
}

export function montarLinhas(pecas: Peca[], area: Area): Linha[] {
  const n = pecas.length
  if (n === 0 || area.largura <= 0) return []

  // custo[i]: melhor custo para posicionar pecas[0..i); corte[i]: onde começa a última linha dessa solução
  const custo = new Array<number>(n + 1).fill(Infinity)
  const corte = new Array<number>(n + 1).fill(0)
  custo[0] = 0

  for (let fim = 1; fim <= n; fim++) {
    let soma = 0
    for (let ini = fim - 1; ini >= 0; ini--) {
      soma += pecas[ini].proporcao
      const qtd = fim - ini
      const altura = (area.largura - area.espaco * (qtd - 1)) / soma
      const cabe = qtd === 1 || pecas.slice(ini, fim).every((p) => p.proporcao * altura >= p.larguraMin)
      // linhas só ficam mais estreitas por peça quanto mais peças entram: dá para parar no primeiro "não cabe"
      if (!cabe) break
      const desvio = (altura - area.alturaAlvo) / area.alturaAlvo
      const total = custo[ini] + desvio * desvio
      if (total < custo[fim]) {
        custo[fim] = total
        corte[fim] = ini
      }
    }
  }

  const linhas: Linha[] = []
  for (let fim = n; fim > 0; fim = corte[fim]) {
    const grupo = pecas.slice(corte[fim], fim)
    const soma = grupo.reduce((s, p) => s + p.proporcao, 0)
    const util = area.largura - area.espaco * (grupo.length - 1)
    const minimo = Math.max(...grupo.map((p) => p.alturaMin))
    linhas.unshift({
      altura: Math.round(Math.max(minimo, Math.min(util / soma, area.alturaMax))),
      pecas: grupo.map((p) => ({ id: p.id, largura: Math.floor((util * p.proporcao) / soma) })),
    })
  }
  return linhas
}
