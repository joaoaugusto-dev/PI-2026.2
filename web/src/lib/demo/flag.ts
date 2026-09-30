/**
 * Modo demonstração (entrega P1, sem API no ar): sem token, sem sessão, sem
 * rede. Com a flag ligada, o `api.ts` responde toda chamada com `adapter.ts`
 * (fixtures em memória) — nada sai do navegador. Nenhuma tela precisa saber
 * que está em demo.
 *
 * Este arquivo é só a flag e fica no bundle; `adapter.ts` e `fixtures.ts`
 * entram por `import()` dinâmico atrás de `DEMO_PERMITIDO`, então o build de
 * produção (sem `VITE_DEMO`) nem os emite.
 */
export const DEMO_PERMITIDO = import.meta.env.DEV || import.meta.env.VITE_DEMO === 'true'

let demoAtivo = false

export function setModoDemo(ativo: boolean) {
  demoAtivo = ativo
}

export function modoDemoAtivo() {
  return DEMO_PERMITIDO && demoAtivo
}
