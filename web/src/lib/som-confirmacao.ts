import sfxConfirmacao from '@/assets/sfx/confirmation.mp3'

const CHAVE_ATIVO = 'soufer:som-confirmacao'

export function somConfirmacaoAtivo() {
  return localStorage.getItem(CHAVE_ATIVO) !== 'false'
}

export function setSomConfirmacaoAtivo(ativo: boolean) {
  localStorage.setItem(CHAVE_ATIVO, String(ativo))
}

export function playSomConfirmacao() {
  if (!somConfirmacaoAtivo()) return
  new Audio(sfxConfirmacao).play().catch(() => {})
}
