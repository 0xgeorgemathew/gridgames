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
/** A compact arcade snap; pending never shows a success mark. Advanced by the
 * existing match clock, with no particle canvas, own RAF or delayed animation. */
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
  const p = Math.max(0, Math.min(1, progress))
  const opacity = 1 - p * p
  const pending = kind === 'pending'
  const positive = kind === 'credited'
  const color = pending ? energy : positive ? '#a3fff1' : '#ff9c45'
  const scale = reducedMotion
    ? 1
    : pending
      ? 1 + Math.sin(p * Math.PI) * 0.055
      : 0.93 + Math.sin(p * Math.PI) * 0.09
  return (
    <div
      className={`ninja-contact ninja-contact-${kind}`}
      data-contact={kind}
      style={{ opacity, transform: `scale(${scale})` }}
    >
      {pending && !reducedMotion && (
        <div className="ninja-contact-disc" style={{ opacity: Math.max(0, 1 - p / 0.8) }}>
          <div style={{ position: 'absolute', inset: 0, transform: `rotate(${rotation}rad)` }}>
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
      )}
      <svg className="ninja-contact-mark" viewBox="-36 -36 72 72" aria-hidden="true">
        <circle
          r={pending ? 29 : 17}
          fill="none"
          stroke={color}
          strokeWidth={pending ? 1.8 : 1}
          opacity={reducedMotion ? 0.8 : 0.9 * (1 - p)}
        />
        {pending ? (
          <g transform={`rotate(${(angle * 180) / Math.PI})`}>
            <path
              d="M-26 0h52"
              fill="none"
              stroke="#ffffff"
              strokeWidth={reducedMotion ? 0.65 : 1.2}
              opacity={Math.max(0, 1 - p * 3)}
            />
            <path
              d="M-23 -4h10m26 8h10"
              stroke={energy}
              strokeWidth="1"
              fill="none"
              opacity={1 - p}
            />
          </g>
        ) : (
          <path
            d={positive ? 'M-7 0l5 5 9-10' : 'M-5-5l10 10m0-10L-5 5'}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}
export const STOCK_BLADE_COLOR = BLADE_CONFIG.color
