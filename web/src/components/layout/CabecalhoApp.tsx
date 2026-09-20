import { Activity, BellIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { SidebarTrigger } from '@/components/ui/Sidebar'

type CabecalhoAppProps = {
  titulo: string
  dataFormatada: string
  horaFormatada: string
}

export function CabecalhoApp({ titulo, dataFormatada, horaFormatada }: CabecalhoAppProps) {
  return (
    <header className="flex h-16 items-center gap-2 border-b px-4 justify-between">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h1 className="text-secao font-semibold">{titulo}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-corpo text-muted-foreground hidden md:inline">
          {dataFormatada} · {horaFormatada}
        </span>
        <Link to="/status" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <Badge variant="outline" className="gap-1 text-xs py-0.5 px-2 bg-background cursor-pointer">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Activity className="size-3 text-muted-foreground" />
            <span className="text-[11px] font-medium hidden sm:inline">Status API</span>
          </Badge>
        </Link>
        <button type="button" className="relative cursor-pointer">
          <BellIcon className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
          <Badge className="absolute -top-2 -right-2 size-4 justify-center rounded-full p-0 text-[10px] bg-[var(--brand-red)] text-white">
            4
          </Badge>
        </button>
        <div className="flex items-center gap-2 border-l pl-4">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-medium">MA</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-corpo font-medium">Marcos Andrade</span>
            <span className="text-rotulo text-muted-foreground">Almoxarife · Turno A</span>
          </div>
        </div>
      </div>
    </header>
  )
}
