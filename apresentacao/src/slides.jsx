import { motion } from 'motion/react'
import {
  ArrowRight, IdCard, ScanBarcode, GitBranch, Server,
  Database, Container, Check, Lock, MonitorSmartphone, Globe, Activity, KeyRound,
} from 'lucide-react'
import { Entra, Codigo, Textura, Status, Barras, Avatar, Contagem, EASE } from './components.jsx'
import { BLOCOS } from './blocos.js'
import { RequisicoesAoVivo } from './RequisicoesAoVivo.jsx'
import { objeto } from './Destaque.jsx'
import { DiagramaBanco } from './DiagramaBanco.jsx'
import { Logo, GRUPOS_TEC } from './Tec.jsx'
import logoNegativo from './assets/logo-negativo.webp'
import icone from './assets/icone.webp'
import quadro from './assets/quadro.webp'
import visita from './assets/visita.webp'
import der from './assets/der.webp'
import retirada from './assets/retirada.webp'
import dashboard from './assets/dashboard.webp'
import mRetirada from './assets/m-retirada.webp'
import mDashboard from './assets/m-dashboard.webp'
import profMarcelo from './assets/prof-marcelo.webp'
import profMax from './assets/prof-max.webp'
import profNivaldo from './assets/prof-nivaldo.webp'
import profMarudi from './assets/prof-marudi.webp'

/* Regra de cada slide: um rótulo, uma frase e UM visual principal. O resto
   vai nas notas do controle, não na tela. Nada em loop nos diagramas. */

const g = (cols, gap = 32, extra) => ({ display: 'grid', gridTemplateColumns: cols, gap, ...extra })
const col = (gap = 16, extra) => ({ display: 'flex', flexDirection: 'column', gap, ...extra })
const row = (gap = 16, extra) => ({ display: 'flex', alignItems: 'center', gap, ...extra })

function Titulo({ rotulo, children, tamanho }) {
  return (
    <div style={col(14)}>
      <Entra className="rotulo vermelho">{rotulo}</Entra>
      <Entra as="h2" className="manchete" {...objeto('titulo', 'Título')} style={tamanho ? { fontSize: tamanho } : undefined}>{children}</Entra>
    </div>
  )
}

function Kpi({ rotulo, valor, cor, grande }) {
  return (
    <Entra className="cartao" {...objeto('kpi', rotulo)} style={{ padding: '22px 28px', flex: grande ? 1 : undefined, ...col(grande ? 14 : 8, grande ? { justifyContent: 'center' } : undefined) }}>
      <span className="rotulo" style={{ fontSize: grande ? 17 : 14 }}>{rotulo}</span>
      <span className="num" style={{ fontSize: grande ? 104 : 68, fontWeight: 650, lineHeight: 1, letterSpacing: '-.02em', color: cor }}><Contagem para={valor} /></span>
    </Entra>
  )
}

const silencioso = { fontSize: 20, color: 'var(--gray)', lineHeight: 1.45 }

/* Ícone da marca: entra de fora do quadro, já em movimento, e depois deriva
   devagar (slide parado nunca fica morto). `de` = lado de onde chega. */
function Icone({ style, de = 1, opacidade = 0.95 }) {
  return (
    <div className="deriva" aria-hidden="true" style={{ position: 'absolute', ...style }}>
      <motion.img src={icone} alt="" initial={{ x: de * 240, scale: 1.12 }} animate={{ x: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: EASE }} style={{ width: '100%', opacity: opacidade }} />
    </div>
  )
}

/* ============================== KAUAN ============================== */

function Capa() {
  return (
    <div className="camada escuro">
      <Textura opacidade={0.6} />
      <Icone style={{ left: 410, top: 14, width: 1100 }} opacidade={0.07} />
      <div style={{ position: 'absolute', inset: 0, ...col(48, { alignItems: 'center', justifyContent: 'center', textAlign: 'center' }) }}>
        <Entra className="rotulo" style={{ color: 'var(--red)' }}>Projeto Integrador 2026.2 · UNIFEOB</Entra>
        <Entra><img src={logoNegativo} alt="SOUFER Tools" {...objeto('imagem', 'Logo')} style={{ width: 820 }} /></Entra>
        <Entra as="h1" className="manchete" {...objeto('titulo', 'Título')} style={{ fontSize: 60, color: '#fff', maxWidth: 1240 }}>
          Controle de retirada e devolução de <em>ferramentas</em> da manutenção
        </Entra>
      </div>
    </div>
  )
}

/* cartão de pessoa: mesma foto, mesmo tamanho, tudo centralizado */
function CartaPessoa({ foto, nome, destaque, detalhe }) {
  return (
    <Entra {...objeto('grupo', nome)} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '44px 28px', ...col(16, { alignItems: 'center', textAlign: 'center' }) }}>
      <img src={foto} alt={nome} style={{ width: 252, height: 252, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--red)', marginBottom: 12 }} />
      <div style={{ fontSize: 34, fontWeight: 650, lineHeight: 1.15, minHeight: 78, display: 'grid', alignItems: 'center', textWrap: 'balance' }}>{nome}</div>
      <div style={{ fontSize: 24, color: 'rgba(255,255,255,.72)', lineHeight: 1.3, minHeight: 64, textWrap: 'balance' }}>{destaque}</div>
      {detalhe && <div className="mono" style={{ fontSize: 18, color: 'rgba(255,255,255,.5)' }}>{detalhe}</div>}
    </Entra>
  )
}

function SlideDePessoas({ rotulo, titulo, cartas }) {
  return (
    <div className="camada escuro">
      <Textura opacidade={0.45} />
      <div style={{ position: 'absolute', inset: '96px 140px 110px', ...col(56) }}>
        <Titulo rotulo={rotulo}>{titulo}</Titulo>
        <div style={g('repeat(4, 1fr)', 32, { flex: 1, minHeight: 0, alignContent: 'center' })}>{cartas}</div>
      </div>
    </div>
  )
}

const EQUIPE = {
  intro: ['Front-end e documentação', '25000795 · kauanleandrini'],
  infra: ['Back-end e infraestrutura', '25000151 · TGuiDev'],
  back: ['Back-end e banco de dados', '25001176 · henrique-molinari'],
  front: ['Front-end · líder da equipe', '25000019 · joaoaugusto-dev'],
}
const NOMES_COMPLETOS = {
  intro: 'Kauan Leander Leandrini', infra: 'Guilherme Portilho da Rosa Santi',
  back: 'Henrique de Oliveira Molinari', front: 'João Augusto de Freitas',
}

