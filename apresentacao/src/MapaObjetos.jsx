import { memo } from 'react'
import { vibrar } from './vibrar.js'
import { OBJETOS } from './objetos.js'

/* Esquema leve do slide atual: a moldura (menu lateral e barra de cima, quando
   o slide tem) e uma área tocável em cada objeto, NO LUGAR dele, com o ícone e o
   nome. Posições fixas, de scripts/gerar-objetos.py: nada é medido nem
   desenhado durante a apresentação. Os menores ficam por cima. */
const ICONE = { celular: '▯', titulo: 'T', imagem: '▣', codigo: '</>', kpi: '#', grafico: '▥', diagrama: '◇', lista: '≡', grupo: '▢' }
const pct = (v) => `${v * 100}%`

function Mapa({ slide, tela, aoEscolher, destaque }) {
  const objetos = OBJETOS[slide + 1] ?? []
  const ordenados = [...objetos].sort((a, b) => b[5] * b[6] - a[5] * a[6])
  const escolhido = objetos.find((o) => o[0] === destaque)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
      <div style={{ position: 'relative', flex: 'none', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', background: tela ? '#F4F4F3' : '#1D1D1B', border: '1px solid rgba(255,255,255,.18)' }}>
        {tela && <>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(340 / 1920), background: '#1D1D1B' }} />
          <div style={{ position: 'absolute', left: pct(340 / 1920), right: 0, top: 0, height: pct(96 / 1080), background: '#fff', borderBottom: '1px solid #D9D9D9' }} />
        </>}
        {ordenados.map(([id, tipo, nome, x, y, w, h]) => {
          const ativo = id === destaque
          return (
            <button key={id} type="button" aria-pressed={ativo} aria-label={nome}
              onClick={() => { vibrar(10); aoEscolher(ativo ? null : id) }}
              style={{
                position: 'absolute', left: pct(x), top: pct(y), width: pct(w), height: pct(h),
                minWidth: 30, minHeight: 24, padding: '2px 4px', borderRadius: 4, overflow: 'hidden',
                display: 'flex', alignItems: 'flex-start', gap: 4, textAlign: 'left',
                font: '700 9px/1.15 var(--sans)', color: ativo ? '#fff' : '#B5121B',
                border: `1.5px solid ${ativo ? '#fff' : '#E30613'}`,
                background: ativo ? '#E30613' : 'rgba(227,6,19,.08)',
              }}>
              <span style={{ flex: 'none', opacity: 0.8 }}>{ICONE[tipo]}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{nome}</span>
            </button>
          )
        })}
      </div>
      <div style={{ height: 24, flex: 'none', fontSize: 14, color: 'rgba(255,255,255,.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {!objetos.length ? 'Este slide não tem objetos para destacar.' : escolhido ? <>Destacando: <b style={{ color: '#fff' }}>{escolhido[2]}</b> · toque de novo para apagar</> : 'Toque no objeto para destacar no palco.'}
      </div>
    </div>
  )
}

// o cronômetro re-renderiza o controle a cada 0,5 s; o esquema só muda com slide ou destaque
export const MapaObjetos = memo(Mapa, (a, b) => a.slide === b.slide && a.destaque === b.destaque && a.tela === b.tela)
