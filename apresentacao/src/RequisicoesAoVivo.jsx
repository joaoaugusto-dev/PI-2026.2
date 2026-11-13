import { useEffect, useRef, useState } from 'react'
import { Highlight } from 'prism-react-renderer'
import { Check, X, Database, ShieldCheck, KeyRound, ListChecks, Cog, Gauge } from 'lucide-react'

/* O "GIF" do back-end: um ciclo em loop de requisições reais da API (formato
   de resposta e códigos de erro tirados de 01-api-respostas-de-erro.txt e de
   docs/backend/api.md; dados de demonstração). Tudo deriva de um relógio `t`
   por cena, então não há setTimeout encadeado para dessincronizar. */

const CADEIA_PROTEGIDA = [
  { id: 'auth', nome: 'authenticate', nota: 'JWT válido', I: KeyRound },
  { id: 'perfil', nome: 'authorize', nota: 'perfil permitido', I: ShieldCheck },
  { id: 'zod', nome: 'validate (Zod)', nota: 'corpo e tipos', I: ListChecks },
  { id: 'svc', nome: 'service', nota: 'regra de negócio', I: Cog },
  { id: 'db', nome: 'PostgreSQL', nota: 'constraints e triggers', I: Database },
]
const CADEIA_LOGIN = [
  { id: 'rate', nome: 'rate limit', nota: 'tentativas por IP', I: Gauge },
  { id: 'zod', nome: 'validate (Zod)', nota: 'matrícula 4 dígitos', I: ListChecks },
  { id: 'svc', nome: 'authService', nota: 'bcrypt.compare', I: Cog },
  { id: 'db', nome: 'PostgreSQL', nota: 'usuário ativo', I: Database },
]