function Equipe() {
  return (
    <SlideDePessoas rotulo="Quem construiu" titulo={<>A <em>equipe</em> do SOUFER Tools.</>}
      cartas={[...BLOCOS].sort((a, b) => NOMES_COMPLETOS[a.id].localeCompare(NOMES_COMPLETOS[b.id], 'pt-BR')).map((b) => <CartaPessoa key={b.id} foto={b.foto} nome={NOMES_COMPLETOS[b.id]} destaque={EQUIPE[b.id][0]} detalhe={`RA ${EQUIPE[b.id][1].split(' · ')[0]}`} />)} />
  )
}

export const PROFESSORES = [
  { nome: 'Marcelo Ciacco de Almeida', materia: 'Desenvolvimento de Interfaces Web', foto: profMarcelo },
  { nome: 'Max Streicher Vallim', materia: 'Integração de Dados', foto: profMax },
  { nome: 'Nivaldo de Andrade', materia: 'Tecnologias para Desenvolvimento Web', foto: profNivaldo },
  { nome: 'Rodrigo Marudi de Oliveira', materia: 'Computação em Nuvem', foto: profMarudi },
]

function Professores() {
  return (
    <SlideDePessoas rotulo="Quem orientou" titulo={<>Os <em>professores</em> do semestre.</>}
      cartas={PROFESSORES.map((p) => <CartaPessoa key={p.nome} foto={p.foto} nome={`Prof. ${p.nome}`} destaque={p.materia} />)} />
  )
}

function Tecnologias() {
  return (
    <div className="camada escuro">
      <Textura opacidade={0.45} />
      <div style={{ position: 'absolute', inset: '96px 140px 110px', ...col(48) }}>
        <Titulo rotulo="Stack">Tudo o que <em>usamos</em>.</Titulo>
        <div style={g('repeat(5, 1fr)', 24, { flex: 1, minHeight: 0, alignContent: 'center' })}>
          {GRUPOS_TEC.map(([grupo, itens]) => (
            <Entra key={grupo} {...objeto('grupo', grupo)} style={col(14)}>
              <div style={{ fontSize: 24, fontWeight: 650, color: 'var(--red)', paddingBottom: 6 }}>{grupo}</div>
              {itens.map((t) => (
                <div key={t} style={{ background: '#fff', color: 'var(--ink)', borderRadius: 16, height: 96, padding: '0 20px', ...row(16) }}>
                  <Logo nome={t} tamanho={46} />
                  <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{t}</span>
                </div>
              ))}
            </Entra>
          ))}
        </div>
      </div>
    </div>
  )
}

const TOPICOS = {
  intro: ['O problema', 'A solução', 'Gestão e documentação'],
  infra: ['Banco de dados', 'Ambiente atual', 'Plano AWS e custos'],
  back: ['API REST', 'Requisições ao vivo', 'Segurança'],
  front: ['Design system', 'React', 'Demonstração ao vivo'],
}

function Agenda() {
  return (
    <div className="camada escuro">
      <Textura opacidade={0.45} />
      <div style={{ position: 'absolute', inset: '96px 140px 110px', ...col(56) }}>
        <Titulo rotulo="Roteiro">O que vamos <em>mostrar</em> hoje.</Titulo>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, ...col(36, { justifyContent: 'center' }) }}>
          {/* linha do tempo: um marco por apresentador */}
          <div style={{ position: 'relative', ...g('repeat(4, 1fr)', 32) }}>
            <Entra style={{ position: 'absolute', left: 28, right: 28, top: 27, height: 2, background: 'rgba(255,255,255,.25)' }} />
            {BLOCOS.map((b, i) => (
              <Entra key={b.id} {...objeto('grupo', b.nome)} style={col(24)}>
                <div style={row(16)}>
                  <span className="mono num" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700, flex: 'none', position: 'relative' }}>{i + 1}</span>
                  <span className="mono num" style={{ fontSize: 22, color: 'rgba(255,255,255,.7)', background: 'var(--ink)', padding: '0 12px', position: 'relative' }}>{b.tempo} min</span>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: '36px 30px', ...col(24) }}>
                  <div style={{ fontSize: 38, fontWeight: 650, lineHeight: 1.1 }}>{b.nome}</div>
                  <div style={row(14)}>
                    <Avatar pessoa={b} tamanho={56} />
                    <span style={{ fontSize: 21, fontWeight: 500, lineHeight: 1.2 }}>{b.pessoa}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,.12)' }} />
                  <div style={col(18, { flex: 1 })}>
                    {TOPICOS[b.id].map((t) => <div key={t} style={row(12, { fontSize: 26, color: 'rgba(255,255,255,.85)' })}><ArrowRight size={20} color="var(--red)" style={{ flex: 'none' }} />{t}</div>)}
                  </div>
                </div>
              </Entra>
            ))}
          </div>
          <Entra style={row(14, { justifyContent: 'center', fontSize: 24, color: 'rgba(255,255,255,.75)' })}>
            <ScanBarcode size={28} color="var(--red)" />Cerca de 19 minutos, com demonstração ao vivo usando o leitor de código de barras
          </Entra>
        </div>
      </div>
    </div>
  )
}

