import { Button } from '@/components/ui/Button'

export type EmprestimoAtrasado = {
  colaborador: string
  matricula: string
  setor: string
  ferramenta: string
  codigo: string
  dias: number
  registro: string
}

export function EmprestimoAtrasadoItem({ item }: { item: EmprestimoAtrasado }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-corpo font-medium">{item.colaborador}</p>
        <p className="text-rotulo text-muted-foreground">
          {item.matricula} · {item.setor}
        </p>
      </div>
      <div className="hidden flex-1 sm:block">
        <p className="text-corpo">{item.ferramenta}</p>
        <p className="text-rotulo text-muted-foreground">{item.codigo}</p>
      </div>
      <span className="text-titulo font-semibold text-status-atraso">{item.dias}d</span>
      <span className="text-rotulo hidden text-muted-foreground md:block">{item.registro}</span>
      <Button size="sm" variant="outline">
        Devolver
      </Button>
    </div>
  )
}
