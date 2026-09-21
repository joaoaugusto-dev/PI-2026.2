import { BotaoSecundario } from '@/components/fluxo/BotaoSecundario'
import { RotuloCampo } from '@/components/fluxo/RotuloCampo'

type AtalhosDeTesteProps = {
  atalhos: { codigo: string; label: string }[]
  onSimular: (codigo: string) => void
}

export function AtalhosDeTeste({ atalhos, onSimular }: AtalhosDeTesteProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="w-full">
        <RotuloCampo>Atalhos de teste</RotuloCampo>
      </div>
      {atalhos.map((atalho) => (
        <BotaoSecundario key={atalho.codigo} onClick={() => onSimular(atalho.codigo)}>
          {atalho.label}
        </BotaoSecundario>
      ))}
    </div>
  )
}
