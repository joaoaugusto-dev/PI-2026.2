import {
  Axe,
  Bolt,
  Brush,
  Cable,
  Cog,
  Compass,
  Construction,
  Crosshair,
  Cylinder,
  Disc3,
  Drill,
  Equal,
  Fan,
  Flame,
  Flashlight,
  Forklift,
  Gauge,
  Glasses,
  Hammer,
  HardHat,
  Hexagon,
  Layers,
  Magnet,
  Nut,
  Paperclip,
  Pickaxe,
  PlugZap,
  Ruler,
  RulerDimensionLine,
  Scissors,
  Siren,
  Slice,
  SprayCan,
  Thermometer,
  Timer,
  Toolbox,
  Triangle,
  VenetianMask,
  Waves,
  Weight,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { urlDaFoto } from '@/lib/imagem'
import { cn } from '@/lib/utils'

/**
 * Reconhecimento por palavra-chave no nome do catálogo de ferramentas da
 * Soufer (marcenaria/elétrica/solda/medição/EPI). Ordem importa: regras mais
 * específicas primeiro — ex. "furadeira" precisa ser testada antes de
 * qualquer regra genérica de ferramenta elétrica.
 */
const PALAVRAS_CHAVE: [RegExp, LucideIcon][] = [
  // equipamentos de solda
  [/alicate de solda|solda (a|por) ponto|maquina de solda/, PlugZap],
  [/tocha|macarico|soldador/, Flame],
  [/cilindro|argonio|botijao/, Cylinder],
  [/mascara/, VenetianMask],
  [/escova/, Brush],
  [/regua|escala|paquimetro|trena/, Ruler],
  // medição
  [/tracador de altura/, RulerDimensionLine],
  [/micrometro/, Compass],
  [/goniometro/, Triangle],
  [/relogio comparador/, Timer],
  [/rugosimetro/, Waves],
  [/nivel/, Equal],
  [/laser/, Crosshair],
  [/termometro|termic|infravermelho/, Thermometer],
  [/multimetro|voltimetro|manometro|torquimetro|amperimetro|medidor/, Gauge],
  // pneumáticas
  [/compressor/, Fan],
  [/pistola de pintura|spray|tinta|verniz/, SprayCan],
  [/pistola de ar|soprador|ventilad|exaustor/, Wind],
  [/grampeador/, Paperclip],
  [/rebitadeira|parafuso|porca|arruela|rosca|prego|fixador/, Bolt],
  [/martel|marreta|rompedor/, Hammer],
  [/talhadeira|ponteiro|cinzel/, Axe],
  // elétricas e cortes
  [/furad|parafusadeir|broca|perfuratriz|perfurad/, Drill],
  [/esmeril|lixad|retifica|disco|serra circular|policorte/, Disc3],
  [/serrote|tico-?tico|serra|\blimas?\b/, Slice],
  [/plaina/, Layers],
  // manuais
  [/soquete/, Nut],
  [/allen|sextavad/, Hexagon],
  [/alicate de corte|tesoura|cortador|alicate/, Scissors],
  [/pic(areta|ador)|enxada/, Pickaxe],
  [/machad|foice/, Axe],
  [/motor|gerador|betoneira/, Cog],
  [/lanterna|holofote|refletor/, Flashlight],
  [/capacete/, HardHat],
  [/oculos/, Glasses],
  [/cabo|fio|extensao eletrica/, Cable],
  [/tomada|disjuntor|testador/, Zap],
  [/macaco|talha|guincho|roldana/, Weight],
  [/sirene|alarme/, Siren],
  [/\bima\b|detector de metal/, Magnet],
  [/empilhadeira/, Forklift],
  [/andaime|construcao/, Construction],
  [/caixa|malet|kit|estojo|bolsa|organizador/, Toolbox],
  [/chave|soquete/, Wrench],
]

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
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
    return <img src={urlDaFoto(fotoUrl)} alt={nome} className={cn('rounded object-cover', className)} />
  }

  const Icone = iconeParaFerramenta(nome)
  return (
    <div className={cn('flex items-center justify-center rounded bg-muted text-muted-foreground', className)}>
      <Icone className="size-1/2" />
    </div>
  )
}
