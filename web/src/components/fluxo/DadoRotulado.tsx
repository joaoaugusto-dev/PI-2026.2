import type { ReactNode } from 'react'
import { RotuloCampo } from '@/components/fluxo/RotuloCampo'

export function DadoRotulado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <RotuloCampo>{rotulo}</RotuloCampo>
      <p className="text-corpo font-medium">{children}</p>
    </div>
  )
}
