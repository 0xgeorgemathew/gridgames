import { useId } from 'react'
import { deRezFragments, DEREZ_MS, FRACTURE_MS } from './derez-motion'
import { stockAsset } from '../shared/assets'
import type { ContactKind } from './contact-feedback'
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
/** Cut -> subdivide the original disc -> smaller fragments -> collapsing pixels.
 * Match-clock driven, localized, with no gravity or authoritative outcome mark. */
export function StockContact({
  progress,
  kind,
  symbol,
  rotation = 0,
  angle = 0,
  reducedMotion = false,
}: {
  progress: number
  kind: ContactKind
  symbol: string
  rotation?: number
  angle?: number
  reducedMotion?: boolean
}) {
  const id = useId().replaceAll(':', '')
  if (kind !== 'pending') return null
  const p = Math.max(0, Math.min(1, progress))
  const elapsed = p * DEREZ_MS
  const separation = Math.min(1, elapsed / FRACTURE_MS)
  const fragments = deRezFragments(elapsed)
  const degrees = (angle * 180) / Math.PI
  return (
    <div
      className="ninja-contact ninja-contact-pending"
      data-contact="pending"
      data-derez-stage={
        reducedMotion ? 'reduced' : elapsed < FRACTURE_MS ? 'fracture' : fragments.stage
      }
    >
      {!reducedMotion &&
        elapsed < FRACTURE_MS &&
        [-1, 1].map((side) => (
          <div key={side} className="ninja-slice-axis" style={{ transform: `rotate(${angle}rad)` }}>
            <div
              className="ninja-slice-half"
              style={{
                clipPath:
                  side < 0
                    ? 'polygon(0 0,100% 0,100% 50%,0 50%)'
                    : 'polygon(0 50%,100% 50%,100% 100%,0 100%)',
                transform: `translate(${side * separation * 1}%,${side * separation * 5}%) rotate(${side * separation * 0.03}rad)`,
              }}
            >
              <div className="ninja-contact-disc" style={{ transform: `rotate(${-angle}rad)` }}>
                <div
                  style={{ position: 'absolute', inset: 0, transform: `rotate(${rotation}rad)` }}
                >
                  <StockDiscRim />
                </div>
                <span className="arcade-disc-face">
                  <span className="ninja-disc-logo">
                    <img src={stockAsset(symbol)!.logo} alt="" />
                  </span>
                  <span className="ninja-disc-label">
                    <span className="ninja-disc-symbol">{symbol}</span>
                  </span>
                </span>
              </div>
              <svg className="ninja-contact-mark" viewBox="-36 -36 72 72" aria-hidden="true">
                <path d="M-25 0H25" stroke={energy} strokeWidth="2" opacity={1} />
              </svg>
            </div>
          </div>
        ))}
      {!reducedMotion && elapsed >= FRACTURE_MS && (
        <svg className="ninja-contact-mark" viewBox="-36 -36 72 72" aria-hidden="true">
          <defs>
            <radialGradient id={`${id}-chamber`} cx="35%" cy="25%">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#e7edf0" />
            </radialGradient>
            <g id={`${id}-disc`}>
              <g transform={`scale(0.9083) rotate(${(rotation * 180) / Math.PI})`}>
                <DiscArtwork />
              </g>
              <circle cy="-4.3" r="14.5" fill={`url(#${id}-chamber)`} />
              <image
                href={stockAsset(symbol)!.logo}
                x="-11.3"
                y="-15.6"
                width="22.6"
                height="22.6"
                preserveAspectRatio="xMidYMid meet"
              />
              <text
                y="16.5"
                fill="#ffffff"
                textAnchor="middle"
                fontFamily="var(--font-orbitron)"
                fontSize="5.8"
                fontWeight="800"
              >
                {symbol}
              </text>
            </g>
            {fragments.cells.map((cell, i) => (
              <clipPath key={i} id={`${id}-cell-${i}`}>
                <rect x={cell.x} y={cell.y} width={cell.width} height={cell.height} />
              </clipPath>
            ))}
          </defs>
          <g transform={`rotate(${degrees})`}>
            {fragments.cells.map((cell, i) => (
              <g
                key={`${fragments.stage}-${i}`}
                transform={`translate(${cell.cx + cell.dx} ${cell.cy + cell.dy}) rotate(${cell.rotation}) scale(${cell.scale}) translate(${-cell.cx} ${-cell.cy})`}
              >
                <g clipPath={`url(#${id}-cell-${i})`}>
                  <use
                    href={`#${id}-disc`}
                    transform={`rotate(${-degrees})`}
                    opacity={1 - cell.energy}
                  />
                  <rect
                    x={cell.x}
                    y={cell.y}
                    width={cell.width}
                    height={cell.height}
                    fill={energy}
                    opacity={cell.energy}
                  />
                  <rect
                    x={cell.x}
                    y={cell.y}
                    width={cell.width}
                    height={cell.height}
                    fill="none"
                    stroke={energy}
                    strokeWidth="0.55"
                    opacity="0.8"
                  />
                </g>
              </g>
            ))}
          </g>
        </svg>
      )}
      <svg className="ninja-contact-mark" viewBox="-36 -36 72 72" aria-hidden="true">
        {reducedMotion ? (
          <circle r="27" fill="none" stroke={energy} strokeWidth="2" opacity={1 - p} />
        ) : (
          <g
            transform={`rotate(${(angle * 180) / Math.PI})`}
            opacity={Math.max(0, 1 - elapsed / 90)}
          >
            <path d="M-30 0H30" stroke={energy} strokeWidth="4" opacity="0.6" />
            <path d="M-30 0H30" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  )
}
export const STOCK_BLADE_COLOR = BLADE_CONFIG.color
