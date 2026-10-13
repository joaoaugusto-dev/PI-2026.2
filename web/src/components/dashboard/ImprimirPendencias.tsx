import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatarPatrimonio } from '@/hooks/useFerramentas'
import type { EmprestimoPendente, NomeLista } from '@/hooks/useDashboard'
import { useImprimir } from '@/hooks/useImprimir'
import { api } from '@/lib/api'
import { avisarErro, mensagemDeErro } from '@/lib/avisar-erro'
import { dataBR, dataHoraBR } from '@/lib/formatar'

/** Lista inteira de um cartão do dashboard, juntando as páginas de 50 (o máximo da API). */
async function buscarTudo(lista: NomeLista): Promise<EmprestimoPendente[]> {
  const itens: EmprestimoPendente[] = []
  for (let page = 1; ; page++) {
    const { data } = await api.get<{ data: EmprestimoPendente[]; meta: { totalPages: number } }>(`/dashboard/${lista}`, {
      params: { page, limit: 50 },
    })
    itens.push(...data.data)
    // teto de 40 páginas (2000 itens): protege de um totalPages inesperado
    if (page >= data.meta.totalPages || page >= 40) return itens
  }
}

function Tabela({ titulo, itens, prazo }: { titulo: string; itens: EmprestimoPendente[]; prazo: (i: EmprestimoPendente) => string }) {
  return (
    <section>
      <h2>
        {titulo} ({itens.length})
      </h2>
      {itens.length === 0 ? (
        <p>Nenhum.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Ferramenta</th>
              <th>Colaborador</th>
              <th>Setor</th>
              <th>Previsão</th>
              <th>Prazo</th>
              <th>Devolvida?</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td>{formatarPatrimonio(i.codigo_identificacao)}</td>
                <td>{i.ferramenta_nome}</td>
                <td>
                  {i.colaborador_nome} ({i.colaborador_matricula})
                </td>
                <td>{i.setor_nome}</td>
                <td>{dataBR(i.previsao_devolucao)}</td>
                <td>{prazo(i)}</td>
                <td className="lista-check">☐</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/**
 * Lista de cobrança em A4 (pedido do operador na visita técnica: imprimir logo cedo, rabiscar e levar
 * até quem está com a ferramenta). Busca atrasados + cobrar hoje inteiros na hora do clique e usa o
 * mesmo useImprimir da etiqueta (o logo no topo é o que ele espera carregar).
 */
export function ImprimirPendencias() {
  const { imprimindo, imprimir } = useImprimir()
  const [listas, setListas] = useState<{ atrasados: EmprestimoPendente[]; hoje: EmprestimoPendente[]; geradaEm: string } | null>(null)
  const [buscando, setBuscando] = useState(false)

  async function aoClicar() {
    setBuscando(true)
    try {
      const [atrasados, hoje] = await Promise.all([buscarTudo('atrasados'), buscarTudo('cobrar_hoje')])
      setListas({ atrasados, hoje, geradaEm: new Date().toISOString() })
      imprimir()
    } catch (e) {
      avisarErro(mensagemDeErro(e, 'Não foi possível montar a lista de cobrança.'))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={aoClicar} disabled={buscando || imprimindo} title="Imprimir atrasados e devoluções de hoje">
        {buscando ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
        Imprimir
      </Button>
      {imprimindo &&
        listas &&
        createPortal(
          <div className="lista-impressao">
            <header>
              <img src="/brand/soufer-assinatura.png" alt="Soufer" />
              <div>
                <h1>Lista de cobrança de ferramentas</h1>
                <p>Gerada em {dataHoraBR(listas.geradaEm)}</p>
              </div>
            </header>
            <Tabela titulo="Atrasados" itens={listas.atrasados} prazo={(i) => `${i.dias}d de atraso`} />
            <Tabela titulo="Cobrar hoje" itens={listas.hoje} prazo={() => 'Hoje'} />
          </div>,
          document.body,
        )}
    </>
  )
}
