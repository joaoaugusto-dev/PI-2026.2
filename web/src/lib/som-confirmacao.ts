import { useEffect, useState } from 'react'
import sfxConfirmacao from '@/assets/sfx/confirmation.mp3'

const CHAVE_ATIVO = 'soufer:som-confirmacao'
const EVENTO_ALTERADO = 'soufer:som-confirmacao-alterado'

export function somConfirmacaoAtivo() {
  return localStorage.getItem(CHAVE_ATIVO) !== 'false'
}

export function setSomConfirmacaoAtivo(ativo: boolean) {
  localStorage.setItem(CHAVE_ATIVO, String(ativo))
  window.dispatchEvent(new Event(EVENTO_ALTERADO))
}

export function playSomConfirmacao() {
  if (!somConfirmacaoAtivo()) return
  new Audio(sfxConfirmacao).play().catch(() => {})
}

/** Lê a preferência e se mantém sincronizado entre componentes — `localStorage`
 * sozinho não notifica quem já está montado quando outro componente muda o
 * valor (ex.: o toggle da sidebar e a página de estilos abertos ao mesmo
 * tempo). */
export function useSomConfirmacaoAtivo() {
  const [ativo, setAtivo] = useState(somConfirmacaoAtivo)

  useEffect(() => {
    const atualizar = () => setAtivo(somConfirmacaoAtivo())
    window.addEventListener(EVENTO_ALTERADO, atualizar)
    return () => window.removeEventListener(EVENTO_ALTERADO, atualizar)
  }, [])

  return ativo
}
