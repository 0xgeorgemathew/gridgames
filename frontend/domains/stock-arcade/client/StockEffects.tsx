import { useLayoutEffect, useRef } from 'react'
import { captureDisc, DerezRenderer, type DiscSnapshot } from './derez-renderer'
import { COIN_CONFIG } from '@/platform/game-engine/visuals/tron-disc'
import {
  BLADE_CONFIG,
  tronRibbon,
  type RibbonPoint,
} from '@/platform/game-engine/visuals/tron-ribbon'
const hex = (color: number) => '#' + color.toString(16).padStart(6, '0')
const energy = hex(COIN_CONFIG.long.color)
/** The original sculpted disc rim: eight separated energy cells and a dark core. */
function DiscArtwork() {
  return (
    <>
      {[6, 5, 4, 3, 2, 1].map((i) => (
        <circle key={i} r="30" fill="none" stroke={energy} strokeWidth={i} opacity="0.018" />
      ))}
      <circle
        r="30"
        fill="#0a0a0a"
        stroke={hex(COIN_CONFIG.long.edgeColor)}
        strokeWidth="0.65"
        strokeOpacity="0.8"
      />
      <circle r="27" fill={hex(COIN_CONFIG.long.darkCore)} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4 + 0.07,
          b = a + Math.PI / 4 - 0.14
        return (
          <path
            key={i}
            d={`M${28 * Math.cos(a)},${28 * Math.sin(a)} A28,28 0 0 1 ${28 * Math.cos(b)},${28 * Math.sin(b)}`}
            fill="none"
            stroke={energy}
            strokeWidth="2.2"
          />
        )
      })}
      <circle r="22" fill="none" stroke={energy} strokeWidth="0.55" opacity="0.45" />
    </>
  )
}
export function StockDiscRim() {
  return (
    <svg className="ninja-disc-rim" viewBox="-36 -36 72 72" aria-hidden="true">
      <DiscArtwork />
    </svg>
  )
}
/** Same tapered glass ribbon polygons and crisp white edge cores as Hyper Swiper. */
export function StockBlade({
  points,
  mobile,
  phase,
}: {
  points: RibbonPoint[]
  mobile: boolean
  phase: number
}) {
  const ribbon = tronRibbon(points, mobile, phase)
  if (!ribbon) return null
  return (
    <svg className="arcade-trail" aria-hidden="true">
      {ribbon.layers.map((layer, i) => (
        <polygon
          key={i}
          points={layer.points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={hex(layer.color)}
          opacity={layer.opacity}
        />
      ))}
      {[
        [2, energy, 0.4],
        [1, energy, 0.7],
        [0.4, '#ffffff', 0.9],
      ].map(([scale, color, alpha], i) => (
        <circle
          key={i}
          cx={ribbon.head.x}
          cy={ribbon.head.y}
          r={ribbon.headGlowSize * Number(scale)}
          fill={String(color)}
          opacity={Number(alpha)}
        />
      ))}
    </svg>
  )
}
/** Transient Canvas2D surface, advanced by the existing match clock. It never
 * owns an idle animation loop or creates a DOM node for each fragment.
 */
export function StockDeRez({
  progress,
  symbol = 'NVDA',
  rotation = 0,
  sliceAngle = 0,
  source,
}: {
  progress: number
  symbol?: string
  rotation?: number
  sliceAngle?: number
  source?: DiscSnapshot
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<DerezRenderer | null>(null),
    current = useRef(progress)
  current.current = progress
  useLayoutEffect(() => {
    if (!canvas.current) return
    const disc = source ?? captureDisc(symbol, null, rotation)
    const effect = new DerezRenderer(canvas.current, disc, sliceAngle)
    renderer.current = effect
    const loaded = () => {
      effect.repaintFront()
      if (!document.hidden) effect.draw(current.current)
    }
    if (!disc.image.complete) disc.image.addEventListener('load', loaded)
    effect.draw(current.current)
    return () => {
      disc.image.removeEventListener('load', loaded)
      effect.dispose()
      renderer.current = null
    }
  }, [source, symbol, rotation, sliceAngle])
  useLayoutEffect(() => {
    renderer.current?.draw(progress)
  }, [progress])
  return <canvas ref={canvas} className="ninja-derez" aria-hidden="true" />
}
export const STOCK_BLADE_COLOR = BLADE_CONFIG.color
