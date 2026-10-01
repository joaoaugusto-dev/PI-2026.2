import { Printer } from 'lucide-react'
import { EtiquetaTermica } from '@/components/ferramentas/EtiquetaTermica'
import { Button } from '@/components/ui/Button'
import { useCategorias } from '@/hooks/useCategorias'
import { formatarPatrimonio, type Ferramenta } from '@/hooks/useFerramentas'
import { useImprimir } from '@/hooks/useImprimir'
import { useSetores } from '@/hooks/useSetores'

/**
 * Único jeito de imprimir a etiqueta de uma ferramenta (detalhe, pop-up pós-cadastro e lista de
 * cadastro): recebe a ferramenta e monta a etiqueta 90×60 mm completa, resolvendo categoria e
 * setor pelos ids. `compacto` é o botão pequeno das linhas de tabela.
 */
export function BotaoImprimirEtiqueta({ ferramenta, compacto }: { ferramenta: Ferramenta; compacto?: boolean }) {
  const { data: categorias } = useCategorias()
  const { data: setores } = useSetores()
  const { imprimindo, imprimir } = useImprimir()
  if (!ferramenta.codigo_identificacao) return null

  return (
    <>
      <Button size={compacto ? 'sm' : 'default'} variant={compacto ? 'outline' : 'default'} onClick={imprimir}>
        <Printer /> {compacto ? 'Etiqueta' : 'Imprimir etiqueta (90×60 mm)'}
      </Button>
      {imprimindo && (
        <EtiquetaTermica
          nome={ferramenta.nome}
          codigo={formatarPatrimonio(ferramenta.codigo_identificacao)}
          detalhe={[
            categorias?.find((c) => c.id === ferramenta.grupo_id)?.nome,
            setores?.find((s) => s.id === ferramenta.setor_id)?.nome,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      )}
    </>
  )
}
