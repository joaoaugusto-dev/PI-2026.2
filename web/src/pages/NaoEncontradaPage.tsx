import { Link } from 'react-router-dom'
import { EtiquetaNaoLocalizada } from '@/components/EtiquetaNaoLocalizada'
import { IlustracaoErro } from '@/components/IlustracaoErro'
import { TelaDeFeedback } from '@/components/TelaDeFeedback'
import { Button } from '@/components/ui/Button'

export function NaoEncontradaPage() {
  return (
    <TelaDeFeedback
      ilustracao={<IlustracaoErro codigo="404" className="w-full max-w-sm text-foreground sm:max-w-md" />}
      titulo="Essa ferramenta não está disponível"
      descricao="A página que você procurou não existe ou mudou de lugar. Confira o endereço ou volte para o início."
      acoes={
        <>
          <Button asChild className="h-(--control-h) px-6 text-corpo">
            <Link to="/">Voltar ao início</Link>
          </Button>
          <Button asChild variant="outline" className="h-(--control-h) px-6 text-corpo">
            <Link to="/ferramentas">Ver ferramentas</Link>
          </Button>
        </>
      }
      etiqueta={<EtiquetaNaoLocalizada />}
    />
  )
}
