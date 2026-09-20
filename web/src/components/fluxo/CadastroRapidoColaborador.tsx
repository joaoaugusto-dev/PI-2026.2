import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { BotaoSecundario } from '@/components/fluxo/BotaoSecundario'

type CadastroRapidoColaboradorProps = {
  onUsar: (colaborador: { nome: string; matricula: string }) => void
}

const CLASSE_INPUT = 'h-9 rounded-md border px-2.5 text-sm outline-none focus-visible:border-brand-red'

/** Cadastro rápido no meio do fluxo de retirada, sem perder o que já foi preenchido. */
export function CadastroRapidoColaborador({ onUsar }: CadastroRapidoColaboradorProps) {
  const [rascunho, setRascunho] = useState({ nome: '', matricula: '' })

  function usar() {
    const nome = rascunho.nome.trim()
    const matricula = rascunho.matricula.trim()
    if (!nome || !matricula) return
    onUsar({ nome, matricula })
    setRascunho({ nome: '', matricula: '' })
  }

  return (
    <div className="space-y-2 rounded-lg border border-status-atraso/40 bg-status-atraso/5 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-status-atraso">
        <AlertTriangle className="size-4" />
        Colaborador não encontrado — cadastro rápido, sem perder o que já foi preenchido
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <input
          value={rascunho.nome}
          onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
          placeholder="Nome completo"
          className={CLASSE_INPUT}
        />
        <input
          value={rascunho.matricula}
          onChange={(e) => setRascunho((r) => ({ ...r, matricula: e.target.value }))}
          placeholder="Matrícula"
          className={CLASSE_INPUT}
        />
        <BotaoSecundario onClick={usar} className="rounded-md bg-background">
          Usar
        </BotaoSecundario>
      </div>
    </div>
  )
}
