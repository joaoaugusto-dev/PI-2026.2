import { useEffect, useRef } from "react"

/**
 * Gesto de deslizar para a sidebar mobile (Sheet do shadcn nao trai isso por
 * padrao, so abre/fecha por toque no trigger ou no overlay). Threshold-based,
 * sem lib de gesto nova: escuta touchstart/move na borda esquerda da tela
 * para abrir, e no proprio painel para fechar, sempre com fallback pro toque
 * simples que ja existia.
 */
const EDGE_ZONE_PX = 24
const SWIPE_THRESHOLD_PX = 60

export function useSidebarEdgeSwipeToOpen(
  isMobile: boolean,
  openMobile: boolean,
  setOpenMobile: (open: boolean) => void
) {
  useEffect(() => {
    if (!isMobile || openMobile) return

    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch || touch.clientX > EDGE_ZONE_PX) return
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking) return
      const touch = event.touches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (Math.abs(dy) > Math.abs(dx)) {
        tracking = false
        return
      }
      if (dx > SWIPE_THRESHOLD_PX) {
        tracking = false
        setOpenMobile(true)
      }
    }

    const stopTracking = () => {
      tracking = false
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", stopTracking)

    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", stopTracking)
    }
  }, [isMobile, openMobile, setOpenMobile])
}

export function useSidebarSwipeToClose(setOpenMobile: (open: boolean) => void) {
  const startX = useRef(0)
  const startY = useRef(0)
  const tracking = useRef(false)

  return {
    onTouchStart: (event: React.TouchEvent) => {
      startX.current = event.touches[0].clientX
      startY.current = event.touches[0].clientY
      tracking.current = true
    },
    onTouchMove: (event: React.TouchEvent) => {
      if (!tracking.current) return
      const touch = event.touches[0]
      const dx = touch.clientX - startX.current
      const dy = touch.clientY - startY.current
      if (Math.abs(dy) > Math.abs(dx)) {
        tracking.current = false
        return
      }
      if (dx < -SWIPE_THRESHOLD_PX) {
        tracking.current = false
        setOpenMobile(false)
      }
    },
    onTouchEnd: () => {
      tracking.current = false
    },
  }
}
