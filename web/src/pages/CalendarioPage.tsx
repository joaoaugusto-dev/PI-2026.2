import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useCalendario } from '@/hooks/useCalendario'
import { hojeBrasilia } from '@/lib/formatar'
import { useSetores } from '@/hooks/useSetores'
import { cn } from '@/lib/utils'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Situacao = 'vencido' | 'hoje' | 'futuro'

const ESTILO: Record<Situacao, { numero: string; rotulo: string }> = {
  vencido: { numero: 'text-brand-red', rotulo: 'vencido' },
  hoje: { numero: 'text-status-atraso', rotulo: 'vence hoje' },
  futuro: { numero: 'text-foreground', rotulo: 'previstas' },
}

function iso(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function CalendarioPage() {
  // "hoje" no fuso de Brasília (o do balcão), não no do navegador
  const agora = hojeBrasilia()
  const [ano, setAno] = useState(agora.ano)
  const [mes, setMes] = useState(agora.mes)
  const [setorId, setSetorId] = useState('')
  const [diaAberto, setDiaAberto] = useState<string | null>(null)

  const hoje = agora.iso
  const { data, isError } = useCalendario(iso(ano, mes, 1).slice(0, 7))
  const { data: setores } = useSetores()

  const porDia = useMemo(() => {
    const mapa = new Map<string, NonNullable<typeof data>[number]['emprestimos']>()
    for (const { dia, emprestimos } of data ?? []) {
      const filtrados = setorId ? emprestimos.filter((e) => e.setor_id === Number(setorId)) : emprestimos
      // tolera `dia` como timestamp (AAAA-MM-DDTHH...): a chave é só a data
      if (filtrados.length) mapa.set(dia.slice(0, 10), filtrados)
    }
    return mapa
  }, [data, setorId])

  function navegar(delta: number) {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  const offset = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const celulas: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]
  while (celulas.length % 7 !== 0) celulas.push(null)
  const semanas = Array.from({ length: celulas.length / 7 }, (_, s) => celulas.slice(s * 7, s * 7 + 7))
  const tituloMes = new Date(ano, mes, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  const itensDiaAberto = diaAberto ? (porDia.get(diaAberto) ?? []) : []

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Mês anterior" onClick={() => navegar(-1)}>
            <ChevronLeft />
          </Button>
          <h2 className="min-w-44 text-center text-secao first-letter:uppercase">{tituloMes}</h2>
          <Button size="icon" variant="outline" aria-label="Próximo mês" onClick={() => navegar(1)}>
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select
            aria-label="Filtrar por setor"
            value={setorId}
            onChange={(e) => setSetorId(e.target.value)}
            className="h-(--control-h) rounded-lg border border-input bg-background px-3 text-corpo"
          >
            <option value="">Todos os setores</option>
            {setores?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
          <ul className="flex gap-3 text-rotulo text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2 bg-brand-red" />
              Vencido
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 bg-status-atraso" />
              Vence hoje
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 bg-foreground" />
              Futuro
            </li>
          </ul>
        </div>
      </div>

      {isError && <p className="text-corpo text-destructive">Não foi possível carregar os dados.</p>}
      {/* tabela de verdade: leitor de tela anuncia o dia da semana de cada célula */}
      <table className="w-full table-fixed border-separate border-spacing-1 sm:border-spacing-2">
        <caption className="sr-only">Devoluções previstas em {tituloMes}</caption>
        <thead>
          <tr>
            {DIAS_SEMANA.map((d) => (
              <th
                key={d}
                scope="col"
                className="text-left text-rotulo font-medium tracking-wide text-muted-foreground uppercase"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, s) => (
            <tr key={s}>
              {semana.map((dia, i) => {
                if (dia === null) return <td key={`v${i}`} />
                const diaIso = iso(ano, mes, dia)
                const itens = porDia.get(diaIso)
                const situacao: Situacao = diaIso < hoje ? 'vencido' : diaIso === hoje ? 'hoje' : 'futuro'
                const estilo = ESTILO[situacao]
                return (
                  <td key={diaIso} className="p-0 align-top">
                    <button
                      type="button"
                      disabled={!itens}
                      aria-label={itens ? `Dia ${dia}: ${itens.length} devoluções, ${estilo.rotulo}` : `Dia ${dia}`}
                      onClick={() => setDiaAberto(diaIso)}
                      className={cn(
                        'flex min-h-16 w-full flex-col items-start gap-0.5 rounded-md border bg-card p-1.5 text-left sm:min-h-20 sm:p-2',
                        itens && 'cursor-pointer hover:bg-muted',
                        diaIso === hoje && 'border-status-atraso',
                      )}
                    >
                      <span className="text-rotulo text-muted-foreground">{dia}</span>
                      {itens && (
                        <>
                          <span className={cn('text-titulo font-semibold tabular-nums', estilo.numero)}>
                            {itens.length}
                          </span>
                          <span className={cn('hidden text-rotulo sm:block', estilo.numero)}>{estilo.rotulo}</span>
                        </>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={diaAberto !== null} onOpenChange={(aberto) => !aberto && setDiaAberto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {diaAberto &&
                new Date(`${diaAberto}T00:00`).toLocaleDateString('pt-BR', {
                  dateStyle: 'full',
                })}
            </DialogTitle>
            <DialogDescription>{itensDiaAberto.length} devolução(ões) prevista(s)</DialogDescription>
          </DialogHeader>
          <Card>
            <CardContent className="divide-y">
              {itensDiaAberto.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-corpo font-medium">{e.colaborador_nome}</p>
                    <p className="text-rotulo text-muted-foreground">{e.setor_nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-corpo">{e.ferramenta_nome}</p>
                    <p className="text-rotulo text-muted-foreground">{e.ferramenta_codigo}</p>
                  </div>
                  {e.ramal && (
                    <a href={`tel:${e.ramal}`} className="flex items-center gap-1 text-rotulo text-primary">
                      <Phone className="size-3" />
                      {e.ramal}
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  )
}
