import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Sacode o campo quando `erro` é verdadeiro — nega o gesto em 260ms, sem
 * piscar cor (`animate-erro`, mesma animação do campo de código na FE-09).
 * `tentativa` é um contador que muda a cada nova tentativa (ex.: número de
 * submits com erro) — forçando o remonte do wrapper pra animação repetir a
 * cada erro, não só na primeira vez.
 */
export function CampoComErro({
  erro,
  tentativa,
  className,
  children,
}: {
  erro?: boolean
  tentativa: number
  className?: string
  children: ReactNode
}) {
  return (
    <div key={tentativa} className={cn(erro && 'animate-erro', className)}>
      {children}
    </div>
  )
}
