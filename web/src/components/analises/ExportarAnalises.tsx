import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FileSpreadsheet, Loader2, Printer } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { Cartao, Tabela } from '@/components/analises/catalogo'
import { GraficoEvolucao } from '@/components/analises/GraficoEvolucao'
import { Button } from '@/components/ui/Button'
import { useImprimir } from '@/hooks/useImprimir'
import { garantirKpi, type Evolucao } from '@/hooks/useKpis'
import { avisarErro, mensagemDeErro } from '@/lib/avisar-erro'
import { dataBR, dataHoraBR } from '@/lib/formatar'
import { inteiroBR, percentualBR } from '@/lib/numeros'
import { diasNoPeriodo, type Periodo } from '@/lib/periodo'
import { baixarPlanilhaAnalises } from '@/lib/planilha-analises'

type Item = { cartao: Cartao<unknown>; dado: unknown }

// largura útil do A4 (210 mm − 2 × 14 mm de margem) em px CSS de 96 dpi
const LARGURA_A4 = 680

function celula(valor: string | number, tipo: Tabela['colunas'][number]['tipo']) {
  if (typeof valor === 'string') return valor
  if (tipo === 'percentual') return percentualBR(valor * 100)
  if (tipo === 'decimal') return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return inteiroBR(valor)
}

const comMovimento = (t: Tabela): Tabela => ({ ...t, linhas: t.linhas.filter((l) => l.some((v) => typeof v === 'number' && v > 0)) })

function TabelaImpressa({ tabela }: { tabela: Tabela }) {
  if (tabela.linhas.length === 0) return <p className="relatorio-vazio">Nenhum registro no período.</p>
  const iBarra = tabela.colunas.findIndex((c) => c.barra)
  const maior = iBarra < 0 ? 1 : Math.max(...tabela.linhas.map((l) => Number(l[iBarra])), Number.MIN_VALUE)
  return (
    <table>
      <thead>
        <tr>
          {tabela.colunas.map((c) => (
            <th key={c.titulo} className={c.tipo === 'texto' ? undefined : 'num'}>
              {c.titulo}
            </th>
          ))}
          {iBarra >= 0 && <th aria-hidden />}
        </tr>
      </thead>
      <tbody>
        {tabela.linhas.map((linha, i) => (
          <tr key={i}>
            {linha.map((v, c) => (
              <td key={c} className={tabela.colunas[c].tipo === 'texto' ? undefined : 'num'}>
                {celula(v, tabela.colunas[c].tipo)}
              </td>
            ))}
            {iBarra >= 0 && (
              <td className="relatorio-barra">
                <div style={{ width: Number(linha[iBarra]) > 0 ? `${Math.max((Number(linha[iBarra]) / maior) * 100, 1)}%` : 0 }} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Relatório em A4: cabeçalho com o logo, caixas de destaque e uma seção por cartão, na ordem do painel. */
function Relatorio({ itens, periodo, autor, geradoEm }: { itens: Item[]; periodo: Periodo; autor: string; geradoEm: string }) {
  const destaques = itens.flatMap(({ cartao, dado }) => (cartao.destaque ? [{ id: cartao.id, titulo: cartao.titulo, ...cartao.destaque(dado as never) }] : []))
  const dias = diasNoPeriodo(periodo)
  return (
    <div className="relatorio-impressao">
      <header>
        <img src="/brand/soufer-assinatura.png" alt="Soufer" />
        <div>
          <h1>Relatório de análises</h1>
          <p className="relatorio-meta">
            {dataBR(periodo.de)} a {dataBR(periodo.ate)} ({dias} {dias === 1 ? 'dia' : 'dias'}) · gerado em {dataHoraBR(geradoEm)} por {autor}
          </p>
        </div>
      </header>
      {destaques.length > 0 && (
        <div className="relatorio-resumo">
          {destaques.map((d) => (
            <div key={d.id}>
              <small>{d.titulo}</small>
              <strong>{d.valor}</strong>
              <span>{d.detalhe}</span>
            </div>
          ))}
        </div>
      )}
      {itens.map(({ cartao, dado }) =>
        cartao.tabela ? (
          <section key={cartao.id}>
            <h2>{cartao.titulo}</h2>
            <p className="relatorio-descricao">{cartao.descricao}</p>
            {cartao.id === 'evolucao' ? (
              <>
                <div className="relatorio-grafico">
                  <GraficoEvolucao dado={dado as Evolucao} altura={3 * 64 + 24} largura={LARGURA_A4} />
                </div>
                {/* no papel só os dias com movimento: 30 linhas de zero não dizem nada que o gráfico não diga */}
                <TabelaImpressa tabela={comMovimento(cartao.tabela(dado as never))} />
              </>
            ) : (
              <TabelaImpressa tabela={cartao.tabela(dado as never)} />
            )}
          </section>
        ) : null,
      )}
    </div>
  )
}

/**
 * Impressão (A4) e planilha (.xlsx) do que está no painel: os cartões visíveis, na ordem e no período da
 * tela. Os dados saem do mesmo cache dos cartões (só busca o que ainda não carregou).
 */
export function ExportarAnalises({ cartoes, periodo, autor, desabilitado }: { cartoes: Cartao<unknown>[]; periodo: Periodo; autor: string; desabilitado: boolean }) {
  const cliente = useQueryClient()
  const { imprimindo, imprimir } = useImprimir()
  const [ocupado, setOcupado] = useState<'imprimir' | 'planilha' | null>(null)
  const [relatorio, setRelatorio] = useState<{ itens: Item[]; geradoEm: string } | null>(null)

  async function carregar() {
    return Promise.all(cartoes.map(async (cartao) => ({ cartao, dado: await garantirKpi(cliente, cartao.consulta(periodo)) })))
  }

  async function aoImprimir() {
    setOcupado('imprimir')
    try {
      setRelatorio({ itens: await carregar(), geradoEm: new Date().toISOString() })
      imprimir()
    } catch (e) {
      avisarErro(mensagemDeErro(e, 'Não foi possível montar o relatório.'))
    } finally {
      setOcupado(null)
    }
  }

  async function aoBaixarPlanilha() {
    setOcupado('planilha')
    try {
      await baixarPlanilhaAnalises(await carregar(), periodo, autor)
    } catch (e) {
      avisarErro(mensagemDeErro(e, 'Não foi possível gerar a planilha.'))
    } finally {
      setOcupado(null)
    }
  }

  const travado = desabilitado || ocupado !== null || imprimindo
  return (
    <>
      <Button variant="outline" onClick={aoImprimir} disabled={travado}>
        {ocupado === 'imprimir' ? <Loader2 className="animate-spin" /> : <Printer />}
        Imprimir
      </Button>
      <Button variant="outline" onClick={aoBaixarPlanilha} disabled={travado}>
        {ocupado === 'planilha' ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
        Planilha
      </Button>
      {imprimindo && relatorio && createPortal(<Relatorio itens={relatorio.itens} periodo={periodo} autor={autor} geradoEm={relatorio.geradoEm} />, document.body)}
    </>
  )
}
