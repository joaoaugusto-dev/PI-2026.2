import { IdCard } from 'lucide-react'
import { CrachaTermico } from '@/components/cadastros/CrachaTermico'
import { Button } from '@/components/ui/Button'
import { useImprimir } from '@/hooks/useImprimir'

/**
 * Imprime o crachá do colaborador (90×60 mm, térmica): nome, setor e a matrícula em código de
 * barras e em número grande, para o leitor identificar quem retira. O crachá só é montado
 * durante a impressão (`useImprimir`).
 */
export function BotaoImprimirCracha({ nome, matricula, setor }: { nome: string; matricula: string; setor?: string }) {
  const { imprimindo, imprimir } = useImprimir()

  return (
    <>
      <Button size="sm" variant="outline" onClick={imprimir} title="Imprimir crachá" aria-label="Imprimir crachá">
        <IdCard className="size-4" /> <span className="hidden 2xl:inline">Crachá</span>
      </Button>
      {imprimindo && <CrachaTermico nome={nome} matricula={matricula} setor={setor} />}
    </>
  )
}
