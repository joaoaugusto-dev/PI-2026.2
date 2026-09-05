import { useState } from 'react'
import { ArrowUpRight, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type EstadoDemo = 'pendencias' | 'em-dia' | 'carregando'

type Kpi = {
  label: string
  valor: number
  tom?: 'disponivel' | 'indisponivel' | 'atraso'
}

const kpisPendencias: Kpi[] = [
  { label: 'Cadastradas', valor: 486 },
  { label: 'Disponíveis', valor: 312, tom: 'disponivel' },
  { label: 'Em uso', valor: 158 },
  { label: 'Indisponíveis', valor: 16, tom: 'indisponivel' },
  { label: 'Atrasadas', valor: 7, tom: 'atraso' },
  { label: 'Ocorrências', valor: 3, tom: 'indisponivel' },
]

const kpisEmDia: Kpi[] = [
  { label: 'Cadastradas', valor: 486 },
  { label: 'Disponíveis', valor: 461, tom: 'disponivel' },
  { label: 'Em uso', valor: 25 },
  { label: 'Indisponíveis', valor: 0, tom: 'indisponivel' },
  { label: 'Atrasadas', valor: 0, tom: 'atraso' },
  { label: 'Ocorrências', valor: 0, tom: 'indisponivel' },
]

const atrasados = [
  { colaborador: 'Jocimar Ferreira da Silva', matricula: '4412', setor: 'Caldeiraria', ferramenta: 'Chave de Impacto Pneumática 1/2"', codigo: 'SF000093', dias: 9, registro: 'R.2140' },
  { colaborador: 'Rafael Antunes', matricula: '6620', setor: 'Montagem', ferramenta: 'Maçarico de Corte Oxi-Acetileno', codigo: 'SF000234', dias: 4, registro: 'R.2176' },
  { colaborador: 'Cleiton Barbosa', matricula: '2874', setor: 'Expedição', ferramenta: 'Chave Grifo 24"', codigo: 'SF000377', dias: 3, registro: 'R.2190' },
  { colaborador: 'Wellington Souza Lima', matricula: '3097', setor: 'Manutenção', ferramenta: 'Bomba de Teste Hidrostático', codigo: 'SF000418', dias: 2, registro: 'R.2115' },
  { colaborador: 'Ana Paula Nogueira', matricula: '5108', setor: 'Qualidade', ferramenta: 'Durômetro Portátil', codigo: 'SF000602', dias: 1, registro: 'R.2208' },
]

const porSetor = [
  { setor: 'Manutenção', total: 62 },
  { setor: 'Caldeiraria', total: 48 },
  { setor: 'Montagem', total: 41 },
  { setor: 'Usinagem', total: 27 },
  { setor: 'Qualidade', total: 19 },
  { setor: 'Expedição', total: 11 },
]

const maxSetor = Math.max(...porSetor.map((s) => s.total))

const tomClasse: Record<NonNullable<Kpi['tom']>, string> = {
  disponivel: 'text-status-disponivel',
  indisponivel: 'text-status-indisponivel',
  atraso: 'text-status-atraso',
}

export function DashboardPage() {
  const [estado, setEstado] = useState<EstadoDemo>('pendencias')
  const kpis = estado === 'em-dia' ? kpisEmDia : kpisPendencias
  const temAtrasos = estado === 'pendencias'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-corpo text-muted-foreground">Almoxarifado central · Fábrica 1</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">
            Estado demo
          </span>
          {(['pendencias', 'em-dia', 'carregando'] as const).map((valor) => (
            <Button
              key={valor}
              size="sm"
              variant={estado === valor ? 'default' : 'outline'}
              onClick={() => setEstado(valor)}
            >
              {valor === 'pendencias' && 'Com pendências'}
              {valor === 'em-dia' && 'Tudo em dia'}
              {valor === 'carregando' && (
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="size-3.5" /> Carregando
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {estado === 'carregando'
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="gap-2 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-14" />
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card key={kpi.label} className="gap-1 p-4">
                <span className="text-rotulo font-medium tracking-wide text-muted-foreground uppercase">
                  {kpi.label}
                </span>
                <span
                  className={cn(
                    'text-kpi tabular-nums',
                    kpi.tom ? tomClasse[kpi.tom] : 'text-foreground',
                  )}
                >
                  {kpi.valor}
                </span>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/retiradas/nova">
          <Card className="h-full flex-row items-center justify-between gap-3 border-transparent bg-primary p-6 text-primary-foreground transition-colors hover:bg-brand-red-dark">
            <div>
              <p className="text-titulo font-semibold">Registrar retirada</p>
              <p className="text-corpo text-primary-foreground/80">
                Ferramenta → colaborador · leitor de código
              </p>
            </div>
            <ArrowUpRight className="size-6 shrink-0" />
          </Card>
        </Link>
        <Link to="/devolucoes">
          <Card className="h-full flex-row items-center justify-between gap-3 bg-foreground p-6 text-background transition-colors hover:bg-foreground/90">
            <div>
              <p className="text-titulo font-semibold">Registrar devolução</p>
              <p className="text-corpo text-background/80">Busca por código ou colaborador</p>
            </div>
            <RotateCcw className="size-6 shrink-0" />
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card className="gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-secao">Empréstimos atrasados</h2>
            <span className="text-rotulo font-medium text-muted-foreground">
              {temAtrasos ? atrasados.length : 0} registros
            </span>
          </div>
          {estado === 'carregando' ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !temAtrasos ? (
            <p className="py-8 text-center text-corpo text-muted-foreground">
              Nenhum empréstimo atrasado no momento.
            </p>
          ) : (
            <div className="lista-stagger flex flex-col divide-y">
              {atrasados.map((item) => (
                <div key={item.registro} className="flex items-center justify-between gap-3 py-3">
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
                  <span className="text-rotulo hidden text-muted-foreground md:block">
                    {item.registro}
                  </span>
                  <Button size="sm" variant="outline">
                    Devolver
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="gap-3 p-4">
          <div>
            <h2 className="text-secao">Empréstimos por setor</h2>
            <p className="text-rotulo text-muted-foreground">
              Últimos 30 dias · {porSetor.reduce((acc, s) => acc + s.total, 0)} no total
            </p>
          </div>
          {estado === 'carregando' ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {porSetor.map((item) => (
                <div key={item.setor} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-corpo">
                    <span>{item.setor}</span>
                    <span className="tabular-nums text-muted-foreground">{item.total}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${(item.total / maxSetor) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