function Pino({ n, x, y, texto, lado = 'dir' }) {
  return (
    // posição no wrapper: o motion da Entra é dono do transform do filho
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(${lado === 'dir' ? '-22px' : 'calc(-100% + 22px)'}, -50%)` }}>
      <Entra style={{ ...row(12), flexDirection: lado === 'dir' ? 'row' : 'row-reverse' }}>
        <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20, flex: 'none' }}>{n}</span>
        <span style={{ background: 'var(--ink)', color: '#fff', fontSize: 20, fontWeight: 500, padding: '10px 16px', borderRadius: 10, whiteSpace: 'nowrap' }}>{texto}</span>
      </Entra>
    </div>
  )
}

function Problema() {
  const achados = [['Etiqueta adesiva', 'não resiste ao uso na manutenção'], ['Atividade', 'é opcional na retirada'], ['Balcão', 'tem fila: o registro precisa ser rápido']]
  return (
    <div className="pagina">
      <Titulo rotulo="O problema">Hoje, o controle é um <em>quadro branco</em>.</Titulo>
      <div style={g('1fr 480px', 40, { flex: 1, minHeight: 0 })}>
        <div style={col(24, { minHeight: 0 })}>
          <Entra {...objeto('imagem', 'Quadro branco')} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '952 / 538', flex: 'none' }}>
            <img src={quadro} alt="Quadro branco de controle de saída de ferramentas na manutenção da Soufer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <motion.div variants={{ visivel: { transition: { staggerChildren: 0.25, delayChildren: 0.5 } } }} style={{ position: 'absolute', inset: 0 }}>
              <Pino n={1} x={30} y={46} texto="Nome à mão, apagado depois" />
              <Pino n={2} x={86} y={62} texto="Atraso só se alguém olhar" lado="esq" />
              <Pino n={3} x={10} y={86} texto="Nenhum histórico" />
            </motion.div>
          </Entra>
          <Entra className="cartao" {...objeto('lista', 'O que a visita mostrou')} style={{ flex: 1, padding: '0 28px', ...g('repeat(3, 1fr)', 28, { alignItems: 'center' }) }}>
            {achados.map(([t, d]) => (
              <div key={t} style={col(4)}>
                <div style={{ fontSize: 24, fontWeight: 650, color: 'var(--red)' }}>{t}</div>
                <div style={{ fontSize: 19, color: 'var(--gray)', lineHeight: 1.3 }}>{d}</div>
              </div>
            ))}
          </Entra>
        </div>
        <Entra className="cartao" {...objeto('imagem', 'Visita técnica')} style={{ overflow: 'hidden', ...col(0) }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <img src={visita} alt="Equipe na visita técnica ao balcão da manutenção da Soufer" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 34%' }} />
          </div>
          <div style={{ padding: '18px 24px', ...col(4) }}>
            <div style={{ fontSize: 24, fontWeight: 600 }}>Visita técnica à Soufer</div>
            <div style={{ fontSize: 19, color: 'var(--gray)' }}>Balcão da manutenção · outubro de 2026</div>
          </div>
        </Entra>
      </div>
    </div>
  )
}

function Solucao() {
  const passo = (conteudo, titulo, texto) => (
    <Entra className="cartao" {...objeto('grupo', titulo)} style={{ padding: 36, ...col(28), justifyContent: 'space-between' }}>
      <div style={{ flex: 1, minHeight: 150, display: 'grid', placeItems: 'center' }}>{conteudo}</div>
      <div style={col(8, { alignItems: 'center', textAlign: 'center' })}>
        <div style={{ fontSize: 28, fontWeight: 600 }}>{titulo}</div>
        <div style={{ fontSize: 20, color: 'var(--gray)', lineHeight: 1.4 }}>{texto}</div>
      </div>
    </Entra>
  )
  const seta = <Entra style={{ display: 'grid', placeItems: 'center' }}><ArrowRight size={36} color="var(--gray-2)" /></Entra>
  return (
    <div className="pagina">
      <Titulo rotulo="A solução">Bipa a ferramenta, bipa o crachá, <em>Enter</em>.</Titulo>
      <div style={g('1fr 64px 1fr 64px 1fr', 0, { flex: 1 })}>
        {passo(<Barras texto="000094" largura={340} altura={120} />, 'Ferramenta', 'O leitor físico lê a etiqueta.')}
        {seta}
        {passo(<div style={row(18)}><IdCard size={120} strokeWidth={1.4} /><span className="mono" style={{ fontSize: 52, fontWeight: 600 }}>9803</span></div>, 'Colaborador', 'Matrícula, crachá ou nome.')}
        {seta}
        {passo(<span className="btn btn-red" style={{ height: 80, fontSize: 27 }}>Confirmar retirada</span>, 'Registro', 'Quem registrou vem do login.')}
      </div>
      <Entra {...objeto('lista', 'Perfis e ODS')} style={row(14, { flexWrap: 'wrap' })}>
        <span className="rotulo" style={{ marginRight: 4 }}>Perfis</span>
        {['Manutenção', 'Admin', 'Consulta'].map((t) => <span key={t} className="chip">{t}</span>)}
        <span style={{ flex: 1 }} />
        <span className="rotulo" style={{ marginRight: 4 }}>Soufer · ODS</span>
        <span className="chip"><b className="mono" style={{ color: 'var(--red)' }}>9</b> Indústria e inovação</span>
        <span className="chip"><b className="mono" style={{ color: 'var(--red)' }}>12</b> Consumo responsável</span>
      </Entra>
    </div>
  )
}

const ENTREGAS = ['18/08', '25/08', '01/09', '08/09', '15/09', '22/09', '29/09', '06/10', '20/10', '27/10', '03/11', '10/11']

function Documentacao() {
  return (
    <div className="pagina">
      <Titulo rotulo="Gestão e documentação">Doze sprints, tudo registrado <em>no GitHub</em>.</Titulo>
      <div style={col(28, { flex: 1, minHeight: 0 })}>
      <div style={g('repeat(4, 1fr)', 22, { flex: 1, minHeight: 0 })}>
        <Kpi grande rotulo="Commits" valor="861" />
        <Kpi grande rotulo="Pull requests" valor="126" />
        <Kpi grande rotulo="Issues" valor="97" />
        <Kpi grande rotulo="Testes automatizados" valor="509" cor="var(--ok)" />
      </div>
      <Entra className="cartao" {...objeto('grafico', 'Entregas do Dia Maker')} style={{ padding: '30px 34px', ...col(30) }}>
        <div style={row(12, { justifyContent: 'space-between' })}>
          <span style={{ fontSize: 28, fontWeight: 650 }}>12 entregas do Dia Maker</span>
          <span className="rotulo">GitHub Projects · uma issue por card</span>
        </div>
        {/* linha do tempo: um marco por entrega */}
        <div style={{ position: 'relative', ...g(`repeat(${ENTREGAS.length}, 1fr)`, 0) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 19, height: 2, background: 'var(--ok)' }} />
          {ENTREGAS.map((d) => (
            <div key={d} style={col(12, { alignItems: 'center', position: 'relative' })}>
              <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ok)', color: '#fff', display: 'grid', placeItems: 'center' }}><Check size={22} strokeWidth={3} /></span>
              <span className="mono num" style={{ fontSize: 19, color: 'var(--gray)' }}>{d}</span>
            </div>
          ))}
        </div>
      </Entra>
      <Entra {...objeto('lista', 'Documentação')} style={row(12, { flexWrap: 'wrap' })}>
        {['README', 'Swagger /v1/docs', 'Coleções Insomnia', 'Dicionário de dados', 'CONTRIBUTING'].map((t) => <span key={t} className="chip" style={{ height: 52, fontSize: 21, padding: '0 24px' }}>{t}</span>)}
      </Entra>
      </div>
    </div>
  )
}

/* ============================ GUILHERME ============================ */

function Banco() {
  return (
    <div className="pagina">
      <Titulo rotulo="Banco de dados · PostgreSQL">A regra crítica é garantida <em>pelo banco</em>.</Titulo>
      <div style={g('1fr 590px', 36, { flex: 1, minHeight: 0 })}>
        <Entra className="cartao" {...objeto('diagrama', 'Diagrama do banco')} style={{ minHeight: 0, overflow: 'hidden', padding: 24 }}>
          <DiagramaBanco />
        </Entra>
        <div style={col(24, { justifyContent: 'space-between', minHeight: 0 })}>
          <Entra>
            <Codigo arquivo="0001_init.sql" lang="sql" tamanho={18} marcar={[2, 3, 4]} codigo={`
-- 1 empréstimo aberto por ferramenta
CREATE UNIQUE INDEX uq_emprestimo_aberto
  ON emprestimos (ferramenta_id)
  WHERE data_devolucao IS NULL;`} />
          </Entra>
          <Entra className="cartao" {...objeto('lista', 'Banco em números')} style={{ padding: '26px 30px', ...col(30, { flex: 1, justifyContent: 'center' }) }}>
            {['14 tabelas e 15 migrations versionadas', 'Trigger abre ocorrência na avaria', 'Feriados da BrasilAPI, com cache'].map((t) => (
              <div key={t} style={row(16, { fontSize: 26 })}><Check size={28} color="var(--ok)" strokeWidth={3} style={{ flex: 'none' }} />{t}</div>
            ))}
          </Entra>
        </div>
      </div>
    </div>
  )
}

function Servico({ I, nome, det }) {
  return (
    <div style={{ background: '#262624', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '34px 22px', ...row(16), position: 'relative', minWidth: 0 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--ok)', position: 'absolute', right: 12, top: 12 }} />
      <I size={32} color="#fff" style={{ flex: 'none' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 25, fontWeight: 600, color: '#fff' }}>{nome}</div>
        <div className="mono" style={{ fontSize: 17, color: 'rgba(255,255,255,.55)' }}>{det}</div>
      </div>
    </div>
  )
}

function Producao() {
  const conector = <div style={{ height: 2, background: 'rgba(255,255,255,.2)' }} />
  const faixa = (amb, ramo, banco) => (
    <div style={col(14)}>
      <div style={row(10, { fontSize: 20, color: 'rgba(255,255,255,.6)' })}><GitBranch size={20} />{amb} · <b className="mono" style={{ color: '#fff' }}>{ramo}</b></div>
      <div style={{ ...g('1fr 28px 1fr 28px 1fr', 0, { alignItems: 'center' }) }}>
        <Servico I={MonitorSmartphone} nome="APP" det="React" />{conector}
        <Servico I={Server} nome="API" det="Express" />{conector}
        <Servico I={Database} nome="PostgreSQL" det={banco} />
      </div>
    </div>
  )
  const chipEscuro = { background: '#262624', color: '#fff', borderColor: 'rgba(255,255,255,.12)' }
  return (
    <div className="pagina">
      <Titulo rotulo="Nuvem · ambiente atual">No ar em <em>servidor próprio</em>.</Titulo>
      <div style={g('1fr 400px', 32, { flex: 1, minHeight: 0 })}>
        <Entra {...objeto('diagrama', 'Dokploy')} style={{ background: 'var(--ink)', borderRadius: 18, padding: 34, ...col(26) }}>
          <div style={row(16)}>
            <span className="chip" style={chipEscuro}><GitBranch size={20} />GitHub</span>
            <ArrowRight size={22} color="rgba(255,255,255,.4)" />
            <span className="chip" style={chipEscuro}><Container size={20} />Nixpacks</span>
            <ArrowRight size={22} color="rgba(255,255,255,.4)" />
            <span className="chip" style={{ ...chipEscuro, background: 'var(--red)', borderColor: 'var(--red)' }}><Server size={20} />Dokploy · servidor próprio</span>
            <span style={{ flex: 1 }} />
            <span className="rotulo" style={{ color: 'rgba(255,255,255,.6)' }}>deploy a cada push</span>
          </div>
          <div style={{ border: '1px dashed rgba(255,255,255,.25)', borderRadius: 14, padding: '24px 24px 28px', ...col(8, { justifyContent: 'space-evenly' }), flex: 1 }}>
            <div style={row(12, { fontSize: 22, color: '#fff', fontWeight: 600 })}><Lock size={22} color="var(--red)" />Traefik · HTTPS por domínio</div>
            {faixa('Produção', 'main', 'soufer_prod')}
            {faixa('Desenvolvimento', 'development', 'soufer_dev')}
          </div>
        </Entra>
        <div style={col(18)}>
          <Kpi rotulo="Serviços no ar" valor="6" />
          <Kpi rotulo="Deploys em uma semana" valor="39" />
          <Entra className="cartao" {...objeto('lista', 'Por que servidor próprio')} style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)', color: '#fff', padding: '28px 30px', ...col(14, { justifyContent: 'center' }) }}>
            <span className="rotulo" style={{ color: 'rgba(255,255,255,.8)' }}>O que sustenta</span>
            <span style={{ fontSize: 24, lineHeight: 1.4, fontWeight: 500 }}>Os mesmos conceitos de Linux, contêineres e proxy reverso, com deploy automático a cada push.</span>
          </Entra>
        </div>
      </div>
    </div>
  )
}

const CUSTOS = [['AWS', 29.51], ['Google Cloud', 32.52], ['Azure', 36.51]]
const MODELOS = {
  IaaS: { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' },
  PaaS: { background: 'var(--paper)', color: 'var(--ink)', borderColor: 'var(--ink)' },
  SaaS: { background: 'var(--mist)', color: 'var(--gray)', borderColor: 'var(--line)' },
}

function PlanoAws() {
  return (
    <div className="pagina">
      <Titulo rotulo="Nuvem · plano de implantação">Na AWS, pelo <em>menor custo</em> dos três.</Titulo>
      <div style={g('1fr 1fr', 40, { flex: 1, minHeight: 0 })}>
        <div {...objeto('grupo', 'Serviços AWS')} style={col(16, { minHeight: 0 })}>
          {[
            [Server, 'EC2 t3.micro', 'API com PM2 e Nginx', 'IaaS'],
            [Database, 'RDS PostgreSQL', 'Banco gerenciado', 'PaaS'],
            [Globe, 'S3 + CloudFront', 'Bucket do front com CDN e HTTPS', 'PaaS'],
            [KeyRound, 'Secrets Manager', 'Segredos: JWT e senha do banco', 'PaaS'],
            [Activity, 'CloudWatch', 'Logs e alarmes', 'SaaS'],
          ].map(([I, sv, d, m]) => (
            <Entra key={sv} className="cartao" style={{ flex: 1, padding: '0 28px', ...row(22) }}>
              <span style={{ width: 60, height: 60, borderRadius: 14, background: 'var(--mist)', display: 'grid', placeItems: 'center', flex: 'none' }}><I size={30} /></span>
              <div style={col(4, { flex: 1 })}><div style={{ fontSize: 28, fontWeight: 650 }}>{sv}</div><div style={{ fontSize: 21, color: 'var(--gray)' }}>{d}</div></div>
              <span className="mono" style={{ fontSize: 19, fontWeight: 600, padding: '8px 16px', borderRadius: 8, border: '1px solid', ...MODELOS[m] }}>{m}</span>
            </Entra>
          ))}
        </div>
        <Entra className="cartao" {...objeto('grafico', 'Custos')} style={{ padding: '34px 36px', ...col(26, { justifyContent: 'space-between' }) }}>
          <div style={row(12, { justifyContent: 'space-between' })}>
            <span style={{ fontSize: 28, fontWeight: 650 }}>Custo por mês</span>
            <span className="rotulo">Dólar · estimativa</span>
          </div>
          <div style={col(26)}>
            {CUSTOS.map(([pv, usd], i) => (
              <div key={pv} style={col(10)}>
                <div style={row(10, { justifyContent: 'space-between', fontSize: 25 })}>
                  <span style={{ fontWeight: i === 0 ? 650 : 500 }}>{pv}</span>
                  <b className="num" style={{ color: i === 0 ? 'var(--red)' : undefined }}>US$ {usd.toFixed(2).replace('.', ',')}</b>
                </div>
                <div style={{ height: 52, background: 'var(--mist)', borderRadius: 8, overflow: 'hidden' }}>
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: usd / 40 }} transition={{ duration: 0.8, delay: i === 0 ? 1.3 : 0.45 + i * 0.15, ease: EASE }}
                    style={{ height: '100%', transformOrigin: 'left', background: i === 0 ? 'var(--red)' : 'var(--gray-2)', borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...g('1fr 1fr', 0), borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            <div style={col(4)}><span className="rotulo">AWS por ano</span><b className="num" style={{ fontSize: 40, color: 'var(--red)' }}>R$ 1.947,66</b></div>
            <div style={col(4)}><span className="rotulo">Contra a Azure</span><b className="num" style={{ fontSize: 40 }}>19% a menos</b></div>
          </div>
        </Entra>
      </div>
    </div>
  )
}

/* ============================= HENRIQUE ============================ */

function Api() {
  const etapas = ['rate limit', 'authenticate', 'authorize', 'validate (Zod)', 'service', 'PostgreSQL']
  return (
    <div className="pagina">
      <Titulo rotulo="Back-end · API REST /v1">Toda requisição passa pela <em>mesma esteira</em>.</Titulo>
      <Entra {...objeto('diagrama', 'Esteira da API')} style={{ ...row(0), background: 'var(--ink)', borderRadius: 16, padding: '28px 32px', justifyContent: 'space-between' }}>
        {etapas.map((e, i) => (
          <div key={e} style={row(0)}>
            <span className="mono" style={{ color: '#fff', background: i === etapas.length - 1 ? 'var(--red)' : '#262624', fontSize: 20, fontWeight: 600, padding: '14px 18px', borderRadius: 10, whiteSpace: 'nowrap' }}>{e}</span>
            {i < etapas.length - 1 && <ArrowRight size={24} color="rgba(255,255,255,.35)" style={{ margin: '0 14px' }} />}
          </div>
        ))}
      </Entra>
      <div style={g('1fr 1fr 260px', 28, { flex: 1, minHeight: 0 })}>
        <Entra style={col(0)}>
          <Codigo preencher arquivo="200 · sucesso" lang="json" tamanho={19} codigo={`
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 93
  }
}`} />
        </Entra>
        <Entra style={col(0)}>
          <Codigo preencher arquivo="409 · erro" lang="json" tamanho={19} codigo={`
{
  "error": {
    "code": "FERRAMENTA_INDISPONIVEL",
    "message": "...",
    "details": []
  }
}`} />
        </Entra>
        <div style={col(18)}>
          <Kpi grande rotulo="Recursos em /v1" valor="18" />
          <Kpi grande rotulo="Testes da API" valor="437" cor="var(--ok)" />
        </div>
      </div>
    </div>
  )
}

function AoVivo() {
  return (
    <div className="pagina">
      <Titulo rotulo="Back-end · requisições">O servidor responde, ou <em>explica por que não</em>.</Titulo>
      <Entra style={{ flex: 1, minHeight: 0 }}><RequisicoesAoVivo /></Entra>
    </div>
  )
}

function Seguranca() {
  const bloco = (titulo, nota, codigo) => (
    <Entra style={col(16, { minHeight: 0 })}>
      <div style={{ fontSize: 26, fontWeight: 650 }}>{titulo}</div>
      {codigo}
      <div style={{ fontSize: 21, color: 'var(--gray)', lineHeight: 1.4 }}>{nota}</div>
    </Entra>
  )
  return (
    <div className="pagina">
      <Titulo rotulo="Back-end · segurança">Quem registra vem do <em>token</em>, nunca do formulário.</Titulo>
      <div style={g('1fr 1fr', 28, { flex: 1, minHeight: 0 })}>
        {bloco('1 · A rota exige token, perfil e corpo válido', 'A ordem importa: autentica, autoriza e só então valida.',
          <Codigo preencher arquivo="emprestimoRoutes.ts" tamanho={18} marcar={[2, 3, 4]} codigo={`
