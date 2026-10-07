import { COIN_CONFIG } from '@/platform/game-engine/visuals/tron-disc'
import {
  BLADE_CONFIG,
  tronRibbon,
  type RibbonPoint,
} from '@/platform/game-engine/visuals/tron-ribbon'
const hex = (color: number) => '#' + color.toString(16).padStart(6, '0')
const energy = hex(COIN_CONFIG.long.color)
/** The original sculpted disc rim: eight separated energy cells and a dark core. */
export function StockDiscRim() {
  return (
    <svg className="ninja-disc-rim" viewBox="-36 -36 72 72" aria-hidden="true">
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
      <circle r="18" fill="none" stroke={energy} strokeWidth="0.55" opacity="0.45" />
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
/** Short de-resolution: original cyan triangular/voxel shards with white cores. */
export function StockDeRez({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress)),
    distance = 6 + 12 * p
  return (
    <svg
      className="ninja-derez"
      viewBox="-70 -70 140 140"
      aria-hidden="true"
      style={{ opacity: 1 - p }}
    >
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4
        return (
          <g
            key={i}
            transform={`translate(${Math.cos(angle) * distance},${Math.sin(angle) * distance}) rotate(${i * 45}) scale(${1 - p * 0.6})`}
          >
            {i % 2 ? (
              <path d="M-5,-5 H5 V5 H-5Z" fill={energy} opacity="0.8" />
            ) : (
              <path d="M0,-7 L6,4 L-6,4Z" fill={energy} opacity="0.8" />
            )}
            <path d="M0,-2 L2,1 L-2,1Z" fill="white" opacity="0.9" />
          </g>
        )
      })}
    </svg>
  )
}
export const STOCK_BLADE_COLOR = BLADE_CONFIG.color
