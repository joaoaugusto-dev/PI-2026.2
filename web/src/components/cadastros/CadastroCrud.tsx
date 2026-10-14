import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, FileUp, Inbox, Loader2, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { ZodType } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { ImprimirEtiquetaDialog } from '@/components/ferramentas/ImprimirEtiquetaDialog'
import type { Ferramenta } from '@/hooks/useFerramentas'
import { SeletorFoto, type FotoSelecionada } from '@/components/ferramentas/SeletorFoto'
import { Paginacao } from '@/components/Paginacao'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEnviarFoto, useInativarCadastro, useListaCadastro, useRemoverFoto, useSalvarCadastro, type Recurso } from '@/hooks/useCadastro'
import { avisarErro } from '@/lib/avisar-erro'
import { comprimirImagem, urlDaFoto } from '@/lib/imagem'
import { playSomConfirmacao } from '@/lib/som-confirmacao'
import { FormularioCadastro, type Campo } from './FormularioCadastro'
import { ImportarCsvDialog, type ConfigCsv } from './ImportarCsvDialog'
import { ListaAgrupada } from './ListaAgrupada'

const LIMITE = 20
// agrupado, 20 unidades viram 4 linhas: página de 100 (máximo da API) mostra ~20 grupos
const LIMITE_AGRUPADO = 100

export interface Coluna<T> {
  cabecalho: string
  render: (item: T) => ReactNode
  /** Largura da coluna na grade larga (ex.: '4.5rem'); padrão: fatia igual do espaço. */
  largura?: string
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
  agrupar,
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
  /**
   * Junta unidades iguais (mesma `chave`, dentro da página) numa linha expansível com "+ Unidade".
   * A última coluna é a que muda por unidade: no grupo mostra `resumo` (ex.: "5 unidades"); na unidade, o próprio valor.
   * ponytail: agrupa só dentro da página, como a consulta pública; a API ordena por nome.
   */
  agrupar?: { chave: (item: T) => string; resumo: (itens: T[]) => ReactNode }
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
  const [salvandoTudo, setSalvandoTudo] = useState(false) // cobre registro + compressão + envio da foto
  const [criada, setCriada] = useState<Ferramenta | null>(null)
  const [importando, setImportando] = useState(false)
  useEffect(() => setFotoSel(null), [editando]) // cada abertura do pop-up começa sem foto escolhida
  const [inativando, setInativando] = useState<T | null>(null)
  const [duplicando, setDuplicando] = useState<number | null>(null)
  const [fotoGrupo, setFotoGrupo] = useState<T[] | null>(null)
  const [novaFoto, setNovaFoto] = useState<FotoSelecionada | 'remover' | null>(null)
  const [aplicandoFoto, setAplicandoFoto] = useState(false)
  const removerFoto = useRemoverFoto()

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(busca.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [busca])

  const { data, isLoading, isError } = useListaCadastro<T>(recurso, { q: q || undefined, page, limit: agrupar ? LIMITE_AGRUPADO : LIMITE })
  const salvar = useSalvarCadastro(recurso)
  const inativar = useInativarCadastro(recurso)
  // ferramenta é baixa lógica (o histórico fica), mas para o usuário é "excluir"
  const rotuloInativar = recurso === 'ferramentas' ? 'Excluir' : 'Inativar'
  const linhas = data?.data ?? []
  const meta = data?.meta

