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

// criado e pré-carregado uma vez: `new Audio()` a cada toque baixava e decodificava o mp3
// na primeira reprodução, o que travava a tela justo na primeira confirmação
const audio = typeof Audio === 'undefined' ? null : new Audio(sfxConfirmacao)
if (audio) audio.preload = 'auto'

export function playSomConfirmacao() {
  if (!audio || !somConfirmacaoAtivo()) return
  audio.currentTime = 0
  audio.play().catch(() => {})
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
