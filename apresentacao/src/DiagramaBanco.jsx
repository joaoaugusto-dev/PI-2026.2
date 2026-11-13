/* DER simplificado do SOUFER Tools: as 6 tabelas do núcleo, com as colunas que
   explicam a regra crítica. Texto grande de propósito (projetor). As 14 tabelas
   completas ficam em docs/banco-de-dados/der.dbml. */

const L = 280 // largura de cada tabela
const LIN = 36 // altura de cada linha
const CAB = 46

const TABELAS = {
  grupos: { x: 0, y: 0, nome: 'grupos_ferramentas', campos: [['id', 'PK'], ['nome']] },
  colab: { x: 300, y: 0, nome: 'colaboradores', campos: [['id', 'PK'], ['nome'], ['matricula'], ['setor_id', 'FK']] },
  usuarios: { x: 600, y: 0, nome: 'usuarios', campos: [['id', 'PK'], ['colaborador_id', 'FK'], ['papel'], ['senha_hash']] },
  ferr: { x: 0, y: 270, nome: 'ferramentas', campos: [['id', 'PK'], ['nome'], ['grupo_id', 'FK'], ['status'], ['motivo_indisponivel']] },
  emp: { x: 300, y: 270, nome: 'emprestimos', destaque: true, campos: [['id', 'PK'], ['ferramenta_id', 'FK'], ['colaborador_id', 'FK'], ['usuario_retirada_id', 'FK'], ['data_retirada'], ['data_devolucao', 'marca']] },
  ocor: { x: 600, y: 270, nome: 'ocorrencias', campos: [['id', 'PK'], ['emprestimo_id', 'FK'], ['ferramenta_id', 'FK'], ['tipo'], ['status']] },
}
const altura = (t) => CAB + t.campos.length * LIN

function Tabela({ t }) {
  const h = altura(t)
  const cor = t.destaque ? '#E30613' : '#1D1D1B'
  return (
    <g transform={`translate(${t.x},${t.y})`}>
      <rect width={L} height={h} rx="12" fill="#fff" stroke={cor} strokeWidth={t.destaque ? 3 : 1.5} />
      <path d={`M0 12a12 12 0 0 1 12-12h${L - 24}a12 12 0 0 1 12 12v${CAB - 12}H0z`} fill={cor} />
      <text x="18" y="31" fill="#fff" style={{ font: '600 22px var(--mono)' }}>{t.nome}</text>
      {t.campos.map(([nome, tipo], i) => {
        const y = CAB + i * LIN
        return (
          <g key={nome}>
            {tipo === 'marca' && <rect x="2" y={y} width={L - 4} height={LIN} fill="rgba(227,6,19,.12)" />}
            <text x="18" y={y + 25} fill={tipo === 'marca' ? '#B5121B' : '#1D1D1B'} style={{ font: `${tipo === 'marca' ? 600 : 500} 19px var(--mono)` }}>{nome}</text>
            {(tipo === 'PK' || tipo === 'FK') && (
              <text x={L - 16} y={y + 25} textAnchor="end" fill={tipo === 'PK' ? '#E30613' : '#575756'} style={{ font: '700 16px var(--mono)' }}>{tipo}</text>
            )}
          </g>
        )
      })}
    </g>
  )
}

/* cardinalidade: "1" no lado pai, "N" no lado filho */
const Rot = ({ x, y, t }) => <text x={x} y={y} textAnchor="middle" fill="#575756" style={{ font: '700 20px var(--mono)' }}>{t}</text>

export function DiagramaBanco() {
  const linha = { stroke: '#8A8A88', strokeWidth: 2.5, fill: 'none' }
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <svg viewBox="0 0 880 584" role="img" aria-label="Diagrama das principais tabelas: colaboradores, usuarios, ferramentas, emprestimos e ocorrencias" style={{ flex: 1, minHeight: 0, width: '100%' }}>
        {/* relações */}
        <path {...linha} d="M580 90H600" /><Rot x={590} y={80} t="N" />
        <path {...linha} d="M140 112V270" /><Rot x={156} y={134} t="1" /><Rot x={156} y={258} t="N" />
        <path {...linha} d="M440 190V270" /><Rot x={456} y={212} t="1" /><Rot x={456} y={262} t="N" />
        <path {...linha} d="M280 345H300" /><Rot x={290} y={335} t="1" />
        <path {...linha} d="M580 345H600" /><Rot x={590} y={335} t="N" />
        {Object.entries(TABELAS).map(([k, t]) => <Tabela key={k} t={t} />)}
        <rect x="300" y="546" width={L} height="34" rx="17" fill="#E30613" />
        <text x={300 + L / 2} y="569" textAnchor="middle" fill="#fff" style={{ font: '700 17px var(--mono)', letterSpacing: '.04em' }}>ÍNDICE ÚNICO PARCIAL</text>
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <span className="rotulo">+ 8 de apoio</span>
        {['setores', 'subgrupos', 'atividades', 'itens_kit', 'auditoria', 'notificacoes', 'convites_acesso', 'feriados'].map((n) => (
          <span key={n} className="chip mono" style={{ height: 36, fontSize: 17, padding: '0 14px' }}>{n}</span>
        ))}
      </div>
    </div>
  )
}
