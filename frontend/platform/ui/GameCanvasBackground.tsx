interface GameCanvasBackgroundProps {
  gameSlug?: 'hyper-swiper' | 'tap-dancer'
}

/** Decorative only. The canvas keeps its full-screen coordinate system. */
export function GameCanvasBackground({ gameSlug = 'hyper-swiper' }: GameCanvasBackgroundProps) {
  return (
    <div
      className="arena-atmosphere fixed inset-0 pointer-events-none z-0"
      data-arena={gameSlug}
      aria-hidden="true"
    >
      <div className="arena-atmosphere__orbit" />
      <div className="arena-atmosphere__grid" />
      <div className="arena-atmosphere__grain" />
    </div>
  )
}
