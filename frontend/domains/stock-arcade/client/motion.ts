import { DROP_WINDOW_MS, type StockDrop } from '../shared/types'

export const SLICE_EFFECT_MS = 180
export const discDiameter = (width: number) => Math.max(88, Math.min(112, width * 0.22))
export function dropPoint(drop: StockDrop, now: number) {
  const progress = Math.max(0, Math.min(1, (now - drop.spawnedAt) / DROP_WINDOW_MS))
  return {
    x: drop.lane + drop.drift * progress,
    // Constant gravity and horizontal momentum; cutoff clips a toss, never speeds it up.
    y: 1.14 - (drop.launchVelocity ?? 3.8) * progress + 4.6 * progress * progress,
    rotation: drop.rotation * progress,
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
