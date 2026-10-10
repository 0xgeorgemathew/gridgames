import { clientLazy } from './client-lazy'
import './grid-background.css'
import landscape from './assets/landing-grid-landscape.webp'
import portrait from './assets/landing-grid-portrait.webp'

const loadActiveGrid = () =>
  import('./GridScanBackground').then((module) => module.GridScanBackground).catch(() => () => null)

const ActiveGrid = clientLazy(loadActiveGrid)

// Warm the decorative scan on entry intent, without initializing a renderer.
export function preloadLandingScan() {
  void loadActiveGrid()
}

export function LandingGridBackground({ active = false }: { active?: boolean }) {
  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      <div className="absolute inset-0 grid-background">
        <picture>
          <source media="(orientation: portrait)" srcSet={portrait} />
          <img
            src={landscape}
            alt=""
            className="absolute inset-0 w-full h-full"
            fetchPriority="high"
            draggable={false}
          />
        </picture>
      </div>
      {active && (
        <ActiveGrid
          linesColor="#69deff"
          scanDirection={1}
          scanRange={[0, 2]}
          scanOpacity={0.8}
          scanDuration={0.8}
          scanDelay={0}
          scanGlow={1}
        />
      )}
    </div>
  )
}
