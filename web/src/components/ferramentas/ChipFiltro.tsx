import { Button } from '@/components/ui/Button'

type ChipFiltroProps = {
  label: string
  ativo: boolean
  onClick: () => void
}

/** Botão-pílula de filtro (status/categoria) — reaproveitado entre Ferramentas e Indisponíveis (FE-16). */
export function ChipFiltro({ label, ativo, onClick }: ChipFiltroProps) {
  return (
    <Button type="button" variant={ativo ? 'default' : 'outline'} className="rounded-full" onClick={onClick}>
      {label}
    </Button>
  )
}
