import type { StockDrop } from '../shared/types'
export function dropPoint(drop: StockDrop, now: number) {
  const progress = Math.max(
    0,
    Math.min(1, (now - drop.spawnedAt) / (drop.expiresAt - drop.spawnedAt))
  )
  return {
    x: Math.max(0.1, Math.min(0.9, drop.lane + drop.drift * progress)),
    y: 1.1 - 3.9 * progress * (1 - progress),
    rotation: drop.rotation * Math.sin(progress * Math.PI),
    progress,
  }
}
export function segmentHitsDisc(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number
) {
  const dx = bx - ax,
    dy = by - ay
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / length)) : 0
  return Math.hypot(cx - ax - t * dx, cy - ay - t * dy) <= radius
}