router.post('/',
  authenticate,
  authorize('manutencao', 'admin'),
  validate({ body: criarEmprestimoSchema }),
  EmprestimoController.criar);`} />)}
        {bloco('2 · A regra crítica vira erro legível', 'O erro 23505 do banco se transforma em 409 com código.',
          <Codigo preencher arquivo="emprestimoService.ts" tamanho={18} marcar={[1, 2]} codigo={`
if (error.code === '23505' &&
    error.constraint === 'uq_emprestimo_aberto')
  throw new ConflictError(
    'A ferramenta já possui um empréstimo em aberto',
    'FERRAMENTA_INDISPONIVEL');`} />)}
      </div>
      <Entra {...objeto('lista', 'Regras de segurança')} style={row(14, { flexWrap: 'wrap' })}>
        {['JWT separado por perfil', 'Responsável sempre do token', 'Rate limit no quiosque', 'Senha com bcrypt'].map((t) => (
          <span key={t} className="chip" style={{ height: 52, fontSize: 21, padding: '0 22px' }}><Check size={20} color="var(--ok)" strokeWidth={3} />{t}</span>
        ))}
      </Entra>
    </div>
  )
}

/* =============================== JOÃO ============================== */

function DesignSystem() {
  const cores = [['#E30613', 'Red'], ['#B5121B', 'Red dark'], ['#1D1D1B', 'Black'], ['#575756', 'Gray'], ['#D9D9D9', 'Gray light']]
  return (
    <div className="pagina">
      <Titulo rotulo="Front-end · design system">Feito para o <em>chão de fábrica</em>.</Titulo>
      <div style={g('1fr 1fr', 40, { flex: 1, minHeight: 0 })}>
        <div style={col(34, { justifyContent: 'space-between' })}>
          <Entra {...objeto('grupo', 'Paleta')} style={g('repeat(5, 1fr)', 12)}>
            {cores.map(([h, n]) => (
              <div key={h} className="cartao" style={{ overflow: 'hidden' }}>
                <div style={{ height: 150, background: h }} />
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{n}</div>
                  <div className="mono" style={{ fontSize: 16, color: 'var(--gray)' }}>{h}</div>
                </div>
              </div>
            ))}
          </Entra>
          <Entra {...objeto('lista', 'Status')} style={col(14)}>
            <span className="rotulo">Status: forma e cor, nunca só cor</span>
            <div style={row(12, { flexWrap: 'wrap' })}>
              <Status s="disp" /><Status s="uso" /><Status s="ind" /><Status s="atr" texto="Atrasado 9 dias" />
            </div>
          </Entra>
          <Entra {...objeto('grupo', 'Botão de 60 px')} style={col(14)}>
            <span className="rotulo">Botões de 60 px: o operador pode estar de luva</span>
            <div style={row(14)}>
              <span className="btn btn-red" style={{ height: 60 }}>Confirmar retirada</span>
              <span aria-hidden="true" style={{ height: 60, width: 12, borderRight: '2px solid var(--ink)', borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)' }} />
              <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>60 px</span>
            </div>
          </Entra>
        </div>
        <Entra style={{ alignSelf: 'center' }}>
          <Codigo arquivo="StatusBadge.tsx" tamanho={19} marcar={[3, 7, 11, 15]} codigo={`
