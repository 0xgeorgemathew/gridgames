export const DEREZ_MS = 520
export const FRACTURE_MS = 90

/** Successive subdivision of the same disc footprint, never falling particles.
 * Fragment centers stay local; disappearance is geometric shrink, not a fade. */
export function deRezFragments(elapsed: number) {
  const stage = elapsed < 210 ? 1 : elapsed < 340 ? 2 : 3
  const columns = stage === 1 ? 4 : stage === 2 ? 8 : 16
  const rows = columns / 2
  const cellWidth = 64 / columns
  const cellHeight = 64 / rows
  const phase = Math.max(0, Math.min(1, (elapsed - 340) / (DEREZ_MS - 340)))
  const expansion = Math.max(0, Math.min(1, (elapsed - FRACTURE_MS) / 250))
  const cells = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = -32 + column * cellWidth
      const y = -32 + row * cellHeight
      const cx = x + cellWidth / 2
      const cy = y + cellHeight / 2
      // Keep cells that intersect the real disc, including edge rim/glow.
      if (
        Math.hypot(
          Math.max(0, Math.abs(cx) - cellWidth / 2),
          Math.max(0, Math.abs(cy) - cellHeight / 2)
        ) > 29
      )
        continue
      const hash = ((column * 17 + row * 31) % 23) / 22
      const collapse = stage === 3 ? Math.max(0, Math.min(1, (phase - hash * 0.38) / 0.62)) : 0
      const scale = (stage === 1 ? 0.92 : stage === 2 ? 0.78 : 0.68) * (1 - collapse)
      if (scale <= 0) continue
      cells.push({
        x,
        y,
        cx,
        cy,
        width: cellWidth,
        height: cellHeight,
        dx: cx * expansion * 0.075,
        dy: (cy < 0 ? -3 : 3) + cy * expansion * 0.075,
        rotation: (hash - 0.5) * expansion * 8,
        scale,
        energy: stage === 3 ? Math.min(1, phase * 4) : 0,
      })
    }
  }
  return { stage, cells }
}
