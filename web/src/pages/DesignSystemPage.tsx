import { useState } from 'react'
import { CheckCircle2Icon } from 'lucide-react'
import { StatusBadge, type Status } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

/**
 * FE-01 — pagina de estilos do SOUFER Tools.
 *
 * A equipe fechou o design system em codigo (tokens em `src/index.css`) em vez
 * do Figma; esta pagina e o entregavel "pagina de estilos publicada" da issue
 * e a referencia visual para todas as telas seguintes.
 */

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>{children}</div>
  )
}

function Demo({
  nome,
  classe,
  nota,
  children,
}: {
  nome: string
  classe: string
  nota: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-secao">{nome}</p>
        <code className="font-mono text-sm text-muted-foreground">.{classe}</code>
      </div>
      {children}
      <p className="text-sm text-muted-foreground">{nota}</p>
    </div>
  )
}

const paleta = [
  { nome: 'Red', hex: '#E30613', uso: 'Ação primária, marca' },
  { nome: 'Red dark', hex: '#B5121B', uso: 'Hover / pressionado' },
  { nome: 'Black', hex: '#1D1D1B', uso: 'Texto, ação secundária' },
  { nome: 'Gray', hex: '#575756', uso: 'Texto de apoio, Em uso' },
  { nome: 'Gray light', hex: '#D9D9D9', uso: 'Bordas, divisores' },
  { nome: 'White', hex: '#FFFFFF', uso: 'Superfície de card' },
  { nome: 'Verde operacional', hex: '#1B8A4B', uso: 'Só badge, KPI, indicador' },
  { nome: 'Âmbar operacional', hex: '#C77700', uso: 'Atraso, vence hoje' },
]

const tipografia = [
  { nome: 'Display', spec: '600 · 40px', classe: 'text-display' },
  { nome: 'Título', spec: '600 · 25px', classe: 'text-titulo' },
  { nome: 'Seção', spec: '600 · 16px', classe: 'text-secao' },
  { nome: 'Corpo', spec: '400 · 16px', classe: 'text-corpo' },
  { nome: 'Rótulo', spec: '500 · 11px', classe: 'text-rotulo uppercase tracking-[0.08em]' },
  { nome: 'Código', spec: 'Mono · 500', classe: 'font-mono font-medium text-titulo' },
  { nome: 'KPI', spec: '600 · 38px', classe: 'text-kpi' },
]

const kpis = [
  { rotulo: 'Cadastradas', valor: '486', marca: 'bg-foreground', cor: '' },
  { rotulo: 'Disponíveis', valor: '312', marca: 'bg-status-disponivel', cor: 'text-status-disponivel' },
  { rotulo: 'Em uso', valor: '158', marca: 'border-2 border-status-em-uso', cor: '' },
  { rotulo: 'Indisponíveis', valor: '16', marca: 'bg-status-indisponivel', cor: 'text-status-indisponivel' },
  { rotulo: 'Atrasadas', valor: '7', marca: 'bg-status-atraso', cor: 'text-status-atraso', destaque: true },
  { rotulo: 'Atrasadas · zero', valor: '0', marca: 'bg-status-atraso/40', cor: 'text-muted-foreground' },
]

const logos = [
  {
    arquivo: '/brand/soufer-negativo.png',
    fundo: 'bg-[#1D1D1B]',
    texto:
      'Negativo — sidebar do sistema e painel escuro do login. É o logo do ambiente administrativo.',
  },
  {
    arquivo: '/brand/soufer-assinatura.png',
    fundo: 'bg-white',
    texto:
      'Positivo com assinatura — documentos, etiquetas grandes e materiais impressos sobre fundo claro.',
  },
  {
    arquivo: '/brand/soufer-industrial.png',
    fundo: 'bg-[#1D1D1B]',
    texto:
      'Industrial — exclusivo do quiosque de consulta pública, que precisa se anunciar como outra coisa.',
  },
  {
    arquivo: '/brand/soufer-branco.png',
    fundo: 'bg-status-em-uso',
    texto:
      'Monocromático branco — só quando a aplicação não permite a esfera vermelha (impressão de uma cor, fundo de foto).',
  },
]

