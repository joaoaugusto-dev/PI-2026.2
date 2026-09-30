import { Wrench } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { iconeParaFerramenta } from './IconeFerramenta'

describe('iconeParaFerramenta', () => {
  it('dá ícone próprio a cada família do catálogo (nenhum cai no genérico)', () => {
    const nomes = [
      'Alicate de Solda a Ponto Lincoln Electric',
      'Cilindro de Gás Argônio com Regulador White Martins',
      'Escova Rotativa de Aço para Solda Norton',
      'Esmeril de Bancada para Eletrodos Vonder EBV-750',
      'Máscara de Solda Automática Esab Sentinel',
      'Alicate Universal Vonder 8 Polegadas',
      'Jogo de Limas para Metal Nicholson 6 Peças',
      'Jogo de Soquetes Sextavados 1/2 Polegada Gedore Red',
      'Compressor de Ar Portátil Schulz CSI 8,7 Pés',
      'Rugosímetro Portátil Mitutoyo SJ-210',
    ]
    const icones = nomes.map(iconeParaFerramenta)
    expect(icones.every((i) => i !== Wrench)).toBe(true)
    expect(new Set(icones).size).toBe(icones.length)
  })

  it('chave continua sendo a chave inglesa', () => {
    expect(iconeParaFerramenta('Chave de Grifo Stanley 14 Polegadas')).toBe(Wrench)
  })
})
