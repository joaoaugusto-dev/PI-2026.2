import { useState } from 'react'
import { ArrowUpRight, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { AtalhoAcao } from '@/components/dashboard/AtalhoAcao'
import { BarraSetor } from '@/components/dashboard/BarraSetor'
import { EmprestimoAtrasadoItem, type EmprestimoAtrasado } from '@/components/dashboard/EmprestimoAtrasadoItem'
import { EsqueletoLista } from '@/components/dashboard/EsqueletoLista'
import { KpiCard, type TomKpi } from '@/components/dashboard/KpiCard'

type EstadoDemo = 'pendencias' | 'em-dia' | 'carregando'

type Kpi = {
  label: string
  valor: number
  tom?: TomKpi
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

const atrasados: EmprestimoAtrasado[] = [
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

export function DashboardPage() {
  const [estado, setEstado] = useState<EstadoDemo>('pendencias')
  const kpis = estado === 'em-dia' ? kpisEmDia : kpisPendencias
  const temAtrasos = estado === 'pendencias'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-corpo text-muted-foreground">Manutenção central · Fábrica 1</p>
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
          : kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AtalhoAcao
          to="/retiradas/nova"
          titulo="Registrar retirada"
          descricao="Ferramenta → colaborador · leitor de código"
          icone={ArrowUpRight}
          variante="primario"
        />
        <AtalhoAcao
          to="/devolucoes"
          titulo="Registrar devolução"
          descricao="Busca por código ou colaborador"
          icone={RotateCcw}
          variante="escuro"
        />
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
            <EsqueletoLista linhas={4} linhaClassName="h-14 w-full" className="flex flex-col gap-2" />
          ) : !temAtrasos ? (
            <p className="py-8 text-center text-corpo text-muted-foreground">
              Nenhum empréstimo atrasado no momento.
            </p>
          ) : (
            <div className="lista-stagger flex flex-col divide-y">
              {atrasados.map((item) => (
                <EmprestimoAtrasadoItem key={item.registro} item={item} />
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
            <EsqueletoLista linhas={6} linhaClassName="h-4 w-full" className="flex flex-col gap-3" />
          ) : (
            <div className="flex flex-col gap-2.5">
              {porSetor.map((item) => (
                <BarraSetor key={item.setor} setor={item.setor} total={item.total} maximo={maxSetor} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
