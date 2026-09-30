import { z } from 'zod'
import { CadastroCrud } from '@/components/cadastros/CadastroCrud'
import type { Colaborador } from '@/hooks/useOcorrencias'
import { useSetores } from '@/hooks/useSetores'

const schema = z.object({
  matricula: z.string().regex(/^(?!0000)\d{4}$/, 'A matrícula tem 4 dígitos'),
  nome: z.string().trim().min(1, 'Informe o nome').max(150, 'Máximo de 150 caracteres'),
  setorId: z.string().min(1, 'Selecione o setor'),
})

export function ColaboradoresPage() {
  const { data: setores = [] } = useSetores()
  const nomeDoSetor = (id: number | null) => setores.find((s) => s.id === id)?.nome ?? '—'

  return (
    <CadastroCrud<Colaborador>
      recurso="colaboradores"
      singular="Colaborador"
      nomeCsv="modelo-colaboradores.csv"
      buscaPlaceholder="Buscar por nome ou matrícula"
      colunas={[
        { cabecalho: 'Matrícula', render: (c) => <span className="font-mono font-medium">{c.matricula}</span> },
        { cabecalho: 'Nome', render: (c) => c.nome },
        { cabecalho: 'Setor', render: (c) => nomeDoSetor(c.setor_id) },
      ]}
      campos={[
        { name: 'matricula', label: 'Matrícula (4 dígitos)', inputMode: 'numeric', placeholder: '0000' },
        { name: 'nome', label: 'Nome completo' },
        { name: 'setorId', label: 'Setor', opcoes: setores.map((s) => ({ value: String(s.id), label: s.nome })) },
      ]}
      schema={schema}
      valoresVazios={{ matricula: '', nome: '', setorId: '' }}
      deItem={(c) => ({ matricula: c.matricula, nome: c.nome, setorId: String(c.setor_id ?? '') })}
      paraPayload={(v) => ({ matricula: v.matricula, nome: v.nome, setorId: Number(v.setorId) })}
      csv={{
        colunas: ['matricula', 'nome', 'setor'],
        exemplo: ['0001', 'Nome Sobrenome', setores[0]?.nome ?? 'Usinagem'],
        paraPayload: (l) => {
          const setor = setores.find((s) => s.nome.toLowerCase() === l.setor?.toLowerCase())
          if (!setor) throw new Error(`Setor "${l.setor}" não cadastrado`)
          return { matricula: l.matricula, nome: l.nome, setorId: setor.id }
        },
      }}
    />
  )
}
