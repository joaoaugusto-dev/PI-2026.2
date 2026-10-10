import { ArrowDownLeft, ArrowUpRight, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { AtalhoAcao } from '@/components/dashboard/AtalhoAcao'
import { CartaoPendencias } from '@/components/dashboard/CartaoPendencias'
import { EmprestimoPendenteItem } from '@/components/dashboard/EmprestimoPendenteItem'
import { ImprimirPendencias } from '@/components/dashboard/ImprimirPendencias'
import { KpiCard, type TomKpi } from '@/components/dashboard/KpiCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDashboard, type EmprestimoPendente, type FerramentaAguardando } from '@/hooks/useDashboard'
import { formatarPatrimonio } from '@/hooks/useFerramentas'

const ETAPA: Record<string, string> = {
  aberta: 'Ocorrência aberta',
  em_reparo: 'Em reparo',
  cobrada: 'Cobrada do colaborador',
}

const KPIS: { chave: keyof NonNullable<ReturnType<typeof useDashboard>['data']>['kpis']; label: string; tom?: TomKpi; to: string; dica?: string }[] = [
  { to: '/ferramentas', chave: 'cadastradas', label: 'Cadastradas' },
  { to: '/ferramentas?status=disponivel', chave: 'disponiveis', label: 'Disponíveis', tom: 'disponivel' },
  { to: '/ferramentas?status=em_uso', chave: 'em_uso', label: 'Em uso' },
  { to: '/ferramentas?status=indisponivel', chave: 'indisponiveis', label: 'Indisponíveis', tom: 'indisponivel' },
  { to: '/emprestimos?situacao=atrasado', chave: 'atrasadas', label: 'Atrasadas', tom: 'atraso' },
  { to: '/indisponiveis', chave: 'ocorrencias', label: 'Ocorrências abertas', tom: 'indisponivel' },
]

const plural = (dias: number) => `${dias} ${dias === 1 ? 'dia' : 'dias'}`

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
    // no desktop o painel ocupa exatamente a altura da tela (64px = cabeçalho), sem rolagem da página
    <div className="flex flex-col gap-3 p-4 lg:h-[calc(100svh-64px)]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? KPIS.map((k) => (
              <Card key={k.chave} className="gap-2 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-14" />
              </Card>
            ))
          : data && KPIS.map((k) => <KpiCard key={k.chave} label={k.label} valor={data.kpis[k.chave]} tom={k.tom} to={k.to} dica={k.dica} />)}
      </div>

      {/* no celular as duas ações vêm antes dos números: é para isso que o operador abre o app */}
      <div className="grid gap-3 max-sm:order-first sm:grid-cols-2">
        <AtalhoAcao
          to="/retiradas/nova"
          titulo="Registrar retirada"
          descricao="Bipe a ferramenta e o crachá"
          icone={ArrowUpRight}
          variante="primario"
        />
        <AtalhoAcao
          to="/devolucoes"
          titulo="Registrar devolução"
          descricao="Bipe a ferramenta que voltou"
          icone={ArrowDownLeft}
          variante="escuro"
        />
      </div>

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-2">
        <CartaoPendencias<EmprestimoPendente>
          lista="cobrar_hoje"
          titulo="Cobrar hoje"
          descricao="Devolução prevista para hoje"
          total={data?.cobrar_hoje.total}
          itens={data?.cobrar_hoje.itens}
          renderItem={(item) => (
            <EmprestimoPendenteItem key={item.id} item={item} prazo="Hoje" tomPrazo="text-status-atraso" />
          )}
          tom="text-status-atraso"
          vazio="Nenhuma devolução prevista para hoje."
          carregando={isLoading}
          acao={<ImprimirPendencias />}
        />

        <CartaoPendencias<EmprestimoPendente>
          lista="atrasados"
          titulo="Atrasados"
          descricao="Prazo já passou"
          total={data?.atrasados.total}
          itens={data?.atrasados.itens}
          renderItem={(item) => (
            <EmprestimoPendenteItem
              key={item.id}
              item={item}
              prazo={plural(item.dias)}
              tomPrazo="text-status-indisponivel"
            />
          )}
          tom="text-status-indisponivel"
          vazio="Nenhum empréstimo atrasado."
          carregando={isLoading}
        />

        <CartaoPendencias<EmprestimoPendente>
          lista="proximos_do_prazo"
          titulo="Próximos do prazo"
          descricao="Vencem nos próximos 3 dias"
          total={data?.proximos_do_prazo.total}
          itens={data?.proximos_do_prazo.itens}
          renderItem={(item) => (
            <EmprestimoPendenteItem
              key={item.id}
              item={item}
              prazo={`em ${plural(item.dias)}`}
              tomPrazo="text-muted-foreground"
            />
          )}
          tom="text-foreground"
          vazio="Nada vencendo nos próximos dias."
          carregando={isLoading}
        />

        <CartaoPendencias<FerramentaAguardando>
          lista="indisponiveis"
          titulo="Ferramentas indisponíveis"
          descricao="Aguardando alguma ação"
          total={data?.indisponiveis.total}
          itens={data?.indisponiveis.itens}
          renderItem={(item) => (
            <div key={item.ferramenta_id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-corpo font-medium">{item.ferramenta_nome}</p>
                <p className="truncate text-rotulo text-muted-foreground">
                  {formatarPatrimonio(item.codigo_identificacao)} · {item.etapa ? ETAPA[item.etapa] : 'Sem ocorrência'}
                  {item.tipo ? ` (${item.tipo.toLowerCase()})` : ''} · {item.dias_parada > 0 ? `parada há ${plural(item.dias_parada)}` : 'parada desde hoje'}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/indisponiveis">Tratar</Link>
              </Button>
            </div>
          )}
          tom="text-status-indisponivel"
          vazio="Nenhuma ferramenta indisponível."
          carregando={isLoading}
        />
      </div>
    </div>
  )
}
