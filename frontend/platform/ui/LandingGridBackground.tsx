import './grid-background.css'
import landscape from './assets/landing-grid-landscape.webp'
import portrait from './assets/landing-grid-portrait.webp'

function GridRaster({ className }: { className?: string }) {
  return (
    <picture className={className}>
      <source media="(orientation: portrait)" srcSet={portrait} />
      <img
        src={landscape}
        alt=""
        className="absolute inset-0 w-full h-full"
        fetchPriority="high"
        draggable={false}
      />
    </picture>
  )
}

export function LandingGridBackground({ active = false }: { active?: boolean }) {
  return (
    <div className="fixed inset-0 z-0 grid-background" aria-hidden="true">
      <GridRaster />
      {/* Illuminate the same pixels; never replace or move the tunnel on entry. */}
      {active && <GridRaster className="landing-grid-scan" />}
    </div>
  )
}

export function LandingGridLoading({ label = 'Loading arcade…' }: { label?: string }) {
  return (
    <div className="pivot-grid-palette fixed inset-0 flex items-center justify-center">
      <LandingGridBackground />
      <p className="relative z-10 text-tron-cyan">{label}</p>
    </div>
  )
}