  const erroDaApi = (e: unknown) =>
    (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message

  function aoSalvar(valores: Valores) {
    const id = editando && editando !== 'novo' ? editando.id : undefined
    const arquivo = fotoSel?.tipo === 'arquivo' ? fotoSel.arquivo : null
    if (salvandoTudo) return
    setSalvandoTudo(true)
    salvar.mutate(
      { id, dados: paraPayload(valores, id !== undefined) },
      {
        onSuccess: async (resposta) => {
          playSomConfirmacao()
          toast.success(id ? `${singular} atualizado.` : `${singular} cadastrado.`)
          // o registro já está salvo; se só a foto falhar, avisa e fecha (dá para reenviar editando)
          const salvo = (resposta.data as { data: Ferramenta }).data
          const idSalvo = id ?? salvo.id
          if (foto && arquivo) {
            try {
              await enviarFoto.mutateAsync({ id: idSalvo, imagem: await comprimirImagem(arquivo) })
            } catch (e) {
              avisarErro(erroDaApi(e) ?? 'O cadastro foi salvo, mas não foi possível enviar a foto.')
            }
          }
          setSalvandoTudo(false)
          setEditando(null)
          if (!id && recurso === 'ferramentas' && salvo.codigo_identificacao) {
            setCriada(salvo)
          }
        },
        onError: (e) => {
          setSalvandoTudo(false)
          avisarErro(erroDaApi(e) ?? `Não foi possível salvar o ${singular.toLowerCase()}.`)
        },
      },
    )
  }

  // ao editar, mostra a foto já salva até o usuário escolher outra
  function fotoAtual(item: T | 'novo'): FotoSelecionada | null {
    const url = item === 'novo' ? null : (item as { foto_url?: string | null }).foto_url
    return url ? { tipo: 'url', url: urlDaFoto(url) } : null
  }

  // "+ Unidade": cria outra igual (mesmos dados, e a foto se houver) sem passar pelo formulário
  function adicionarUnidade(item: T) {
    setDuplicando(item.id)
    salvar
      .mutateAsync({ dados: paraPayload(deItem(item), false) })
      .then(async (resposta) => {
        playSomConfirmacao()
        const nova = (resposta.data as { data: Ferramenta }).data
        const fotoUrl = (item as { foto_url?: string | null }).foto_url
        if (fotoUrl) {
          try {
            const imagem = await (await fetch(urlDaFoto(fotoUrl))).blob()
            await enviarFoto.mutateAsync({ id: nova.id, imagem })
          } catch {
            avisarErro('Unidade criada, mas a foto não foi copiada. Edite para enviar a foto.')
          }
        }
        toast.success('Unidade adicionada.')
        if (nova.codigo_identificacao) setCriada(nova) // já abre a etiqueta da nova unidade
      })
      .catch((e) => avisarErro(erroDaApi(e) ?? 'Não foi possível adicionar a unidade.'))
      .finally(() => setDuplicando(null)) // só libera o botão depois da foto
  }

  // "Foto": a foto vale para o grupo inteiro (ou a unidade avulsa) e é gravada em cada unidade
  const fotoDoGrupo = fotoGrupo?.find((i) => (i as { foto_url?: string | null }).foto_url)
  const fotoDoGrupoAtual = fotoDoGrupo ? fotoAtual(fotoDoGrupo) : null
  const fotoExibida = novaFoto === 'remover' ? null : (novaFoto ?? fotoDoGrupoAtual)

  function fecharFotoGrupo() {
    setFotoGrupo(null)
    setNovaFoto(null)
  }

  async function aplicarFotoGrupo() {
    if (!fotoGrupo || !novaFoto) return
    setAplicandoFoto(true)
    try {
      if (novaFoto === 'remover') {
        await Promise.all(fotoGrupo.filter((i) => (i as { foto_url?: string | null }).foto_url).map((i) => removerFoto.mutateAsync(i.id)))
        toast.success('Foto removida.')
      } else if (novaFoto.tipo === 'arquivo') {
        const imagem = await comprimirImagem(novaFoto.arquivo)
        await Promise.all(fotoGrupo.map((i) => enviarFoto.mutateAsync({ id: i.id, imagem })))
        toast.success(fotoGrupo.length > 1 ? 'Foto aplicada ao grupo.' : 'Foto atualizada.')
      }
      fecharFotoGrupo()
    } catch (e) {
      avisarErro(erroDaApi(e) ?? 'Não foi possível salvar a foto.')
    } finally {
      setAplicandoFoto(false)
    }
  }

  const botaoFoto = (itens: T[]) =>
    foto && (
      <Button size="sm" variant="outline" onClick={() => setFotoGrupo(itens)}>
        <Camera /> Foto
      </Button>
    )

  const botaoUnidade = (item: T, rotulo = 'Unidade') => (
    <>
      {botaoFoto(porChave.get(agrupar?.chave(item) ?? '') ?? [item])}
      <Button size="sm" variant="outline" disabled={duplicando !== null} onClick={() => adicionarUnidade(item)}>
        {duplicando === item.id ? <Loader2 className="animate-spin" /> : <Plus />} {rotulo}
      </Button>
    </>
  )

  const porChave = new Map<string, T[]>()
  if (agrupar) for (const i of linhas) porChave.set(agrupar.chave(i), [...(porChave.get(agrupar.chave(i)) ?? []), i])
  const grupos: T[][] = [...porChave.values()]

  const botoesUnidade = (item: T, comUnidade: boolean) => (
    <>
      {comUnidade && botaoUnidade(item)}
      {acoesLinha?.(item)}
      <Button size="sm" variant="outline" onClick={() => setEditando(item)}>
        Editar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setInativando(item)}>
        {rotuloInativar}
      </Button>
    </>
  )

