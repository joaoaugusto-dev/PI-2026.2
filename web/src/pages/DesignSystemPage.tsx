import { useState } from 'react'
import { CheckCircle2Icon } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
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
    arquivo: '/brand/soufer-negativo.svg',
    fundo: 'bg-[#1D1D1B]',
    texto: 'Negativo — sidebar do sistema e painel escuro do login. É o logo do ambiente administrativo.',
  },
  {
    arquivo: '/brand/soufer-assinatura.svg',
    fundo: 'bg-white',
    texto: 'Positivo com assinatura — documentos, etiquetas grandes e materiais impressos sobre fundo claro.',
  },
  {
    arquivo: '/brand/soufer-industrial.svg',
    fundo: 'bg-[#1D1D1B]',
    texto: 'Industrial — exclusivo do quiosque de consulta pública, que precisa se anunciar como outra coisa.',
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
        <Card className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Estado', '120–160ms', 'cubic-bezier(.2, 0, 0, 1)'],
            ['Tela e modal', '200–260ms', 'nunca acima de 300ms'],
            ['Lista', 'stagger 20ms', 'só nos 6 primeiros'],
            ['Reduced motion', 'opacidade 80ms', 'sem translação'],
          ].map(([titulo, a, b]) => (
            <div key={titulo} className="space-y-1">
              <p className="text-secao">{titulo}</p>
              <p className="font-mono text-sm text-muted-foreground">{a}</p>
              <p className="font-mono text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </Card>
      </Secao>

      <Secao titulo="Uso dos logos">
        <div className="grid gap-3 lg:grid-cols-3">
          {logos.map((logo) => (
            <div key={logo.arquivo} className="overflow-hidden rounded-lg border bg-card">
              <div className={cn('flex h-28 items-center justify-center p-6', logo.fundo)}>
                <img
                  src={logo.arquivo}
                  alt=""
                  className="max-h-full"
                  onError={(e) => {
                    e.currentTarget.replaceWith(
                      Object.assign(document.createElement('span'), {
                        className: 'font-mono text-sm text-neutral-500',
                        textContent: `${logo.arquivo} (pendente)`,
                      }),
                    )
                  }}
                />
              </div>
              <p className="p-3 text-sm text-muted-foreground">{logo.texto}</p>
            </div>
          ))}
        </div>
      </Secao>
    </div>
  )
}
