import { z } from 'zod'
import { CadastroCrud } from '@/components/cadastros/CadastroCrud'
import { useCategorias } from '@/hooks/useCategorias'
import { useQueryClient } from '@tanstack/react-query'
import { chaveFerramenta, formatarPatrimonio, todasFerramentasQuery, type Ferramenta } from '@/hooks/useFerramentas'
import { useSetores } from '@/hooks/useSetores'

const schema = z.object({
  nome: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(150, 'Máximo de 150 caracteres'),
  grupoId: z.string().min(1, 'Selecione a categoria'),
  marca: z.string().max(100, 'Máximo de 100 caracteres'),
  modelo: z.string().max(100, 'Máximo de 100 caracteres'),
  setorId: z.string(),
  localizacao: z.string().max(150, 'Máximo de 150 caracteres'),
})

// na edição, campo esvaziado vai como null para limpar o valor no banco (omitir a chave o manteria)
const opcional = (v: string | undefined, edicao = false) => v || (edicao ? null : undefined)

export function CadastroFerramentasPage() {
  const { data: categorias = [] } = useCategorias()
  const { data: setores = [] } = useSetores()
  const queryClient = useQueryClient()
  const nomeDe = (lista: { id: number; nome: string }[], id: number | null) =>
    lista.find((i) => i.id === id)?.nome ?? '—'

  return (
    <CadastroCrud<Ferramenta>
      recurso="ferramentas"
      singular="Ferramenta"
      nomeCsv="modelo-ferramentas.csv"
      buscaPlaceholder="Buscar por nome, marca ou modelo"
      foto
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
      paraPayload={(v, edicao) => ({
        nome: v.nome,
        grupoId: Number(v.grupoId),
        marca: opcional(v.marca, edicao),
        modelo: opcional(v.modelo, edicao),
        setorId: v.setorId ? Number(v.setorId) : edicao ? null : undefined,
        localizacao: opcional(v.localizacao, edicao),
      })}
      csv={{
        colunas: ['nome', 'categoria', 'marca', 'modelo'],
        exemplo: ['Furadeira de impacto', categorias[0]?.nome ?? 'Elétricas', 'Bosch', 'GSB 13'],
        // a API só barra código repetido (gerado por ela): nome, marca e modelo iguais passam,
        // então o diálogo confere com as ferramentas ativas ao escolher o arquivo
        chave: (l) => chaveFerramenta(l.nome, l.marca, l.modelo),
        conferirDuplicadas: async () => {
          const { itens, truncado } = await queryClient.fetchQuery(todasFerramentasQuery)
          return {
            existentes: new Set(itens.map((f) => chaveFerramenta(f.nome, f.marca, f.modelo))),
            aviso: truncado ? 'Catálogo maior que 5.000 itens: a conferência cobre só os primeiros 5.000.' : undefined,
          }
        },
        paraPayload: (l) => {
          const cat = categorias.find((c) => c.nome.toLowerCase() === l.categoria?.toLowerCase())
          if (!cat) throw new Error(`Categoria "${l.categoria}" não cadastrada`)
          return { nome: l.nome, grupoId: cat.id, marca: opcional(l.marca), modelo: opcional(l.modelo) }
        },
      }}
    />
  )
}
