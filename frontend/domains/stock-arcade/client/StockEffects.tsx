import { useId } from 'react'
import { stockAsset } from '../shared/assets'
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
// A tessellated disc, not independent confetti: each fragment retains its part
// of the logo/core/rim, exposes a luminous cut edge, then rapidly derezzes.
const fragments = Array.from({ length: 16 }, (_, cell) => {
  const x = (cell % 4) * 16 - 32,
    y = Math.floor(cell / 4) * 16 - 32
  return [
    [
      [x, y],
      [x + 16, y],
      [x, y + 16],
    ],
    [
      [x + 16, y],
      [x + 16, y + 16],
      [x, y + 16],
    ],
  ]
})
  .flat()
  .map((vertices, i) => ({
    points: vertices.map(([x, y]) => `${x},${y}`).join(' '),
    x: vertices.reduce((sum, p) => sum + p[0], 0) / 3,
    y: vertices.reduce((sum, p) => sum + p[1], 0) / 3,
    life: 0.58 + ((i * 7) % 11) * 0.038,
  }))
export function StockDeRez({
  progress,
  symbol = 'NVDA',
  rotation = 0,
}: {
  progress: number
  symbol?: string
  rotation?: number
}) {
  const id = useId().replace(/:/g, ''),
    p = Math.max(0, Math.min(1, progress))
  const spread = Math.min(1, p / 0.45)
  return (
    <svg className="ninja-derez" viewBox="-33 -33 66 66" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-disc`}>
          <circle r="30" />
        </clipPath>
        {fragments.map((f, i) => (
          <clipPath key={i} id={`${id}-${i}`}>
            <polygon points={f.points} />
          </clipPath>
        ))}
        <g id={`${id}-face`}>
          <g transform={`rotate(${(rotation * 180) / Math.PI})`}>
            <DiscArtwork />
          </g>
          <rect x="-20" y="-17" width="40" height="23" rx="4" fill="#f4f6f8" />
          <image
            href={stockAsset(symbol)?.logo}
            x="-17"
            y="-15"
            width="34"
            height="19"
            preserveAspectRatio="xMidYMid meet"
          />
          <text
            y="15"
            textAnchor="middle"
            fill="white"
            fontSize="6"
            fontFamily="Orbitron, sans-serif"
            fontWeight="800"
          >
            {symbol}
          </text>
        </g>
      </defs>
      {fragments.map((f, i) => {
        const dissolve = Math.max(0, (p - 0.2) / (f.life - 0.2))
        if (dissolve >= 1) return null
        const shrink = 1 - Math.pow(dissolve, 3) * 0.9
        const dx = (f.x / 32) * spread * 6,
          dy = (f.y / 32) * spread * 5 - spread * 2
        return (
          <g
            key={i}
            data-fragment="disc"
            opacity={Math.min(1, (1 - dissolve) * 2)}
            transform={`translate(${f.x + dx},${f.y + dy}) rotate(${(i % 2 ? 1 : -1) * spread * 12}) scale(${shrink}) translate(${-f.x},${-f.y})`}
          >
            <g
              transform={`translate(${spread * 1.4},${spread * 1.8})`}
              clipPath={`url(#${id}-${i})`}
            >
              <g clipPath={`url(#${id}-disc)`}>
                <polygon
                  points={f.points}
                  fill="#103844"
                  stroke={energy}
                  strokeWidth="0.65"
                  opacity={spread * 0.8}
                />
              </g>
            </g>
            <g clipPath={`url(#${id}-${i})`}>
              <g clipPath={`url(#${id}-disc)`}>
                <use href={`#${id}-face`} />
                <polygon
                  points={f.points}
                  fill="none"
                  stroke={energy}
                  strokeWidth={p < 0.3 ? 1.4 : 0.7}
                  opacity={Math.min(1, p * 12)}
                />
                {p < 0.22 && (
                  <polygon
                    points={f.points}
                    fill="none"
                    stroke="white"
                    strokeWidth="0.4"
                    opacity={Math.min(1, p * 16)}
                  />
                )}
              </g>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
export const STOCK_BLADE_COLOR = BLADE_CONFIG.color
