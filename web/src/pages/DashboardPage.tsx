import { ArrowLeftRight, ArrowUpRight, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { AtalhoAcao } from '@/components/dashboard/AtalhoAcao'
import { CartaoPendencias } from '@/components/dashboard/CartaoPendencias'
import { EmprestimoPendenteItem } from '@/components/dashboard/EmprestimoPendenteItem'
import { KpiCard, type TomKpi } from '@/components/dashboard/KpiCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDashboard } from '@/hooks/useDashboard'
import { formatarPatrimonio } from '@/hooks/useFerramentas'

const ETAPA: Record<string, string> = {
  aberta: 'Ocorrência aberta',
  em_reparo: 'Em reparo',
  cobrada: 'Cobrada do colaborador',
}

const KPIS: { chave: keyof NonNullable<ReturnType<typeof useDashboard>['data']>['kpis']; label: string; tom?: TomKpi }[] = [
  { chave: 'cadastradas', label: 'Cadastradas' },
  { chave: 'disponiveis', label: 'Disponíveis', tom: 'disponivel' },
  { chave: 'em_uso', label: 'Em uso' },
  { chave: 'indisponiveis', label: 'Indisponíveis', tom: 'indisponivel' },
  { chave: 'atrasadas', label: 'Atrasadas', tom: 'atraso' },
  { chave: 'ocorrencias', label: 'Ocorrências', tom: 'indisponivel' },
]

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()

  if (isError) {
    return (
      <EmptyState
        icone={TriangleAlert}
        titulo="Não foi possível carregar o painel"
        descricao="Verifique sua conexão ou tente novamente em instantes."
      />
    )
  }

  return (
    // no desktop o painel ocupa exatamente a altura da tela (73px = cabeçalho), sem rolagem da página
    <div className="flex flex-col gap-3 p-4 lg:h-[calc(100svh-73px)]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? KPIS.map((k) => (
              <Card key={k.chave} className="gap-2 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-14" />
              </Card>
            ))
          : data && KPIS.map((k) => <KpiCard key={k.chave} label={k.label} valor={data.kpis[k.chave]} tom={k.tom} />)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
          icone={ArrowLeftRight}
          variante="escuro"
        />
      </div>

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-2">
        <CartaoPendencias
          titulo="Cobrar hoje"
          descricao="Devolução prevista para hoje"
          total={data?.cobrar_hoje.total}
          tom="text-status-atraso"
          vazio="Nenhuma devolução prevista para hoje."
          carregando={isLoading}
        >
          {data?.cobrar_hoje.itens.map((item) => (
            <EmprestimoPendenteItem key={item.id} item={item} prazo="hoje" tomPrazo="text-status-atraso" />
          ))}
        </CartaoPendencias>

        <CartaoPendencias
          titulo="Atrasados"
          descricao="Prazo já passou"
          total={data?.atrasados.total}
          tom="text-status-indisponivel"
          vazio="Nenhum empréstimo atrasado."
          carregando={isLoading}
        >
          {data?.atrasados.itens.map((item) => (
            <EmprestimoPendenteItem key={item.id} item={item} prazo={`${item.dias}d`} tomPrazo="text-status-indisponivel" />
          ))}
        </CartaoPendencias>

        <CartaoPendencias
          titulo="Próximos do prazo"
          descricao="Vencem nos próximos 3 dias"
          total={data?.proximos_do_prazo.total}
          tom="text-foreground"
          vazio="Nada vencendo nos próximos dias."
          carregando={isLoading}
        >
          {data?.proximos_do_prazo.itens.map((item) => (
            <EmprestimoPendenteItem
              key={item.id}
              item={item}
              prazo={`em ${item.dias}d`}
              tomPrazo="text-muted-foreground"
            />
          ))}
        </CartaoPendencias>

        <CartaoPendencias
          titulo="Ferramentas indisponíveis"
          descricao="Aguardando alguma ação"
          total={data?.indisponiveis.total}
          tom="text-status-indisponivel"
          vazio="Nenhuma ferramenta indisponível."
          carregando={isLoading}
        >
          {data?.indisponiveis.itens.map((item) => (
            <div key={item.ferramenta_id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-corpo font-medium">{item.ferramenta_nome}</p>
                <p className="truncate text-rotulo text-muted-foreground">
                  {formatarPatrimonio(item.codigo_identificacao)} · {item.etapa ? ETAPA[item.etapa] : 'Sem ocorrência'}
                  {item.tipo ? ` (${item.tipo.toLowerCase()})` : ''} · parada há {item.dias_parada}d
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/indisponiveis">Tratar</Link>
              </Button>
            </div>
          ))}
        </CartaoPendencias>
      </div>
    </div>
  )
}
