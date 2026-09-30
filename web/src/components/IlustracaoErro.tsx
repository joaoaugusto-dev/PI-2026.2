/** Engrenagem de `dentes` dentes: polígono do corpo + furo central (`fill-rule: evenodd`). */
function caminhoEngrenagem(cx: number, cy: number, dentes = 8) {
  const corpo = 38
  const ponta = 52
  const furo = 20
  const passo = (Math.PI * 2) / dentes
  const ponto = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`

  const contorno = Array.from({ length: dentes }, (_, i) => {
    const a = i * passo
    return [
      ponto(corpo, a - passo * 0.36),
      ponto(ponta, a - passo * 0.2),
      ponto(ponta, a + passo * 0.2),
      ponto(corpo, a + passo * 0.36),
    ].join(' L ')
  }).join(' L ')

  return `M ${contorno} Z M ${cx + furo} ${cy} A ${furo} ${furo} 0 1 0 ${cx - furo} ${cy} A ${furo} ${furo} 0 1 0 ${cx + furo} ${cy} Z`
}

const GEAR = caminhoEngrenagem(165, 60)

const GLIFOS = {
  // 4 ⚙ 4
  '404': (
    <>
      <path d="M70 10 L14 82 H96 M70 10 V112" />
      <path d="M290 10 L234 82 H316 M290 10 V112" />
    </>
  ),
  // 5 ⚙ 0 — a engrenagem é o primeiro zero
  '500': (
    <>
      <path d="M92 12 H38 L32 56 C44 48 58 46 70 48 C88 52 96 66 96 82 C96 102 82 112 62 112 C46 112 34 106 26 96" />
      <rect x="234" y="10" width="82" height="102" rx="41" />
    </>
  ),
}

/**
 * Código de erro ilustrado: a engrenagem faz o papel do zero e gira devagar
 * (`.engrenagem`, só `transform`; some em reduced motion). Desenhada em SVG
 * com `currentColor` nos números e `--brand-red` na engrenagem, então
 * acompanha o tema claro/escuro.
 */
export function IlustracaoErro({ codigo, className }: { codigo: keyof typeof GLIFOS; className?: string }) {
  return (
    <svg viewBox="0 0 330 130" role="img" aria-label={`Erro ${codigo}`} className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
        {GLIFOS[codigo]}
      </g>
      <path className="engrenagem" d={GEAR} fill="var(--brand-red)" fillRule="evenodd" />
      <ellipse cx="165" cy="124" rx="70" ry="3" fill="currentColor" opacity="0.08" />
    </svg>
  )
}
