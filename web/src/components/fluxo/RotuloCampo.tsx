import type { ReactNode } from 'react'

export function RotuloCampo({ children }: { children: ReactNode }) {
  return <p className="text-rotulo tracking-[0.08em] text-muted-foreground uppercase">{children}</p>
}
