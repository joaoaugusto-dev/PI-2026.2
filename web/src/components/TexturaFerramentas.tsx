import { Axe, Bolt, Cog, Drill, Hammer, Ruler, Toolbox, Wrench } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

const iconesTextura = [Wrench, Hammer, Drill, Ruler, Cog, Axe, Toolbox, Bolt]

// Grade com jitter: sorteio puro (x,y soltos) agrupa em uns cantos e deixa
// outros vazios. Dividindo a tela em células de ~80px e sorteando a posição
// só dentro de cada célula garante cobertura uniforme sem ficar quadriculado
// nem sobrepor ícones. Colunas/linhas calculadas a partir do viewport para a
// densidade ficar igual em qualquer resolução.
function gerarGrade() {
  const CELULA_PX = 80
  const colunas = Math.ceil(window.innerWidth / CELULA_PX)
  const linhas = Math.ceil(window.innerHeight / CELULA_PX)
  const celulaW = 100 / colunas
  const celulaH = 100 / linhas

  return Array.from({ length: colunas * linhas }, (_, i) => {
    const col = i % colunas
    const linha = Math.floor(i / colunas)
    return {
      Icone: iconesTextura[Math.floor(Math.random() * iconesTextura.length)],
      x: (col + 0.5) * celulaW + (Math.random() - 0.5) * celulaW * 0.7,
      y: (linha + 0.5) * celulaH + (Math.random() - 0.5) * celulaH * 0.7,
      rotacao: Math.floor(Math.random() * 360),
      tamanho: 20 + Math.random() * 14,
      opacidade: 0.05 + Math.random() * 0.09,
    }
  })
}

type IconePosicionado = ReturnType<typeof gerarGrade>[number]

function CamadaIcones({ icones, opacidadeExtra = 0 }: { icones: IconePosicionado[]; opacidadeExtra?: number }) {
  return (
    <>
      {icones.map(({ Icone, x, y, rotacao, tamanho, opacidade }, i) => (
        <Icone
          key={i}
          className="absolute"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: tamanho,
            height: tamanho,
            transform: `translate(-50%, -50%) rotate(${rotacao}deg)`,
            opacity: opacidade + opacidadeExtra,
          }}
        />
      ))}
    </>
  )
}

/**
 * Textura de fundo com ícones de ferramentas + lanterna sutil que segue o
 * mouse (perto do cursor os mesmos ícones ficam um pouco mais nítidos, via
 * mask-image — não mexe em layout, só composição). Usar em telas cheias fora
 * do AppLayout (login, cadastro). A grade é gerada uma vez por montagem
 * (useMemo), então cada tela tem sua própria randomização.
 */
export function TexturaFerramentas() {
  const icones = useMemo(() => gerarGrade(), [])
  const holofoteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function aoMoverMouse(e: MouseEvent) {
      holofoteRef.current?.style.setProperty('--holofote-x', `${e.clientX}px`)
      holofoteRef.current?.style.setProperty('--holofote-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', aoMoverMouse)
    return () => window.removeEventListener('mousemove', aoMoverMouse)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <CamadaIcones icones={icones} />
      <div
        ref={holofoteRef}
        className="absolute inset-0"
        style={{
          maskImage:
            'radial-gradient(220px circle at var(--holofote-x, 50%) var(--holofote-y, 50%), black, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(220px circle at var(--holofote-x, 50%) var(--holofote-y, 50%), black, transparent 70%)',
        }}
      >
        <CamadaIcones icones={icones} opacidadeExtra={0.35} />
      </div>
    </div>
  )
}