const CENAS = [
  {
    rotulo: 'Login', metodo: 'POST', url: '/v1/auth/login', token: false, cadeia: CADEIA_LOGIN, falha: -1,
    corpo: { matricula: '9801', senha: '••••••' },
    status: 200, texto: 'OK', ms: 212,
    resposta: { data: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6…', usuario: { nome: 'DEMO ENTREGA BALCAO', papel: 'manutencao' } } },
  },
  {
    rotulo: 'Retirada', metodo: 'POST', url: '/v1/emprestimos', token: true, cadeia: CADEIA_PROTEGIDA, falha: -1,
    corpo: { ferramentaId: 94, colaboradorId: 4493, setorDestinoId: 2, atividadeObservacao: 'Manutenção preventiva' },
    status: 201, texto: 'Created', ms: 38, nota: 'trigger: ferramenta → em_uso',
    resposta: { data: { id: 512, ferramenta_nome: 'Furadeira de bancada', colaborador_nome: 'DEMO ENTREGA Colaborador', situacao: 'em_aberto', usuario_retirada_nome: 'DEMO ENTREGA BALCAO' } },
  },
  {
    rotulo: 'Retirada repetida', metodo: 'POST', url: '/v1/emprestimos', token: true, cadeia: CADEIA_PROTEGIDA, falha: 4,
    corpo: { ferramentaId: 94, colaboradorId: 3120, setorDestinoId: 5 },
    status: 409, texto: 'Conflict', ms: 21, nota: 'uq_emprestimo_aberto (23505)',
    resposta: { error: { code: 'FERRAMENTA_INDISPONIVEL', message: 'A ferramenta já possui um empréstimo em aberto', details: [] } },
  },
  {
    rotulo: 'Devolução com avaria', metodo: 'PATCH', url: '/v1/emprestimos/512/devolucao', token: true, cadeia: CADEIA_PROTEGIDA, falha: -1,
    corpo: { condicaoDevolucao: 'avaria', observacaoDevolucao: 'Mandril com folga', custoEstimado: 180 },
    status: 200, texto: 'OK', ms: 44, nota: 'trigger: abre ocorrência',
    resposta: { data: { id: 512, condicao_devolucao: 'avaria', ocorrencia_id: 31, resumo: 'Ferramenta enviada para Indisponíveis' } },
  },
  {
    rotulo: 'Perfil sem permissão', metodo: 'PATCH', url: '/v1/colaboradores/4493', token: true, cadeia: CADEIA_PROTEGIDA, falha: 1,
    corpo: { nome: 'tentativa' },
    status: 403, texto: 'Forbidden', ms: 6,
    resposta: { error: { code: 'ACCESS_DENIED', message: "Perfil 'manutencao' não possui permissão para acessar esta rota", details: [{ requiredRoles: ['admin'], userRole: 'manutencao' }] } },
  },
  {
    rotulo: 'Dado inválido', metodo: 'POST', url: '/v1/emprestimos', token: true, cadeia: CADEIA_PROTEGIDA, falha: 2,
    corpo: { ferramentaId: 'abc', colaboradorId: 4493 },
    status: 400, texto: 'Bad Request', ms: 4,
    resposta: { error: { code: 'VALIDATION_ERROR', message: 'Erro de validação nos dados enviados', details: [{ field: 'ferramentaId', message: 'ferramentaId deve ser um número' }, { field: 'setorDestinoId', message: 'setorDestinoId é obrigatório' }] } },
  },
]

const T_DIGITA = 1000, T_INICIO = 1250, T_PASSO = 340, T_RESP = 900, T_SEGURA = 2600

function tempos(cena) {
  const passos = cena.falha === -1 ? cena.cadeia.length : cena.falha + 1
  const resp = T_INICIO + passos * T_PASSO + 150
  return { passos, resp, fim: resp + T_RESP + T_SEGURA }
}
const clamp = (v) => Math.max(0, Math.min(1, v))
const hora = (base, i) => {
  const d = new Date(base + i * 7300)
  return d.toTimeString().slice(0, 8)
}

function Json({ texto, tamanho = 19 }) {
  return (
    <Highlight code={texto} language="json" theme={temaJson}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre style={{ margin: 0, font: `400 ${tamanho}px/1.55 var(--mono)`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {tokens.map((l, i) => (
            <div key={i} {...getLineProps({ line: l })}>{l.map((t, k) => <span key={k} {...getTokenProps({ token: t })} />)}</div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}
const temaJson = {
  plain: { color: '#EDEDEB' },
  styles: [
    { types: ['property'], style: { color: '#C9D1D9' } },
    { types: ['string'], style: { color: '#F3C38B' } },
    { types: ['number', 'boolean', 'null'], style: { color: '#FF8F95' } },
    { types: ['punctuation', 'operator'], style: { color: '#7E7E7B' } },
  ],
}

const corStatus = (s) => (s < 300 ? 'var(--ok)' : 'var(--red)')
const reduzido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function RequisicoesAoVivo() {
  const [cenaI, setCenaI] = useState(0)
  const [t, setT] = useState(reduzido ? 99999 : 0)
  // começa com tráfego de fundo, para o log nunca abrir vazio
  const [log, setLog] = useState(() => [
    { h: hora(Date.now() - 30000, 0), cena: { metodo: 'GET', url: '/v1/health', status: 200, ms: 2 } },
    { h: hora(Date.now() - 30000, 1), cena: { metodo: 'GET', url: '/v1/dashboard', status: 200, ms: 31 } },
    { h: hora(Date.now() - 30000, 2), cena: { metodo: 'GET', url: '/v1/ferramentas?page=1', status: 200, ms: 18 } },
  ])
  const base = useRef(Date.now())
  const cena = CENAS[cenaI]
  const tm = tempos(cena)

  useEffect(() => {
    let raf, inicio = performance.now(), registrado = false
    const passo = (agora) => {
      const dt = agora - inicio
      setT(dt)
      if (!registrado && dt >= tm.resp) {
        registrado = true
        setLog((l) => [...l.slice(-2), { h: hora(base.current, cenaI + l.length), cena }])
      }
      if (dt >= tm.fim) return setCenaI((i) => (i + 1) % CENAS.length)
      raf = requestAnimationFrame(passo)
    }
    // movimento reduzido: cada cena aparece pronta e troca a cada 5,2 s
    if (reduzido) {
      const id = setTimeout(() => setCenaI((i) => (i + 1) % CENAS.length), 5200)
      setLog((l) => [...l.slice(-2), { h: hora(base.current, cenaI + l.length), cena }])
      setT(99999)
      return () => clearTimeout(id)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [cenaI]) // eslint-disable-line react-hooks/exhaustive-deps

  const corpoTxt = JSON.stringify(cena.corpo, null, 2)
  const respTxt = JSON.stringify(cena.resposta, null, 2)
  const nCorpo = Math.round(clamp(t / T_DIGITA) * corpoTxt.length)
  const pResp = clamp((t - tm.resp) / T_RESP)
  const nResp = Math.round(pResp * respTxt.length)
  const progressoCena = clamp(t / tm.fim)

  // ponto que desce pela cadeia de middlewares
  const ALT = 60, GAP = 10
  const viagem = (t - T_INICIO) / T_PASSO // em "passos"
  const posPonto = Math.max(0, Math.min(tm.passos - 0.5, viagem))
  const pontoVisivel = t >= T_INICIO && t < tm.resp + 200

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, height: '100%' }}>
      {/* linha do tempo das cenas, como um GIF em loop */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${CENAS.length}, 1fr)`, gap: 10 }}>
        {CENAS.map((c, i) => (
          <div key={c.rotulo} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 5, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--ink)', transformOrigin: 'left', transform: `scaleX(${i < cenaI ? 1 : i === cenaI ? progressoCena : 0})` }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: i === cenaI ? 600 : 500, color: i === cenaI ? 'var(--ink)' : 'var(--gray-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono" style={{ color: corStatus(c.status), fontWeight: 600 }}>{c.status}</span>{c.rotulo}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 330px 1fr', gap: 26 }}>
        {/* cliente */}
        <Painel objeto="Requisição" titulo="Requisição" dir={<span className="mono" style={{ color: 'rgba(255,255,255,.5)', fontSize: 16 }}>Insomnia · front</span>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span className="mono" style={{ fontWeight: 700, fontSize: 20, color: '#fff', background: cena.metodo === 'POST' ? 'var(--red)' : '#575756', borderRadius: 6, padding: '4px 10px' }}>{cena.metodo}</span>
            <span className="mono" style={{ fontSize: 21, color: '#fff', wordBreak: 'break-all' }}>{cena.url}</span>
          </div>
          <div className="mono" style={{ fontSize: 17, color: 'rgba(255,255,255,.45)', marginBottom: 16, minHeight: 26 }}>
            {cena.token ? 'Authorization: Bearer eyJhbGciOi…' : 'Content-Type: application/json'}
          </div>
          <Json texto={corpoTxt.slice(0, nCorpo) + (nCorpo < corpoTxt.length ? '▍' : '')} />
        </Painel>

        {/* cadeia de middlewares */}
        <div data-objeto="diagrama" data-nome="Middlewares" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 52, minHeight: 0 }}>
          <div className="rotulo" style={{ position: 'absolute', top: 6, left: 0 }}>Servidor · Express</div>
          <div style={{ position: 'absolute', left: 34, top: 52 + ALT / 2, height: (cena.cadeia.length - 1) * (ALT + GAP), width: 2, background: 'var(--line)' }} />
          {cena.cadeia.map((etapa, i) => {
            const tChega = T_INICIO + i * T_PASSO + T_PASSO * 0.6
            const chegou = t >= tChega && i < tm.passos
            const falhou = chegou && i === cena.falha
            const cor = falhou ? 'var(--red)' : chegou ? 'var(--ink)' : 'var(--gray-2)'
            return (
              <div key={etapa.id + i} style={{
                height: ALT, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', position: 'relative',
                background: 'var(--paper)', borderRadius: 12,
                border: `1.5px solid ${falhou ? 'var(--red)' : chegou ? 'var(--ink)' : 'var(--line)'}`,
                transition: 'border-color 140ms var(--ease)',
              }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none', background: falhou ? 'var(--red)' : chegou ? 'var(--ink)' : 'var(--mist)', color: chegou ? '#fff' : 'var(--gray-2)', transition: 'background 140ms var(--ease)' }}>
                  {falhou ? <X size={22} strokeWidth={2.6} /> : chegou ? <Check size={22} strokeWidth={2.6} /> : <etapa.I size={20} />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="mono" style={{ display: 'block', fontSize: 18, fontWeight: 600, color: cor }}>{etapa.nome}</span>
                  <span style={{ display: 'block', fontSize: 14, color: 'var(--gray)' }}>
                    {falhou && cena.nota ? cena.nota : etapa.id === 'db' && chegou && cena.nota ? cena.nota : etapa.nota}
                  </span>
                </span>
              </div>
            )
          })}
          {pontoVisivel && (
            <div style={{
              position: 'absolute', left: 26, top: 52 + ALT / 2 - 9, width: 18, height: 18, borderRadius: '50%',
              background: 'var(--red)', boxShadow: '0 0 0 6px rgba(227,6,19,.18)',
              transform: `translateY(${posPonto * (ALT + GAP)}px)`, opacity: t > tm.resp ? 0 : 1,
              transition: 'opacity 160ms',
            }} />
          )}
        </div>

        {/* resposta */}
        <Painel objeto="Resposta" titulo="Resposta" dir={pResp > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="mono" style={{ fontSize: 16, color: 'rgba(255,255,255,.5)' }}>{cena.ms} ms</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 19, color: '#fff', background: corStatus(cena.status), borderRadius: 6, padding: '3px 10px' }}>{cena.status} {cena.texto}</span>
          </span>
        )}>
          {pResp > 0
            ? <Json texto={respTxt.slice(0, nResp) + (nResp < respTxt.length ? '▍' : '')} tamanho={18} />
            : <div className="mono" style={{ color: 'rgba(255,255,255,.3)', fontSize: 19 }}>aguardando…</div>}
        </Painel>
      </div>

      {/* log do servidor (Pino) */}
      <div data-objeto="codigo" data-nome="Log do servidor" style={{ height: 132, flex: 'none', background: '#0F0F0E', borderRadius: 14, padding: '14px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4, overflow: 'hidden', position: 'relative' }}>
        <span style={{ position: 'absolute', right: 20, top: 12, fontSize: 14, color: 'rgba(255,255,255,.35)' }}>formato real da API · dados de demonstração</span>
        {log.map(({ h, cena: c }, i) => (
          <div key={i} className="mono" style={{ fontSize: 18, color: i === log.length - 1 ? '#fff' : 'rgba(255,255,255,.4)', display: 'flex', gap: 22, whiteSpace: 'nowrap' }}>
            <span style={{ color: 'rgba(255,255,255,.35)' }}>{h}</span>
            <span style={{ width: 64 }}>{c.metodo}</span>
            <span style={{ width: 380, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.url}</span>
            <span style={{ color: corStatus(c.status), fontWeight: 600 }}>{c.status}</span>
            <span style={{ width: 70, textAlign: 'right' }}>{c.ms}ms</span>
            <span style={{ color: 'rgba(255,255,255,.35)' }}>{c.status >= 400 ? c.resposta.error.code : 'ok'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Painel({ titulo, dir, children, objeto }) {
  return (
    <div data-objeto="codigo" data-nome={objeto} style={{ background: '#161615', borderRadius: 16, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 50px -24px rgba(0,0,0,.45)' }}>
      <div style={{ height: 56, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,.75)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{titulo}</span>
        {dir}
      </div>
      <div style={{ padding: '20px 24px', flex: 1, minHeight: 0, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}
