import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { avisarErro } from '@/lib/avisar-erro'
import { MATRICULA_CADASTRO_MENSAGEM, MATRICULA_CADASTRO_REGEX } from '@/lib/matricula'

type CadastroRapidoColaboradorProps = {
  setores: { id: number; nome: string }[]
  /** O que o operador digitou/bipou no campo de colaborador: vira matrícula (se for número) ou nome, para não digitar de novo. */
  termo?: string
  enviando?: boolean
  onUsar: (colaborador: { nome: string; matricula: string; setorId: number }) => void
}

const CLASSE_INPUT =
  'h-(--control-h) w-full min-w-0 rounded-lg border bg-background px-3 text-corpo outline-none focus-visible:border-brand-red focus-visible:ring-2 focus-visible:ring-brand-red/20'

/** Cadastro rápido no meio do fluxo de retirada, sem perder o que já foi preenchido. */
export function CadastroRapidoColaborador({ setores, termo = '', enviando, onUsar }: CadastroRapidoColaboradorProps) {
  const ehNumero = /^\d+$/.test(termo.trim())
  const [rascunho, setRascunho] = useState(() => ({
    nome: ehNumero ? '' : termo.trim().toUpperCase(),
    matricula: ehNumero ? termo.trim().slice(0, 4) : '',
    setorId: '',
  }))
  const completo = rascunho.nome.trim() && rascunho.matricula.trim() && rascunho.setorId

  function usar() {
    const nome = rascunho.nome.trim()
    const matricula = rascunho.matricula.trim()
    if (!completo) return
    if (!MATRICULA_CADASTRO_REGEX.test(matricula)) {
      avisarErro(MATRICULA_CADASTRO_MENSAGEM)
      return
    }
    onUsar({ nome, matricula, setorId: Number(rascunho.setorId) })
  }

  return (
    <div className="space-y-3 rounded-lg border border-status-atraso/40 bg-status-atraso/5 p-3">
      <p className="flex items-start gap-1.5 text-sm font-medium text-status-atraso">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        Colaborador não encontrado. Cadastre agora — o resto da retirada continua preenchido.
      </p>
      {/* empilhado: cabe em meia tela (desktop) e no celular sem estourar o card */}
      <input
        value={rascunho.nome}
        onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
        placeholder="Nome completo"
        aria-label="Nome completo"
        autoFocus={ehNumero}
        className={CLASSE_INPUT}
      />
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <input
          value={rascunho.matricula}
          onChange={(e) => setRascunho((r) => ({ ...r, matricula: e.target.value.replace(/\D/g, '') }))}
          placeholder="Matrícula"
          aria-label="Matrícula"
          inputMode="numeric"
          maxLength={4}
          className={CLASSE_INPUT}
        />
        <select
          value={rascunho.setorId}
          onChange={(e) => setRascunho((r) => ({ ...r, setorId: e.target.value }))}
          aria-label="Setor"
          className={CLASSE_INPUT}
        >
          <option value="">Setor…</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={usar}
        disabled={enviando || !completo}
        className="h-(--control-h) w-full rounded-lg bg-foreground px-4 text-corpo font-medium text-white transition-colors hover:bg-foreground/90 disabled:opacity-40"
      >
        {enviando ? 'Cadastrando…' : 'Cadastrar e usar'}
      </button>
    </div>
  )
}
