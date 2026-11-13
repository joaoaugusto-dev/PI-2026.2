import { useEffect, useRef, useState } from 'react'

/* Ponte com o servidor da apresentação (deploy/server.mjs) por SSE. O palco
   publica onde está e escuta "ir"; o celular escuta o estado e manda "ir".
   Aberto como arquivo (file://) não há servidor: só teclado. */
export const temServidor = location.protocol === 'http:' || location.protocol === 'https:'

// Código da sala do palco: fica salvo neste computador, então o celular
// pareado ontem continua funcionando hoje.
export function codigoDaSala() {
  try {
    const salvo = localStorage.getItem('soufer:sala')
    if (salvo && /^[a-z0-9]{10,24}$/.test(salvo)) return salvo
  } catch { /* sem storage */ }
  const novo = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('')
  try { localStorage.setItem('soufer:sala', novo) } catch { /* sem storage */ }
  return novo
}

const postar = (sala, acao, dados) =>
  fetch(`/api/sala/${sala}/${acao}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) }).catch(() => {})

export function usarSala({ papel, sala, estado }, aoReceber, aoLaser, aoDestaque) {
  const [conectado, setConectado] = useState(false)
  const [presenca, setPresenca] = useState({ palco: 0, controle: 0 })
  const [estadoRemoto, setEstadoRemoto] = useState(null)
  const receber = useRef(aoReceber)
  receber.current = aoReceber
  const laser = useRef(aoLaser)
  laser.current = aoLaser
  const destaque = useRef(aoDestaque)
  destaque.current = aoDestaque
  const fila = useRef({ voando: 0, pendente: null, seq: 0 })
  const ativo = temServidor && !!sala

  useEffect(() => {
    if (!ativo) return
    // EventSource reconecta sozinho se o túnel cair
    const es = new EventSource(`/api/sala/${sala}/eventos?papel=${papel}`)
    es.onopen = () => setConectado(true)
    es.onerror = () => setConectado(false)
    es.addEventListener('presenca', (e) => setPresenca(JSON.parse(e.data)))
    es.addEventListener('estado', (e) => setEstadoRemoto(JSON.parse(e.data)))
    es.addEventListener('ir', (e) => receber.current?.(JSON.parse(e.data)))
    es.addEventListener('laser', (e) => laser.current?.(JSON.parse(e.data)))
    es.addEventListener('destaque', (e) => destaque.current?.(JSON.parse(e.data)))
    return () => es.close()
  }, [ativo, sala, papel])

  // palco: republica a posição a cada troca de slide e a cada reconexão
  const chave = estado ? JSON.stringify(estado) : ''
  useEffect(() => { if (ativo && conectado && estado) postar(sala, 'estado', estado) }, [ativo, conectado, chave]) // eslint-disable-line react-hooks/exhaustive-deps

  // laser: fluxo contínuo com número de sequência. Até 4 posições em voo ao
  // mesmo tempo (a taxa não depende da latência); o palco descarta as que
  // chegarem fora de ordem. Com 4 em voo, guarda só a mais recente.
  const enviarLaser = (d) => {
    if (!ativo) return
    const f = fila.current
    const pacote = { ...d, seq: ++f.seq }
    if (f.voando >= 4) { f.pendente = pacote; return }
    f.voando++
    postar(sala, 'laser', pacote).finally(() => {
      f.voando--
      if (f.pendente) { const p = f.pendente; f.pendente = null; f.voando++; postar(sala, 'laser', p).finally(() => { f.voando-- }) }
    })
  }

  return { ativo, conectado, presenca, estadoRemoto, enviar: (slide) => ativo && postar(sala, 'ir', { slide }), enviarLaser,
    enviarDestaque: (slide, id) => ativo && postar(sala, 'destaque', { slide, id }) }
}
