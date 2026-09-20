import { BotaoSecundario } from '@/components/fluxo/BotaoSecundario'
import { DadoRotulado } from '@/components/fluxo/DadoRotulado'

export type EmprestimoAberto = {
  codigo: string
  ferramenta: string
  categoria: string
  retiradoPor: string
  matricula: string
  setor: string
  atividade?: string
  registradoPor: string
}

type DetalhesEmprestimoProps = {
  emprestimo: EmprestimoAberto
  /** Data de saída já formatada (dd/mm/aaaa). */
  saida: string
  diasDesdeSaida: number
  diasAtraso: number
  onBuscarOutra: () => void
}

function pluralDias(dias: number) {
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

/** Cartão do empréstimo aberto na devolução, com faixa de atraso quando a previsão já passou. */
export function DetalhesEmprestimo({
  emprestimo,
  saida,
  diasDesdeSaida,
  diasAtraso,
  onBuscarOutra,
}: DetalhesEmprestimoProps) {
  return (
    <div className="animate-entrada space-y-0 overflow-hidden rounded-lg border">
      {diasAtraso > 0 && (
        <div className="flex items-center gap-2 bg-status-atraso px-4 py-2 text-white">
          <span className="size-2 shrink-0 rounded-full bg-current" />
          <p className="text-sm font-medium">Devolução atrasada em {pluralDias(diasAtraso)}</p>
        </div>
      )}
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-secao font-semibold">{emprestimo.ferramenta}</h3>
            <p className="text-sm text-muted-foreground">
              {emprestimo.codigo} · {emprestimo.categoria}
            </p>
          </div>
          <BotaoSecundario onClick={onBuscarOutra}>Buscar outra</BotaoSecundario>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-3 sm:grid-cols-3 lg:grid-cols-5">
          <DadoRotulado rotulo="Retirado por">{emprestimo.retiradoPor}</DadoRotulado>
          <DadoRotulado rotulo="Matrícula · Setor">
            {emprestimo.matricula} · {emprestimo.setor}
          </DadoRotulado>
          <DadoRotulado rotulo="Atividade">{emprestimo.atividade || '—'}</DadoRotulado>
          <DadoRotulado rotulo="Saída · há">
            {saida} · {pluralDias(diasDesdeSaida)}
          </DadoRotulado>
          <DadoRotulado rotulo="Registrado por">{emprestimo.registradoPor}</DadoRotulado>
        </div>
      </div>
    </div>
  )
}
