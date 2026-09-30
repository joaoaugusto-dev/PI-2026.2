import { z } from 'zod'
import { CadastroPage } from '@/components/cadastros/CadastroPage'
import { useCategorias } from '@/hooks/useCategorias'
import { formatarPatrimonio, type Ferramenta } from '@/hooks/useFerramentas'
import { useSetores } from '@/hooks/useSetores'

const schema = z.object({
  nome: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(150, 'Máximo de 150 caracteres'),
  grupoId: z.string().min(1, 'Selecione a categoria'),
  marca: z.string().max(100, 'Máximo de 100 caracteres'),
  modelo: z.string().max(100, 'Máximo de 100 caracteres'),
  setorId: z.string(),
  localizacao: z.string().max(150, 'Máximo de 150 caracteres'),
})

const opcional = (v?: string) => v || undefined

export function CadastroFerramentasPage() {
  const { data: categorias = [] } = useCategorias()
  const { data: setores = [] } = useSetores()
  const nomeDe = (lista: { id: number; nome: string }[], id: number | null) =>
    lista.find((i) => i.id === id)?.nome ?? '—'

  return (
    <CadastroPage<Ferramenta>
      recurso="ferramentas"
      singular="Ferramenta"
      nomeCsv="modelo-ferramentas.csv"
      buscaPlaceholder="Buscar por nome, marca ou modelo"
      colunas={[
        {
          cabecalho: 'Patrimônio',
          render: (f) => <span className="font-mono">{formatarPatrimonio(f.codigo_identificacao)}</span>,
        },
        { cabecalho: 'Nome', render: (f) => f.nome },
        { cabecalho: 'Categoria', render: (f) => nomeDe(categorias, f.grupo_id) },
        { cabecalho: 'Marca / modelo', render: (f) => [f.marca, f.modelo].filter(Boolean).join(' ') || '—' },
        { cabecalho: 'Setor', render: (f) => nomeDe(setores, f.setor_id) },
      ]}
      campos={[
        { name: 'nome', label: 'Nome da ferramenta' },
        {
          name: 'grupoId',
          label: 'Categoria',
          opcoes: categorias.map((c) => ({ value: String(c.id), label: c.nome })),
        },
        { name: 'marca', label: 'Marca (opcional)' },
        { name: 'modelo', label: 'Modelo (opcional)' },
        {
          name: 'setorId',
          label: 'Setor (opcional)',
          opcoes: setores.map((s) => ({ value: String(s.id), label: s.nome })),
        },
        { name: 'localizacao', label: 'Localização (opcional)' },
      ]}
      schema={schema}
      valoresVazios={{ nome: '', grupoId: '', marca: '', modelo: '', setorId: '', localizacao: '' }}
      deItem={(f) => ({
        nome: f.nome,
        grupoId: String(f.grupo_id),
        marca: f.marca ?? '',
        modelo: f.modelo ?? '',
        setorId: String(f.setor_id ?? ''),
        localizacao: f.localizacao ?? '',
      })}
      paraPayload={(v) => ({
        nome: v.nome,
        grupoId: Number(v.grupoId),
        marca: opcional(v.marca),
        modelo: opcional(v.modelo),
        setorId: v.setorId ? Number(v.setorId) : undefined,
        localizacao: opcional(v.localizacao),
      })}
      csv={{
        colunas: ['nome', 'categoria', 'marca', 'modelo'],
        exemplo: ['Furadeira de impacto', categorias[0]?.nome ?? 'Elétricas', 'Bosch', 'GSB 13'],
        paraPayload: (l) => {
          const cat = categorias.find((c) => c.nome.toLowerCase() === l.categoria?.toLowerCase())
          if (!cat) throw new Error(`Categoria "${l.categoria}" não cadastrada`)
          return { nome: l.nome, grupoId: cat.id, marca: opcional(l.marca), modelo: opcional(l.modelo) }
        },
      }}
    />
  )
}
