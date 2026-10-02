import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { BotaoSecundario } from '@/components/fluxo/BotaoSecundario'

type CadastroRapidoColaboradorProps = {
  setores: { id: number; nome: string }[]
  enviando?: boolean
  onUsar: (colaborador: { nome: string; matricula: string; setorId: number }) => void
}

const CLASSE_INPUT = 'h-9 rounded-md border px-2.5 text-sm outline-none focus-visible:border-brand-red'

/** Cadastro rápido no meio do fluxo de retirada, sem perder o que já foi preenchido. */
export function CadastroRapidoColaborador({ setores, enviando, onUsar }: CadastroRapidoColaboradorProps) {
  const [rascunho, setRascunho] = useState({ nome: '', matricula: '', setorId: '' })

  function usar() {
    const nome = rascunho.nome.trim()
    const matricula = rascunho.matricula.trim()
    if (!nome || !matricula || !rascunho.setorId) return
    onUsar({ nome, matricula, setorId: Number(rascunho.setorId) })
    setRascunho({ nome: '', matricula: '', setorId: '' })
  }

  return (
    <div className="space-y-2 rounded-lg border border-status-atraso/40 bg-status-atraso/5 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-status-atraso">
        <AlertTriangle className="size-4" />
        Colaborador não encontrado — cadastro rápido, sem perder o que já foi preenchido
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_10rem_auto]">
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
        <select
          value={rascunho.setorId}
          onChange={(e) => setRascunho((r) => ({ ...r, setorId: e.target.value }))}
          className={CLASSE_INPUT}
        >
          <option value="">Setor</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <BotaoSecundario onClick={usar} disabled={enviando} className="rounded-md bg-background">
          Usar
        </BotaoSecundario>
      </div>
    </div>
  )
}
