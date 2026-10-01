import { BellIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { useMarcarLida, useNotificacoes, type Notificacao } from '@/hooks/useNotificacoes'

export function SinoNotificacoes() {
  const [aberto, setAberto] = useState(false)
  const navegar = useNavigate()
  const { data, isError } = useNotificacoes(true)
  const marcarLida = useMarcarLida()
  const itens = data?.data ?? []
  const total = data?.meta.total ?? 0

  function abrir(n: Notificacao) {
    marcarLida.mutate(n.id)
    setAberto(false)
    if (n.link) navegar(n.link)
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative cursor-pointer"
          aria-label={total > 0 ? `Notificações: ${total} não lidas` : 'Notificações'}
        >
          <BellIcon className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
          {total > 0 && (
            <Badge className="absolute -top-2 -right-2 min-w-4 h-4 justify-center rounded-full px-1 text-[10px] bg-[var(--brand-red)] text-white">
              {total > 99 ? '99+' : total}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="border-b px-3 py-2 text-corpo font-medium">Notificações</p>
        {isError ? (
          <p className="px-3 py-6 text-center text-corpo text-muted-foreground">Não foi possível carregar.</p>
        ) : itens.length === 0 ? (
          <p className="px-3 py-6 text-center text-corpo text-muted-foreground">Nada novo por aqui.</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {itens.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => abrir(n)}
                  className="w-full cursor-pointer px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="block text-corpo font-medium">{n.titulo}</span>
                  <span className="block text-rotulo text-muted-foreground">{n.mensagem}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