  function confirmarInativacao() {
    if (!inativando) return
    const ultimoDaPagina = linhas.length === 1 && page > 1
    inativar.mutate(inativando.id, {
      onSuccess: () => {
        toast.success(`${singular} ${recurso === 'ferramentas' ? 'excluída' : 'inativado'}.`)
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
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : linhas.length === 0 ? (
            <EmptyState
              icone={Inbox}
              titulo="Nenhum registro encontrado"
              descricao="Ajuste a busca ou cadastre um novo."
            />
          ) : (
            <ListaAgrupada
              colunas={colunas}
              grupos={agrupar ? grupos : linhas.map((i) => [i])}
              chave={agrupar?.chave ?? ((i) => String(i.id))}
              resumo={agrupar?.resumo ?? (() => null)}
              acoesGrupo={botaoUnidade}
              acoesUnidade={(item, avulsa) => botoesUnidade(item, avulsa && !!agrupar)}
              larguraAcoes={agrupar ? '24rem' : '16rem'}
            />
          )}
        </CardContent>
      </Card>

      <Paginacao meta={meta} page={page} onPage={setPage} itens="registros" />

      <Dialog open={editando !== null} onOpenChange={(a) => !a && !salvandoTudo && setEditando(null)}>
        <DialogContent className={foto ? 'sm:max-w-2xl' : undefined}>
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
              salvando={salvandoTudo}
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

      <Dialog open={fotoGrupo !== null} onOpenChange={(a) => !a && !aplicandoFoto && fecharFotoGrupo()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto da ferramenta</DialogTitle>
            <DialogDescription>
              {fotoGrupo && fotoGrupo.length > 1
                ? `Vale para as ${fotoGrupo.length} unidades do grupo.`
                : 'Escolha, troque ou remova a foto.'}
            </DialogDescription>
          </DialogHeader>
          <SeletorFoto
            semUrl
            value={fotoExibida}
            onChange={(f) => setNovaFoto(f ?? (novaFoto && novaFoto !== 'remover' ? null : 'remover'))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={aplicandoFoto} onClick={fecharFotoGrupo}>
              Cancelar
            </Button>
            <Button disabled={novaFoto === null || aplicandoFoto} onClick={aplicarFotoGrupo}>
              {aplicandoFoto && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inativando !== null} onOpenChange={(a) => !a && setInativando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rotuloInativar} {singular.toLowerCase()}?</DialogTitle>
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
              {inativar.isPending && <Loader2 className="size-4 animate-spin" />}
              {rotuloInativar}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImprimirEtiquetaDialog ferramenta={criada} aoFechar={() => setCriada(null)} />

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
