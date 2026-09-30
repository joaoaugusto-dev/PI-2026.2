import { z } from 'zod'
import { CadastroCrud } from '@/components/cadastros/CadastroCrud'
import type { Setor } from '@/hooks/useSetores'

const schema = z.object({ nome: z.string().trim().min(1, 'Informe o nome').max(100, 'Máximo de 100 caracteres') })

export function SetoresPage() {
  return (
    <CadastroCrud<Setor>
      recurso="setores"
      singular="Setor"
      nomeCsv="modelo-setores.csv"
      buscaPlaceholder="Buscar setor"
      colunas={[{ cabecalho: 'Nome', render: (s) => s.nome }]}
      campos={[{ name: 'nome', label: 'Nome do setor' }]}
      schema={schema}
      valoresVazios={{ nome: '' }}
      deItem={(s) => ({ nome: s.nome })}
      paraPayload={(v) => ({ nome: v.nome })}
      csv={{ colunas: ['nome'], exemplo: ['Usinagem'], paraPayload: (l) => ({ nome: l.nome }) }}
    />
  )
}
