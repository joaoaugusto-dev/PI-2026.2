import {
  Axe,
  Bolt,
  Cable,
  Cog,
  Construction,
  Drill,
  Flame,
  Flashlight,
  Forklift,
  Gauge,
  Glasses,
  Hammer,
  HardHat,
  Magnet,
  Pickaxe,
  Ruler,
  Scissors,
  Siren,
  SprayCan,
  Thermometer,
  Toolbox,
  Weight,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Reconhecimento por palavra-chave no nome do catálogo de ferramentas da
 * Soufer (marcenaria/elétrica/solda/medição/EPI). Ordem importa: regras mais
 * específicas primeiro — ex. "furadeira" precisa ser testada antes de
 * qualquer regra genérica de ferramenta elétrica.
 */
const PALAVRAS_CHAVE: [RegExp, LucideIcon][] = [
  [/martel|marreta|rompedor|talhadeira|ponteiro|cinzel/, Hammer],
  [/furad|parafusadeir|broca|perfuratriz|perfurad/, Drill],
  [/pic(areta|ador)|enxada/, Pickaxe],
  [/machad|fo[ií]ce/, Axe],
  [/serra|lixad|esmerilh|policorte|tico-?tico|plaina|motor|compressor|gerador|betoneira/, Cog],
  [/trena|n[ií]vel|esquadro|paqu[ií]metro|micr[oô]metro|goni[oô]metro|r[eé]gua/, Ruler],
  [/multi[ií]?metro|volt[ií]metro|man[oô]metro|torqu[ií]metro|amper[ií]metro|medidor/, Gauge],
  [/solda|ma[çc]arico|soldador/, Flame],
  [/pistola|spray|tinta|verniz/, SprayCan],
  [/soprador|ventilad|exaustor/, Wind],
  [/lanterna|holofote|refletor/, Flashlight],
  [/capacete/, HardHat],
  [/[oó]culos/, Glasses],
  [/term[oô]metro|t[eé]rmic|infravermelho/, Thermometer],
  [/cabo|fio|extens[aã]o el[eé]trica/, Cable],
  [/tomada|disjuntor|testador/, Zap],
  [/tesoura|alicate de corte|cortador/, Scissors],
  [/parafuso|porca|arruela|rosca|prego|fixador/, Bolt],
  [/macaco|talha|guincho|roldana/, Weight],
  [/sirene|alarme/, Siren],
  [/[ií]m[aã]|detector de metal/, Magnet],
  [/empilhadeira/, Forklift],
  [/andaime|constru[çc][aã]o/, Construction],
  [/caixa|malet|kit|estojo|bolsa|organizador/, Toolbox],
  [/chave|alicate/, Wrench],
]

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function iconeParaFerramenta(nome: string): LucideIcon {
  const normalizado = normalizar(nome)
  for (const [regex, Icone] of PALAVRAS_CHAVE) {
    if (regex.test(normalizado)) return Icone
  }
  return Wrench
}

type IconeFerramentaProps = {
  nome: string
  fotoUrl?: string | null
  className?: string
}

/** Miniatura de ferramenta: foto quando existir, senão o ícone reconhecido pelo nome. */
export function IconeFerramenta({ nome, fotoUrl, className }: IconeFerramentaProps) {
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} className={cn('rounded object-cover', className)} />
  }

  const Icone = iconeParaFerramenta(nome)
  return (
    <div className={cn('flex items-center justify-center rounded bg-muted text-muted-foreground', className)}>
      <Icone className="size-1/2" />
    </div>
  )
}