const botoes = [
  { estado: 'Padrão', primaria: '', secundaria: '' },
  { estado: 'Hover', primaria: 'bg-brand-red-dark', secundaria: 'bg-muted' },
  { estado: 'Pressionado', primaria: 'bg-brand-red-dark translate-y-px', secundaria: 'bg-muted translate-y-px' },
  { estado: 'Foco (teclado)', primaria: 'ring-3 ring-foreground ring-offset-2', secundaria: 'ring-3 ring-foreground ring-offset-2' },
  { estado: 'Desabilitado', primaria: 'opacity-40', secundaria: 'opacity-40' },
]

export function DesignSystemPage() {
  const [foco, setFoco] = useState('')
  const [replay, setReplay] = useState(0)
  const [trocaStatus, setTrocaStatus] = useState<Status>('em-uso')

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-lg bg-[#1D1D1B] p-6 text-white/85">
        <p className="max-w-3xl text-corpo">
          Vermelho institucional é <strong className="text-white">ação primária e marca</strong>.
          Verde e âmbar não pertencem à identidade — são{' '}
          <strong className="text-white">sinalização operacional</strong>, restritos a badges,
          indicadores e KPIs. Status nunca é comunicado só por cor.
        </p>
      </div>

      <Secao titulo="Paleta institucional">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {paleta.map((cor) => (
            <div key={cor.nome} className="overflow-hidden rounded-lg border bg-card">
              <div className="h-20" style={{ backgroundColor: cor.hex }} />
              <div className="space-y-1 p-3">
                <p className="text-secao">{cor.nome}</p>
                <p className="font-mono text-sm text-muted-foreground">{cor.hex}</p>
                <p className="border-t pt-2 text-sm text-muted-foreground">{cor.uso}</p>
              </div>
            </div>
          ))}
        </div>
        <Card>
          <p className="text-corpo text-muted-foreground">
            Nunca use verde ou âmbar em botões, fundos de área grande ou elementos de marca.
            Nunca coloque vermelho de ação primária e vermelho de estado crítico competindo na
            mesma tela: se há uma ocorrência crítica visível, o botão primário daquela tela é
            preto.
          </p>
        </Card>
      </Secao>

      <Secao titulo="Tipografia">
        <Card className="grid gap-6 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-3">
            {tipografia.map((t) => (
              <p key={t.nome} className="font-mono text-sm text-muted-foreground">
                {t.nome} · {t.spec}
              </p>
            ))}
          </div>
          <div className="space-y-4">
            <p className="text-display">Registrar retirada</p>
            <p className="text-titulo">Devolução registrada</p>
            <p className="text-secao">Detalhes da retirada</p>
            <p className="text-corpo">Tamanho base. Nada de texto corrido abaixo de 14px.</p>
            <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">
              Setor de destino
            </p>
            <p className="font-mono text-titulo font-medium">SF000452 · 4412 · 23/08/2026</p>
            <p className="text-kpi">0123456789</p>
          </div>
        </Card>
      </Secao>

      <Secao titulo="Badges de status">
        <Card className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <StatusBadge status="disponivel" />
            <p className="text-sm text-muted-foreground">
              Círculo cheio + verde. Pronta para retirada.
            </p>
          </div>
          <div className="space-y-2">
            <StatusBadge status="em-uso" />
            <p className="text-sm text-muted-foreground">
              Círculo vazado + borda sólida. Está com alguém.
            </p>
          </div>
          <div className="space-y-2">
            <StatusBadge status="indisponivel" />
            <p className="text-sm text-muted-foreground">
              Quadrado + vermelho. Quebrada ou perdida.
            </p>
          </div>
          <div className="space-y-2">
            <StatusBadge status="atraso" dias={9} />
            <p className="text-sm text-muted-foreground">
              Triângulo + âmbar. Sempre com o número de dias.
            </p>
          </div>
        </Card>
      </Secao>

      <Secao titulo="Botões · todos os estados">
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {botoes.map((b) => (
              <div key={b.estado} className="space-y-2">
                <p className="text-sm text-muted-foreground">{b.estado}</p>
                <div
                  className={cn(
                    'flex h-(--control-h) w-full items-center justify-center rounded-lg bg-brand-red text-corpo font-medium text-white',
                    b.primaria,
                  )}
                >
                  Confirmar
                </div>
                <div
                  className={cn(
                    'flex h-(--control-h) w-full items-center justify-center rounded-lg border bg-background text-corpo font-medium',
                    b.secundaria,
                  )}
                >
                  Secundário
                </div>
              </div>
            ))}
          </div>
          <p className="text-corpo text-muted-foreground">
            Altura mínima de 56px em qualquer ação principal — o operador pode estar de luva.
            Botões de fluxo (retirada, devolução) sobem para 60px e ficam fixos no rodapé.
          </p>
        </Card>
      </Secao>

      <Secao titulo="Campos · todos os estados">
        <Card className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-2">
            <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Vazio</p>
            <input
              className="h-(--control-h) w-full rounded-lg border px-3 text-corpo outline-none"
              placeholder="Código ou nome"
              readOnly
            />
          </div>
          <div className="space-y-2">
            <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Foco</p>
            <input
              className="h-(--control-h) w-full rounded-lg border border-brand-red px-3 text-corpo ring-2 ring-brand-red/20 outline-none"
              placeholder="Código ou nome"
              value={foco}
              onChange={(e) => setFoco(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">
              Preenchido
            </p>
            <input
              className="h-(--control-h) w-full rounded-lg border px-3 text-corpo outline-none"
              value="SF000452"
              readOnly
            />
          </div>
          <div className="space-y-2">
            <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">
              Reconhecido
            </p>
            <div className="flex h-(--control-h) w-full items-center gap-2 rounded-lg border border-status-disponivel/40 bg-status-disponivel/5 px-3">
              <CheckCircle2Icon className="size-5 text-status-disponivel" />
              <span className="text-corpo">SF000452</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">Erro</p>
            <input
              className="h-(--control-h) w-full rounded-lg border border-destructive px-3 text-corpo outline-none"
              value="SF00045"
              readOnly
              aria-invalid
            />
            <p className="text-sm text-destructive">
              Código com 7 dígitos — o padrão tem 8.
            </p>
          </div>
        </Card>
      </Secao>

      <Secao titulo="KPI cards">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.rotulo}
              className={cn(
                'space-y-2 rounded-lg border bg-card p-4',
                kpi.destaque && 'border-status-atraso',
              )}
            >
              <p className="flex items-center gap-1.5 text-rotulo tracking-[0.08em] text-muted-foreground uppercase">
                <span aria-hidden className={cn('size-2 rounded-[1px]', kpi.marca)} />
                {kpi.rotulo}
              </p>
              <p className={cn('text-kpi', kpi.cor)}>{kpi.valor}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Movimento">
        <Card className="space-y-4">
          <p className="text-corpo text-muted-foreground">
            Animação só toca <code className="font-mono">transform</code> e{' '}
            <code className="font-mono">opacity</code> — as duas propriedades que o compositor
            resolve sem layout nem repaint, e por isso as únicas que seguram 60fps na máquina
            do almoxarifado. Nunca animar <code className="font-mono">width</code>,{' '}
            <code className="font-mono">height</code>, <code className="font-mono">top</code>,{' '}
            <code className="font-mono">left</code>, <code className="font-mono">margin</code> ou{' '}
            <code className="font-mono">box-shadow</code>: cada quadro vira reflow.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Estado', '140ms', 'hover, foco, pressionado'],
              ['Tela e modal', '240ms', 'nunca acima de 300ms'],
              ['Lista', 'stagger 20ms', 'só nos 6 primeiros'],
              ['Reduced motion', 'opacidade 80ms', 'sem translação'],
            ].map(([titulo, a, b]) => (
              <div key={titulo} className="space-y-1">
                <p className="text-secao">{titulo}</p>
                <p className="font-mono text-sm text-muted-foreground">{a}</p>
                <p className="font-mono text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
            <div className="space-y-1">
              <p className="text-secao">Easing</p>
              <p className="font-mono text-sm text-muted-foreground">
                cubic-bezier(.2, 0, 0, 1)
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                sai rápido, chega devagar
              </p>
            </div>
          </div>
        </Card>
      </Secao>

      <Secao titulo="Animações · demonstração">
        <Card className="space-y-4">
          <button
            type="button"
            onClick={() => setReplay((n) => n + 1)}
            className="h-(--control-h) rounded-lg border bg-background px-4 text-corpo font-medium transition-colors hover:bg-muted active:translate-y-px"
          >
            Repetir animações
          </button>

          <div key={replay} className="grid gap-6 lg:grid-cols-2">
            <Demo
              nome="Entrada de tela"
              classe="animate-entrada"
              nota="Fade + 8px de subida em 240ms. Toda página e todo card de conteúdo entram assim."
            >
              <div className="animate-entrada rounded-lg border bg-muted p-4 text-corpo">
                Detalhes da retirada
              </div>
            </Demo>

            <Demo
              nome="Lista escalonada"
              classe="lista-stagger"
              nota="20ms entre itens, só nos 6 primeiros — do 7º em diante entra sem animação, senão uma lista de 400 ferramentas vira cascata."
            >
              <ul className="lista-stagger space-y-1">
                {['SF000452', 'SF000453', 'SF000454', 'SF000455'].map((codigo) => (
                  <li
                    key={codigo}
                    className="rounded-md border px-3 py-2 font-mono text-corpo"
                  >
                    {codigo}
                  </li>
                ))}
              </ul>
            </Demo>

            <Demo
              nome="Código reconhecido"
              classe="animate-reconhecido"
              nota="Escala de 2,5% em 420ms quando o leitor acerta a ferramenta. Confirma sem tirar o foco do campo — o operador continua bipando."
            >
              <div className="animate-reconhecido flex h-(--control-h) items-center gap-2 rounded-lg border border-status-disponivel/40 bg-status-disponivel/5 px-3">
                <CheckCircle2Icon className="size-5 text-status-disponivel" />
                <span className="text-corpo">SF000452</span>
              </div>
            </Demo>

            <Demo
              nome="Código recusado"
              classe="animate-erro"
              nota="Nega o gesto em 260ms. O erro é comunicado pelo texto abaixo do campo, não por cor piscando."
            >
              <div className="space-y-1">
                <div className="animate-erro flex h-(--control-h) items-center rounded-lg border border-destructive px-3 font-mono text-corpo">
                  SF00045
                </div>
                <p className="text-sm text-destructive">
                  Código com 7 dígitos — o padrão tem 8.
                </p>
              </div>
            </Demo>

            <Demo
              nome="Indicador de atraso"
              classe="animate-atraso"
              nota="Único loop permitido no sistema, e só no KPI de atrasadas quando o número é maior que zero. Nenhum outro elemento pulsa."
            >
              <div className="w-fit space-y-2 rounded-lg border border-status-atraso p-4">
                <p className="flex items-center gap-1.5 text-rotulo tracking-[0.08em] text-muted-foreground uppercase">
                  <span aria-hidden className="animate-atraso size-2 rounded-[1px] bg-status-atraso" />
                  Atrasadas
                </p>
                <p className="text-kpi text-status-atraso">7</p>
              </div>
            </Demo>

            <Demo
              nome="Transição de estado"
              classe="transition-colors"
              nota="Todo utilitário transition-* do Tailwind já nasce em 140ms com o easing do sistema, via --default-transition-*. Não repetir duração em cada tela. Passe o mouse."
            >
              <div className="flex h-(--control-h) w-fit items-center rounded-lg bg-brand-red px-6 text-corpo font-medium text-white transition-colors hover:bg-brand-red-dark active:translate-y-px">
                Confirmar
              </div>
            </Demo>
          </div>

          <p className="text-corpo text-muted-foreground">
            Com <code className="font-mono">prefers-reduced-motion: reduce</code> tudo isso cai
            para 80ms de opacidade, sem translação, sem escala e sem loop — a regra está no
            próprio <code className="font-mono">index.css</code>, então vale para componente
            novo sem ninguém precisar lembrar.
          </p>
        </Card>
      </Secao>

      <Secao titulo="Movimento contínuo">
        <Card className="space-y-4">
          <p className="text-corpo text-muted-foreground">
            Estado em andamento respira; estado em repouso fica parado. A respiração é um halo
            que muda de <code className="font-mono">escala</code> e{' '}
            <code className="font-mono">opacidade</code> — nunca a cor em si, porque cor é
            repaint a cada quadro. E vale só em elemento singular: cabeçalho de detalhe, KPI,
            chip de filtro. <strong>Nunca dentro de linha de tabela</strong> — 400 linhas
            respirando são 400 camadas compostas por quadro, e aí os 60fps vão embora.
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            <Demo
              nome="Status vivo"
              classe="status-vivo"
              nota="Em uso e atraso são estados em andamento: o marcador respira em 3,2s. Disponível e indisponível são repouso e ficam estáticos."
            >
              <div className="flex flex-wrap gap-3">
                <StatusBadge status="em-uso" vivo />
                <StatusBadge status="atraso" dias={9} vivo />
                <StatusBadge status="disponivel" />
              </div>
            </Demo>

            <Demo
              nome="Troca de status"
              classe="transicao-status"
              nota="Quando a devolução entra, a ferramenta não salta de cor: atravessa em 240ms. É transição, acontece uma vez quando o dado muda — não é loop."
            >
              <div className="space-y-2">
                <StatusBadge status={trocaStatus} dias={9} />
                <button
                  type="button"
                  onClick={() =>
                    setTrocaStatus((atual) => (atual === 'em-uso' ? 'disponivel' : 'em-uso'))
                  }
                  className="h-(--control-h) w-full rounded-lg border bg-background px-4 text-corpo font-medium transition-colors hover:bg-muted active:translate-y-px"
                >
                  Registrar devolução
                </button>
              </div>
            </Demo>

            <Demo
              nome="Carregando"
              classe="brilho"
              nota="Faixa que varre a superfície por translação, no lugar do pulse de opacidade. Enquanto a lista de ferramentas não chega da API."
            >
              <div className="space-y-2">
                {['w-full', 'w-4/5', 'w-3/5'].map((largura) => (
                  <div
                    key={largura}
                    className={cn('brilho h-6 rounded-md bg-muted', largura)}
                  />
                ))}
              </div>
            </Demo>
          </div>

          <p className="text-corpo text-muted-foreground">
            Nada disso sobrevive ao <code className="font-mono">prefers-reduced-motion</code>: o
            halo e a varredura somem por completo, em vez de congelarem no meio do ciclo.
          </p>
        </Card>
      </Secao>

      <Secao titulo="Uso dos logos">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {logos.map((logo) => (
            <div key={logo.arquivo} className="overflow-hidden rounded-lg border bg-card">
              <div className={cn('flex h-28 items-center justify-center p-6', logo.fundo)}>
                <img src={logo.arquivo} alt="" className="max-h-full" />
              </div>
              <p className="p-3 text-sm text-muted-foreground">{logo.texto}</p>
            </div>
          ))}
        </div>
      </Secao>
    </div>
  )
}