const estados = {
  disponivel: {
    marca: 'rounded-full bg-current',
  },
  'em-uso': {
    label: 'Em uso',
    marca: 'rounded-full border-2',
  },
  indisponivel: {
    label: 'Indisponível',
    marca: 'rounded-[1px] bg-current',
  },
  atraso: {
    label: 'Atrasado',
    marca: '[clip-path:polygon(...)]',
  },
}`} />
        </Entra>
      </div>
    </div>
  )
}

function Celular({ src, alt }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: 9, background: 'var(--ink)', borderRadius: 32, boxShadow: '0 24px 48px -28px rgba(0,0,0,.4)' }}>
      <img src={src} alt={alt} style={{ borderRadius: 24, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
    </div>
  )
}

function React19() {
  const destaques = [
    [ScanBarcode, 'Bipa, bipa, Enter', 'O leitor funciona como teclado.'],
    [Database, 'Dados reais da API', 'TanStack Query + Axios, sem mock.'],
    [Check, 'Formulários validados', 'React Hook Form + Zod.'],
  ]
  return (
    <div className="pagina">
      <Titulo rotulo="Front-end · React 19">Componentes <em>reutilizáveis</em>, do balcão ao celular.</Titulo>
      <div style={col(28, { flex: 1, minHeight: 0 })}>
        {/* mesma altura, bordas alinhadas: 1280x800 e duas telas 360x740 ocupam a largura toda */}
        <div style={row(28, { flex: 1, minHeight: 0, alignItems: 'stretch', justifyContent: 'space-between' })}>
          <Entra {...objeto('imagem', 'Tela no computador')} style={{ height: '100%', aspectRatio: '1280 / 800', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: '0 24px 48px -28px rgba(0,0,0,.35)' }}>
            <img src={retirada} alt="Tela de registrar retirada no desktop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Entra>
          <Entra {...objeto('celular', 'Celular: retirada')} style={{ height: '100%', aspectRatio: '378 / 758' }}><Celular src={mRetirada} alt="Tela de retirada em 360 px" /></Entra>
          <Entra {...objeto('celular', 'Celular: dashboard')} style={{ height: '100%', aspectRatio: '378 / 758' }}><Celular src={mDashboard} alt="Dashboard em 360 px" /></Entra>
        </div>
        <div {...objeto('lista', 'Destaques do front')} style={g('repeat(3, 1fr)', 28)}>
          {destaques.map(([I, t, d]) => (
            <Entra key={t} className="cartao" style={{ padding: '0 24px', height: 112, ...row(18) }}>
              <span style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}><I size={28} /></span>
              <div style={col(2)}><div style={{ fontSize: 25, fontWeight: 650 }}>{t}</div><div style={{ fontSize: 19, color: 'var(--gray)', lineHeight: 1.3 }}>{d}</div></div>
            </Entra>
          ))}
        </div>
      </div>
    </div>
  )
}

function Demo() {
  const roteiro = ['Login com matrícula e PIN', 'Retirada com o leitor', 'Devolução com avaria', 'Indisponíveis e tratativa', 'Consulta pública', 'Análises e relatório']
  return (
    <div className="camada escuro">
      <Textura opacidade={0.5} />
      <div style={{ position: 'absolute', inset: '0 140px', ...g('1.1fr 1fr', 100, { alignItems: 'center' }) }}>
        <div style={col(32)}>
          <Entra style={row(14)}>
            <span className="pulso" style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--red)', display: 'block' }} />
            <span className="rotulo" style={{ color: '#fff' }}>Ao vivo · 10 minutos</span>
          </Entra>
          <Entra as="h2" className="manchete" {...objeto('titulo', 'Título')} style={{ fontSize: 108, color: '#fff' }}><em>Demonstração</em></Entra>
          <Entra style={row(16, { color: 'rgba(255,255,255,.75)', fontSize: 24 })}>
            <ScanBarcode size={30} color="var(--red)" />Com o leitor de código de barras de verdade
          </Entra>
        </div>
        <motion.ol {...objeto('grupo', 'Roteiro da demo')} variants={{ visivel: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }} style={{ listStyle: 'none', margin: 0, padding: 0, ...col(0) }}>
          {roteiro.map((t, i) => (
            <Entra as="li" key={t} style={row(22, { padding: '22px 0', borderBottom: '1px solid rgba(255,255,255,.12)', fontSize: 28, color: '#fff' })}>
              <span className="mono num" style={{ color: 'var(--red)', fontSize: 22, fontWeight: 600, width: 34 }}>{i + 1}</span>{t}
            </Entra>
          ))}
        </motion.ol>
      </div>
    </div>
  )
}

function Reflexao() {
  const colunas = [
    ['Impacto', ['Histórico no lugar do quadro', 'Avaria vira ocorrência na hora']],
    ['Aprendizados', ['Ouvir o operador no balcão', 'Regra crítica fica no banco']],
  ]
  return (
    <div className="pagina">
      <Titulo rotulo="Encerramento">O que o projeto <em>deixou</em>.</Titulo>
      <Entra style={{ ...row(0, { alignItems: 'center', justifyContent: 'center' }), flex: 'none' }}>
        {/* proporção natural de cada imagem (952x538 e 1280x800), mesma altura: nada é cortado */}
        {[[quadro, 'Antes', 952 / 538], null, [dashboard, 'Depois', 1280 / 800]].map((item, k) => item === null
          ? <div key={k} style={{ width: 64, flex: 'none', display: 'grid', placeItems: 'center' }}><ArrowRight size={34} color="var(--red)" /></div>
          : (
            <div key={k} {...objeto('imagem', item[1])} style={{ position: 'relative', flex: `${item[2]} 1 0`, minWidth: 0, aspectRatio: String(item[2]), borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <img src={item[0]} alt={item[1]} style={{ width: '100%', height: '100%', display: 'block' }} />
              <span className="chip" style={{ position: 'absolute', left: 14, bottom: 14 }}>{item[1]}</span>
            </div>
          ))}
      </Entra>
      <div style={g('repeat(2, 1fr)', 28, { flex: 1, minHeight: 0 })}>
        {colunas.map(([t, itens]) => (
          <Entra key={t} className="cartao" {...objeto('lista', t)} style={{ padding: '0 30px', ...col(12, { justifyContent: 'center' }) }}>
            <div style={{ fontSize: 30, fontWeight: 650, color: 'var(--red)' }}>{t}</div>
            {itens.map((i) => <div key={i} style={{ fontSize: 23, color: 'var(--ink)', lineHeight: 1.35 }}>{i}</div>)}
          </Entra>
        ))}
      </div>
    </div>
  )
}

function Obrigado() {
  return (
    <div className="camada escuro">
      <Textura opacidade={0.6} />
      <Icone style={{ left: 410, top: 14, width: 1100 }} opacidade={0.07} />
      <div style={{ position: 'absolute', inset: 0, ...col(34, { alignItems: 'center', justifyContent: 'center', textAlign: 'center' }) }}>
        <Entra as="h2" className="manchete" {...objeto('titulo', 'Obrigado')} style={{ fontSize: 150, color: '#fff' }}><em>Obrigado.</em></Entra>
        <Entra as="p" className="sub" style={{ fontSize: 38, maxWidth: 'none' }}>Perguntas?</Entra>
        <Entra className="mono" style={{ fontSize: 24, color: 'rgba(255,255,255,.6)', marginTop: 40 }}>github.com/joaoaugusto-dev/PI-2026.2</Entra>
      </div>
    </div>
  )
}

/* ============================ roteiro ============================ */
// `notas` aparecem só no controle do celular, para quem está falando.
// O detalhe que saiu da tela mora aqui.
const NUVEM = ['Computação em Nuvem', 'Prof. Marudi']
const DADOS = ['Integração de Dados', 'Prof. Max']
const TECWEB = ['Tecnologias para Desenvolvimento Web', 'Prof. Nivaldo']
const INTERFACES = ['Desenvolvimento de Interfaces Web', 'Prof. Marcelo']
const stack = ([materia, prof], itens) => ({ materia, prof, itens })

export const SLIDES = [
  { bloco: 'intro', tipo: 'escuro', titulo: 'Capa', C: Capa, notas: ['Apresentar o projeto.', 'Beneficiado: manutenção da Soufer.'] },
  { bloco: 'intro', tipo: 'escuro', titulo: 'Equipe', C: Equipe, notas: ['Apresentar cada integrante e o papel no projeto.'] },
  { bloco: 'intro', tipo: 'escuro', titulo: 'Professores', C: Professores, notas: ['Cada matéria virou uma entrega do projeto.', 'Agradecer aos quatro professores.'] },
  { bloco: 'intro', tipo: 'escuro', titulo: 'Tecnologias', C: Tecnologias, notas: ['A stack inteira: front, back, dados, nuvem e gestão.', 'Cada slide traz no rodapé o que foi usado ali.'] },
  { bloco: 'intro', tipo: 'escuro', titulo: 'Roteiro', C: Agenda, notas: ['Quatro blocos, cerca de 19 minutos.', 'A demonstração ao vivo fecha o front-end.'] },
  { bloco: 'intro', tipo: 'tela', titulo: 'O problema', C: Problema, stack: stack(INTERFACES, ['Visita técnica', 'Relatório da visita', 'Figma']), notas: ['O balcão controla tudo num quadro branco.', 'Mostrar os 3 pontos na foto.', 'Na visita: etiqueta adesiva não resiste, atividade é opcional, balcão tem fila.'] },
  { bloco: 'intro', tipo: 'tela', titulo: 'A solução', C: Solucao, stack: stack(TECWEB, ['Leitor Code128', 'react-barcode', 'JWT', 'Zod']), notas: ['Bipa a ferramenta, bipa o crachá, Enter.', 'Perfis: manutenção (balcão), admin (cadastros e convites), consulta (quiosque 15 min).', 'ODS 9 e 12: rastrear evita perda e recompra.'] },
  { bloco: 'intro', tipo: 'tela', titulo: 'Gestão e documentação', C: Documentacao, stack: stack(['Todas as matérias', 'Projeto Integrador'], ['GitHub', 'GitHub Projects', 'GitHub Actions', 'Insomnia', 'Swagger']), notas: ['12 sprints no GitHub Projects.', 'As 12 entregas do Dia Maker.', 'Documentação toda no repositório.', 'Passar para o Guilherme.'] },
  { bloco: 'infra', tipo: 'tela', titulo: 'Banco de dados', C: Banco, stack: stack(DADOS, ['PostgreSQL', 'Migrations SQL', 'dbdiagram.io', 'BrasilAPI']), notas: ['Índice único parcial: 1 empréstimo aberto por ferramenta.', 'Trigger abre ocorrência na avaria.', 'BrasilAPI: cache em tabela, sem rede usa sábado e domingo.'] },
  { bloco: 'infra', tipo: 'tela', titulo: 'Ambiente atual', C: Producao, stack: stack(NUVEM, ['Dokploy', 'Docker', 'Traefik', 'Nixpacks', 'GitHub']), notas: ['Dokploy em servidor próprio, Traefik com HTTPS.', 'Produção (main) e desenvolvimento (development).', 'Healthcheck /v1/health, segredos em variáveis de ambiente.'] },
  { bloco: 'infra', tipo: 'tela', titulo: 'Plano AWS e custos', C: PlanoAws, stack: stack(NUVEM, ['EC2', 'RDS', 'S3 + CloudFront', 'Secrets Manager', 'CloudWatch', 'PM2 + Nginx']), notas: ['EC2 IaaS, RDS PaaS, bucket S3 + CloudFront, Secrets Manager PaaS (JWT e senha do banco), CloudWatch SaaS.', 'AWS US$ 29,51/mês; Azure US$ 36,51; GCP US$ 32,52.', 'Plano B: Render ou Railway.', 'Passar para o Henrique.'] },
  { bloco: 'back', tipo: 'tela', titulo: 'API REST', C: Api, stack: stack(TECWEB, ['Node 20', 'TypeScript', 'Express', 'Zod', 'Vitest']), notas: ['A esteira de middlewares, na ordem.', 'Envelope padrão de sucesso e de erro.', 'Stack: Node 20, Express, pg, Zod, bcryptjs, JWT, Pino, Swagger.'] },
  { bloco: 'back', tipo: 'tela', titulo: 'Requisições ao vivo', C: AoVivo, stack: stack(TECWEB, ['Insomnia', 'Swagger UI', 'Express', 'bcryptjs']), notas: ['Login → retirada 201.', 'Mesma retirada → 409 pelo índice do banco.', 'Devolução com avaria → ocorrência.', '403 por perfil, 400 do Zod.'] },
  { bloco: 'back', tipo: 'tela', titulo: 'Segurança', C: Seguranca, stack: stack(TECWEB, ['JWT', 'bcryptjs', 'Helmet', 'express-rate-limit', 'CORS']), notas: ['Rota: authenticate → authorize → validate.', 'Erro do banco vira 409 legível.', 'Consulta: 30 tentativas/min por IP e por matrícula.', 'Passar para o João.'] },
  { bloco: 'front', tipo: 'tela', titulo: 'Design system', C: DesignSystem, stack: stack(INTERFACES, ['Figma', 'Tailwind CSS', 'shadcn/ui', 'Radix UI', 'Lucide']), notas: ['Vermelho só para ação e marca.', 'Status com forma, nunca só cor.', 'Botões de 56 a 60 px: operador de luva.'] },
  { bloco: 'front', tipo: 'tela', titulo: 'React', C: React19, stack: stack(INTERFACES, ['React 19', 'Vite', 'React Router', 'TanStack Query', 'React Hook Form']), notas: ['Componentes reutilizáveis e rotas reais.', 'Stack: Vite, React 19, Router 7, TanStack Query, RHF + Zod, Tailwind + shadcn/ui.', 'Responsivo: 360, 768 e 1280 px.'] },
  { bloco: 'front', tipo: 'escuro', titulo: 'Demonstração', C: Demo, notas: ['Abrir o sistema em produção.', 'Seguir o roteiro de 6 passos.', 'Testar o leitor ao vivo.'] },
  { bloco: 'front', tipo: 'tela', titulo: 'Encerramento', C: Reflexao, stack: stack(['Todas as matérias', 'Projeto Integrador'], ['React', 'Node.js', 'PostgreSQL', 'Dokploy', 'GitHub']), notas: ['Antes e depois.', 'Impacto, desafios e aprendizados.'] },
  { bloco: 'front', tipo: 'escuro', titulo: 'Obrigado', C: Obrigado, notas: ['Agradecer e abrir para perguntas.'] },
]
