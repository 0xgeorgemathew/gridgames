export const DEREZ_MS = 520
export const FRACTURE_MS = 90
const clamp = (value: number) => Math.max(0, Math.min(1, value))

export interface DeRezCell {
  x: number
  y: number
  cx: number
  cy: number
  width: number
  height: number
  hash: number
  children: readonly DeRezCell[]
}
// Build the nested footprint once. Subdivision reuses these cells without per-frame
// grid allocation; each child starts exactly inside its moving parent.
function cell(x: number, y: number, width: number, height: number): DeRezCell {
  const cx = x + width / 2,
    cy = y + height / 2
  const children: DeRezCell[] = []
  if (width > 4) {
    for (let row = 0; row < 2; row++)
      for (let column = 0; column < 2; column++) {
        const child = cell(x + (column * width) / 2, y + (row * height) / 2, width / 2, height / 2)
        if (
          child.children.length ||
          Math.hypot(
            Math.max(0, Math.abs(child.cx) - child.width / 2),
            Math.max(0, Math.abs(child.cy) - child.height / 2)
          ) <= 29
        )
          children.push(child)
      }
  }
  return {
    x,
    y,
    cx,
    cy,
    width,
    height,
    hash: ((Math.round(cx + 32) * 17 + Math.round(cy + 32) * 31) % 23) / 22,
    children,
  }
}
export const DEREZ_CELLS: readonly DeRezCell[] = Array.from({ length: 8 }, (_, i) =>
  cell(-32 + (i % 4) * 16, -32 + Math.floor(i / 4) * 32, 16, 32)
)

/** Continuous nested subdivision: no clock waits, delayed cells or phase resets.
 * Fine cells shrink from their first frame; all displacement stays local. */
export function deRezMotion(elapsed: number) {
  const coarse = clamp((elapsed - FRACTURE_MS) / 120)
  const medium = clamp((elapsed - 210) / 130)
  const fine = clamp((elapsed - 340) / (DEREZ_MS - 340))
  return {
    stage: elapsed < FRACTURE_MS ? 'fracture' : elapsed < 210 ? '1' : elapsed < 340 ? '2' : '3',
    fracture: clamp(elapsed / FRACTURE_MS),
    coarse,
    medium,
    fine,
    fineCurve: fine * (1 - fine),
    energy: Math.min(1, fine * 4),
  }
}

/** Match SVG xMidYMid meet inside the original circular logo chamber. */
export function deRezLogoRect(width: number, height: number) {
  const fit = Math.min(22.6 / width, 22.6 / height)
  return {
    x: (-width * fit) / 2,
    y: -4.3 - (height * fit) / 2,
    width: width * fit,
    height: height * fit,
  }
}
