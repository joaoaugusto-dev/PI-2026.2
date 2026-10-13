import { z } from 'zod'
import { CadastroCrud } from '@/components/cadastros/CadastroCrud'
import type { Categoria } from '@/hooks/useCategorias'

const schema = z.object({ nome: z.string().trim().min(1, 'Informe o nome').max(100, 'Máximo de 100 caracteres') })

export function CategoriasPage() {
  return (
    <CadastroCrud<Categoria>
      recurso="categorias"
      singular="Categoria"
      nomeCsv="modelo-categorias.csv"
      buscaPlaceholder="Buscar categoria"
      colunas={[{ cabecalho: 'Nome', render: (c) => c.nome }]}
      campos={[{ name: 'nome', label: 'Nome da categoria' }]}
      schema={schema}
      valoresVazios={{ nome: '' }}
      deItem={(c) => ({ nome: c.nome })}
      paraPayload={(v) => ({ nome: v.nome })}
      csv={{ colunas: ['nome'], exemplo: ['Elétricas'], paraPayload: (l) => ({ nome: l.nome }) }}
    />
  )
}
