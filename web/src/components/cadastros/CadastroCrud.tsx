import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileUp, Inbox } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { ZodType } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { SeletorFoto, type FotoSelecionada } from '@/components/ferramentas/SeletorFoto'
import { Paginacao } from '@/components/Paginacao'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useEnviarFoto, useInativarCadastro, useListaCadastro, useSalvarCadastro, type Recurso } from '@/hooks/useCadastro'
import { avisarErro } from '@/lib/avisar-erro'
import { comprimirImagem, urlDaFoto } from '@/lib/imagem'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { FormularioCadastro, type Campo } from './FormularioCadastro'
import { ImportarCsvDialog, type ConfigCsv } from './ImportarCsvDialog'

const LIMITE = 20

export interface Coluna<T> {
  cabecalho: string
  render: (item: T) => ReactNode
}

type Valores = Record<string, string>

/**
 * Tela de cadastro auxiliar (FE-23 e irmãs): tabela com busca e paginação,
 * "Novo registro" (botão preto — cadastro é manutenção, não operação, ver
 * telas.md), Editar por linha, Inativar (nunca apaga) e importação de CSV.
 * Cada tela só descreve colunas, campos e schema.
 */
export function CadastroCrud<T extends { id: number }>({
  recurso,
  singular,
  nomeCsv,
  colunas,
  campos,
  schema,
  valoresVazios,
  deItem,
  paraPayload,
  csv,
  buscaPlaceholder,
  foto = false,
  acoesLinha,
}: {
  recurso: Recurso
  singular: string
  nomeCsv: string
  colunas: Coluna<T>[]
  campos: Campo[]
  schema: ZodType<Valores, Valores>
  valoresVazios: Valores
  deItem: (item: T) => Valores
  /** `edicao` é true no PATCH: campos esvaziados devem ir como null para limpar, em vez de omitidos. */
  paraPayload: (valores: Valores, edicao: boolean) => Record<string, unknown>
  csv: ConfigCsv
  buscaPlaceholder: string
  /** Mostra o seletor de foto no pop-up (câmera/galeria no celular, arquivo no PC); só para `/ferramentas`. */
  foto?: boolean
  /** Botões extras por linha, antes de Editar/Inativar (ex.: copiar link de acesso). */
  acoesLinha?: (item: T) => ReactNode
}) {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [editando, setEditando] = useState<T | 'novo' | null>(null)
  // quem chega com state.novo (ex.: botão "Cadastrar ferramenta") já cai com o pop-up de criar aberto
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if ((location.state as { novo?: boolean } | null)?.novo) {
      setEditando('novo')
      navigate(location.pathname, { replace: true, state: null }) // refresh não reabre
    }
  }, [location, navigate])
  const [fotoSel, setFotoSel] = useState<FotoSelecionada | null>(null)
  const enviarFoto = useEnviarFoto()
  const [importando, setImportando] = useState(false)
  useEffect(() => setFotoSel(null), [editando]) // cada abertura do pop-up começa sem foto escolhida
  const [inativando, setInativando] = useState<T | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(busca.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [busca])

  const { data, isLoading, isError } = useListaCadastro<T>(recurso, { q: q || undefined, page, limit: LIMITE })
  const salvar = useSalvarCadastro(recurso)
  const inativar = useInativarCadastro(recurso)
  const linhas = data?.data ?? []
  const meta = data?.meta

  const erroDaApi = (e: unknown) =>
    (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message

  function aoSalvar(valores: Valores) {
    const id = editando && editando !== 'novo' ? editando.id : undefined
    const arquivo = fotoSel?.tipo === 'arquivo' ? fotoSel.arquivo : null
    salvar.mutate(
      { id, dados: paraPayload(valores, id !== undefined) },
      {
        onSuccess: async (resposta) => {
          playSomConfirmacao()
          toast.success(id ? `${singular} atualizado.` : `${singular} cadastrado.`)
          // o registro já está salvo; se só a foto falhar, avisa e fecha (dá para reenviar editando)
          const idSalvo = id ?? (resposta.data as { data: { id: number } }).data.id
          if (foto && arquivo) {
            try {
              await enviarFoto.mutateAsync({ id: idSalvo, imagem: await comprimirImagem(arquivo) })
            } catch (e) {
              avisarErro(erroDaApi(e) ?? 'O cadastro foi salvo, mas não foi possível enviar a foto.')
            }
          }
          setEditando(null)
        },
        onError: (e) => avisarErro(erroDaApi(e) ?? `Não foi possível salvar o ${singular.toLowerCase()}.`),
      },
    )
  }

  // ao editar, mostra a foto já salva até o usuário escolher outra
  function fotoAtual(item: T | 'novo'): FotoSelecionada | null {
    const url = item === 'novo' ? null : (item as { foto_url?: string | null }).foto_url
    return url ? { tipo: 'url', url: urlDaFoto(url) } : null
  }

  function confirmarInativacao() {
    if (!inativando) return
    const ultimoDaPagina = linhas.length === 1 && page > 1
    inativar.mutate(inativando.id, {
      onSuccess: () => {
        toast.success(`${singular} inativado.`)
        setInativando(null)
        // inativou o único item de uma página que não é a primeira: senão sobra page > totalPages
        if (ultimoDaPagina) setPage(page - 1)
      },
      onError: (e) => avisarErro(erroDaApi(e) ?? 'Não foi possível inativar.'),
    })
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Buscar"
          placeholder={buscaPlaceholder}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" className="ml-auto" onClick={() => setImportando(true)}>
          <FileUp /> Importar CSV
        </Button>
        <Button className="bg-foreground text-background hover:bg-foreground/85" onClick={() => setEditando('novo')}>
          Novo registro
        </Button>
      </div>

      {isError && <p className="text-corpo text-destructive">Não foi possível carregar os registros.</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : linhas.length === 0 ? (
            <EmptyState
              icone={Inbox}
              titulo="Nenhum registro encontrado"
              descricao="Ajuste a busca ou cadastre um novo."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map((c) => (
                    <TableHead key={c.cabecalho}>{c.cabecalho}</TableHead>
                  ))}
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((item) => (
                  <TableRow key={item.id}>
                    {colunas.map((c) => (
                      <TableCell key={c.cabecalho}>{c.render(item)}</TableCell>
                    ))}
                    <TableCell className="flex justify-end gap-2">
                      {acoesLinha?.(item)}
                      <Button size="sm" variant="outline" onClick={() => setEditando(item)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setInativando(item)}>
                        Inativar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Paginacao meta={meta} page={page} onPage={setPage} itens="registros" />

      <Dialog open={editando !== null} onOpenChange={(a) => !a && !salvar.isPending && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando === 'novo' ? `Novo ${singular.toLowerCase()}` : `Editar ${singular.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <FormularioCadastro
              key={editando === 'novo' ? 'novo' : editando.id}
              campos={campos}
              schema={schema}
              valoresIniciais={editando === 'novo' ? valoresVazios : deItem(editando)}
              salvando={salvar.isPending || enviarFoto.isPending}
              onSubmit={aoSalvar}
              onCancelar={() => setEditando(null)}
              extra={
                foto && (
                  <SeletorFoto
                    semUrl
                    value={fotoSel ?? fotoAtual(editando)}
                    removivel={fotoSel !== null}
                    onChange={setFotoSel}
                  />
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={inativando !== null} onOpenChange={(a) => !a && setInativando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar {singular.toLowerCase()}?</DialogTitle>
            <DialogDescription>O registro sai das listas, mas o histórico é mantido.</DialogDescription>
          </DialogHeader>
          {inativando && (
            <dl className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2 text-corpo">
              {colunas.map((c) => (
                <div key={c.cabecalho} className="flex gap-2">
                  <dt className="text-muted-foreground">{c.cabecalho}:</dt>
                  <dd>{c.render(inativando)}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInativando(null)}>
              Cancelar
            </Button>
            <Button disabled={inativar.isPending} onClick={confirmarInativacao}>
              Inativar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportarCsvDialog
        aberto={importando}
        onFechar={() => setImportando(false)}
        recurso={recurso}
        nomeArquivo={nomeCsv}
        config={csv}
        onImportado={() => queryClient.invalidateQueries({ queryKey: [recurso] })}
      />
    </div>
  )
}
