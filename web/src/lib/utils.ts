import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge nao conhece a escala tipografica custom do design system
// (FE-01) — sem isso, `text-kpi`/`text-titulo`/etc cai no grupo de conflito
// de `text-color` e é removido por engano quando combinado com uma classe de
// cor (ex.: `cn('text-kpi', 'text-foreground')` descartava o `text-kpi`).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": ["text-display", "text-titulo", "text-secao", "text-corpo", "text-rotulo", "text-kpi"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
