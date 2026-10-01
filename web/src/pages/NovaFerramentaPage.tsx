import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { ImprimirEtiquetaDialog } from '@/components/ferramentas/ImprimirEtiquetaDialog'
import { SeletorFoto, type FotoSelecionada } from '@/components/ferramentas/SeletorFoto'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useCategorias } from '@/hooks/useCategorias'
import { formatarPatrimonio, useCriarFerramenta, type Ferramenta } from '@/hooks/useFerramentas'
import { useSetores } from '@/hooks/useSetores'
import { avisarErro } from '@/lib/avisar-erro'
import { playSomConfirmacao } from '@/lib/som-confirmacao'

const schema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da ferramenta').max(150),
  grupoId: z.string().min(1, 'Selecione uma categoria'),
  setorId: z.string().optional(),
  marca: z.string().trim().max(100).optional(),
  modelo: z.string().trim().max(100).optional(),
  localizacao: z.string().trim().max(150).optional(),
  descricao: z.string().trim().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

const SEM_SETOR = 'nenhum'

export function NovaFerramentaPage() {
  const navigate = useNavigate()
  const { data: categorias } = useCategorias()
  const { data: setores } = useSetores()
  const criar = useCriarFerramenta()
  // ponytail: coluna `foto_url` existe no banco, mas a API ainda não tem
  // endpoint de upload — guarda o arquivo/URL só pro preview, sem enviar no
  // submit. Wire-up fica pra quando a API-XX de upload existir.
  const [foto, setFoto] = useState<FotoSelecionada | null>(null)
  const [criada, setCriada] = useState<Ferramenta | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', grupoId: '', setorId: SEM_SETOR, marca: '', modelo: '', localizacao: '', descricao: '' },
  })

  async function onSubmit(dados: FormValues) {
    try {
      const ferramenta = await criar.mutateAsync({
        nome: dados.nome,
        grupoId: Number(dados.grupoId),
        setorId: dados.setorId && dados.setorId !== SEM_SETOR ? Number(dados.setorId) : undefined,
        marca: dados.marca || undefined,
        modelo: dados.modelo || undefined,
        localizacao: dados.localizacao || undefined,
        descricao: dados.descricao || undefined,
      })
      playSomConfirmacao()
      toast.success(`${ferramenta.nome} cadastrada como ${formatarPatrimonio(ferramenta.codigo_identificacao)}.`)
      setCriada(ferramenta)
    } catch (erroRequisicao: any) {
      const erroApi = erroRequisicao?.response?.data?.error
      if (erroApi?.code === 'VALIDATION_ERROR' && Array.isArray(erroApi.details)) {
        for (const detalhe of erroApi.details as { field: string; message: string }[]) {
          if (detalhe.field in dados) {
            setError(detalhe.field as keyof FormValues, { message: detalhe.message })
          }
        }
        return
      }
      avisarErro(erroApi?.message ?? 'Não foi possível cadastrar a ferramenta. Tente novamente.')
    }
  }

  function onErroValidacao(errosForm: FieldErrors<FormValues>) {
    const primeiraMensagem = Object.values(errosForm)[0]?.message
    if (primeiraMensagem) avisarErro(primeiraMensagem)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link to="/ferramentas">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-titulo">Cadastrar ferramenta</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onErroValidacao)} noValidate>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="shadow-xs">
            <CardContent>
              <SeletorFoto value={foto} onChange={setFoto} />
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-secao">Dados da ferramenta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" autoFocus aria-invalid={!!errors.nome} {...register('nome')} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="grupoId">Categoria</Label>
                  <Controller
                    name="grupoId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="grupoId" className="w-full" aria-invalid={!!errors.grupoId}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias?.map((categoria) => (
                            <SelectItem key={categoria.id} value={String(categoria.id)}>
                              {categoria.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setorId">Setor</Label>
                  <Controller
                    name="setorId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="setorId" className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_SETOR}>Nenhum</SelectItem>
                          {setores?.map((setor) => (
                            <SelectItem key={setor.id} value={String(setor.id)}>
                              {setor.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input id="localizacao" placeholder="Ex.: Prateleira A3" {...register('localizacao')} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="marca">Marca</Label>
                  <Input id="marca" {...register('marca')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" {...register('modelo')} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" rows={4} {...register('descricao')} />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/ferramentas')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={criar.isPending} className="gap-1.5">
                  {criar.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Cadastrar ferramenta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <ImprimirEtiquetaDialog ferramenta={criada} aoFechar={() => navigate('/ferramentas')} />
    </div>
  )
}
