import { useMemo, useState } from 'react'
import { LayoutDashboard } from 'lucide-react'
import { CARTOES, type Cartao } from '@/components/analises/catalogo'
import { ExportarAnalises } from '@/components/analises/ExportarAnalises'
import { PainelJustificado } from '@/components/analises/PainelJustificado'
import { PersonalizarPainel } from '@/components/analises/PersonalizarPainel'
import { SeletorPeriodo } from '@/components/analises/SeletorPeriodo'
import { EmptyState } from '@/components/EmptyState'
import { usePreferenciasAnalises } from '@/hooks/usePreferenciasAnalises'
import { useAuth } from '@/lib/auth'
import { periodoDoAtalho } from '@/lib/periodo'

/**
 * Análises (KPIs de gestão, `GET /v1/kpis/*`, issue #208): painel que cada pessoa monta do seu jeito, com
 * um período para todos os cartões, layout que se encaixa na área útil, relatório A4 e planilha .xlsx.
 */
export function AnalisesPage() {
  const { usuario } = useAuth()
  const { prefs, periodo, periodoValido, alterar, restaurar } = usePreferenciasAnalises(usuario?.id)
  // período personalizado pela metade (só uma data trocada): os cartões seguram o último válido em vez de dar 400
  const [aplicado, setAplicado] = useState(() => (periodoValido ? periodo : periodoDoAtalho('30d')))
  if (periodoValido && (aplicado.de !== periodo.de || aplicado.ate !== periodo.ate)) setAplicado(periodo)

  // o ranking de colaboradores expõe nome e matrícula: a API dá 403 para a manutenção, a tela nem oferece
  const permitidos = useMemo(() => CARTOES.filter((c) => !c.soAdmin || usuario?.papel === 'admin') as Cartao<unknown>[], [usuario?.papel])
  const visiveis = useMemo(
    () => prefs.ordem.flatMap((id) => permitidos.filter((c) => c.id === id && !prefs.ocultos.includes(id))),
    [prefs.ordem, prefs.ocultos, permitidos],
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SeletorPeriodo
          atalho={prefs.atalho}
          periodo={periodo}
          personalizado={prefs.personalizado}
          aoMudar={({ atalho, personalizado }) => alterar({ atalho, ...(personalizado && { personalizado }) })}
        />
        <div className="flex flex-wrap gap-2">
          <PersonalizarPainel cartoes={permitidos} prefs={prefs} alterar={alterar} restaurar={restaurar} />
          <ExportarAnalises cartoes={visiveis} periodo={aplicado} autor={usuario?.nome ?? ''} desabilitado={!periodoValido || visiveis.length === 0} />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState icone={LayoutDashboard} titulo="Nenhum cartão no painel" descricao="Use Personalizar para escolher o que mostrar." />
      ) : (
        <PainelJustificado cartoes={visiveis} tamanhos={prefs.tamanhos} periodo={aplicado} />
      )}
    </div>
  )
}
