import { memo, useEffect, useRef } from 'react'

/** Ambient movement stays on the compositor, outside the arena's frame clock. */
export const StockGrid = memo(function StockGrid({
  active,
  reducedMotion,
}: {
  active: boolean
  reducedMotion: boolean
}) {
  const field = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const update = () => {
      if (field.current)
        field.current.dataset.moving = String(active && !reducedMotion && !document.hidden)
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [active, reducedMotion])
  return (
    <div ref={field} className="ninja-grid-field" data-moving="false" aria-hidden="true">
      <div className="ninja-grid-plane" />
      <div className="ninja-grid-scan" />
      <div className="ninja-grid-sparks">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
})
