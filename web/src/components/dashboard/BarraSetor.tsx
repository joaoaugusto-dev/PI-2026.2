type BarraSetorProps = {
  setor: string
  total: number
  /** Maior total entre os setores; define a largura de 100% da barra. */
  maximo: number
}

export function BarraSetor({ setor, total, maximo }: BarraSetorProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-corpo">
        <span>{setor}</span>
        <span className="tabular-nums text-muted-foreground">{total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${(total / maximo) * 100}%` }} />
      </div>
    </div>
  )
}
