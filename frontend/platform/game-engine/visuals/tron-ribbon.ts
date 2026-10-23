export const BLADE_CONFIG = {
  color: 0x00f3ff,
  // Ribbon dimensions - the "height" of the vertical light wall
  mobileRibbonWidth: 10,
  desktopRibbonWidth: 8,
  // Edge core line intensity
  mobileEdgeWidth: 2,
  desktopEdgeWidth: 1.5,
  // Collision detection width (how wide the slicing hitbox is)
  mobileCollisionWidth: 24,
  desktopCollisionWidth: 18,
} as const

export interface RibbonPoint {
  x: number
  y: number
}
export function tronRibbon(points: readonly RibbonPoint[], isMobile: boolean, phase: number) {
  const layers: Array<{ color: number; opacity: number; points: RibbonPoint[] }> = []
  if (points.length < 2) return null
  const head = points[points.length - 1]
  const prev = points[points.length - 2]
  const dx = head.x - prev.x
  const dy = head.y - prev.y
  const velocity = Math.sqrt(dx * dx + dy * dy) * 60

  // High velocity causes ribbon to stretch/lean into curves
  const isHighVelocity = velocity > 400
  const stretchFactor = isHighVelocity ? 1.0 + Math.min(velocity / 2000, 0.4) : 1.0

  // Using SCREEN for webgl-safe additive blending that won't corrupt the alpha channel
  // and turn black on transparent canvas backgrounds like GridScanBackground.

  const ribbonWidth = isMobile ? BLADE_CONFIG.mobileRibbonWidth : BLADE_CONFIG.desktopRibbonWidth
  const edgeWidth = isMobile ? BLADE_CONFIG.mobileEdgeWidth : BLADE_CONFIG.desktopEdgeWidth

  // Calculate perpendicular offsets for ribbon edges
  const getPerp = (i: number): { px: number; py: number } => {
    const p1 = points[Math.max(0, i - 1)]
    const p2 = points[Math.min(points.length - 1, i + 1)]
    const tdx = p2.x - p1.x
    const tdy = p2.y - p1.y
    const len = Math.sqrt(tdx * tdx + tdy * tdy) || 1
    return { px: -tdy / len, py: tdx / len }
  }

  // Build perfect ribbons (single polygons!)
  // This fixes circle edge overlap artifacts seamlessly.
  const ribbonLeft: { x: number; y: number }[] = []
  const ribbonRight: { x: number; y: number }[] = []

  // Core edges as filled shapes that naturally taper to zero width (which visually simulates alpha fading)
  const topEdgeLeft: { x: number; y: number }[] = []
  const topEdgeRight: { x: number; y: number }[] = []
  const btmEdgeLeft: { x: number; y: number }[] = []
  const btmEdgeRight: { x: number; y: number }[] = []

  const flickerOffset = phase % (Math.PI * 2)
  const flicker = 0.85 + Math.sin(flickerOffset) * 0.15

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const perp = getPerp(i)

    // Taper based on age (position in array)
    const t = i / (points.length - 1)

    // Exponent sets how aggressive the taper is. 1.2 is a nice smooth curve.
    const taper = Math.pow(t, 1.2)

    const currentRibbonHW = (ribbonWidth * stretchFactor * taper) / 2

    ribbonLeft.push({ x: p.x + perp.px * currentRibbonHW, y: p.y + perp.py * currentRibbonHW })
    ribbonRight.unshift({
      x: p.x - perp.px * currentRibbonHW,
      y: p.y - perp.py * currentRibbonHW,
    })

    // Tapering the edge core lines gives them a visual fade effect without requiring segmented alpha overlapping
    const currentEdgeW = edgeWidth * stretchFactor * taper

    topEdgeLeft.push({
      x: p.x + perp.px * (currentRibbonHW + currentEdgeW / 2),
      y: p.y + perp.py * (currentRibbonHW + currentEdgeW / 2),
    })
    topEdgeRight.unshift({
      x: p.x + perp.px * (currentRibbonHW - currentEdgeW / 2),
      y: p.y + perp.py * (currentRibbonHW - currentEdgeW / 2),
    })

    btmEdgeLeft.push({
      x: p.x - perp.px * (currentRibbonHW - currentEdgeW / 2),
      y: p.y - perp.py * (currentRibbonHW - currentEdgeW / 2),
    })
    btmEdgeRight.unshift({
      x: p.x - perp.px * (currentRibbonHW + currentEdgeW / 2),
      y: p.y - perp.py * (currentRibbonHW + currentEdgeW / 2),
    })
  }

  const ribbonPoly = [...ribbonLeft, ...ribbonRight]
  const topEdgePoly = [...topEdgeLeft, ...topEdgeRight]
  const btmEdgePoly = [...btmEdgeLeft, ...btmEdgeRight]

  // === Layer 1: Outer ambient glow ===
  const glowLeft: { x: number; y: number }[] = []
  const glowRight: { x: number; y: number }[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const perp = getPerp(i)
    const t = i / (points.length - 1)
    const taper = Math.pow(t, 1.2)
    const currentGlowHW = (ribbonWidth * 2.5 * stretchFactor * taper) / 2
    glowLeft.push({ x: p.x + perp.px * currentGlowHW, y: p.y + perp.py * currentGlowHW })
    glowRight.unshift({ x: p.x - perp.px * currentGlowHW, y: p.y - perp.py * currentGlowHW })
  }

  layers.push({ color: BLADE_CONFIG.color, opacity: 0.15, points: [...glowLeft, ...glowRight] })

  // === Layer 2: Translucent glass-like ribbon body ===
  layers.push({ color: BLADE_CONFIG.color, opacity: 0.35 * flicker, points: ribbonPoly })

  // === Layer 3: Edge core glows (colored glow focused natively on the edges) ===
  const edgeGlowLeftTop: { x: number; y: number }[] = []
  const edgeGlowRightTop: { x: number; y: number }[] = []
  const edgeGlowLeftBtm: { x: number; y: number }[] = []
  const edgeGlowRightBtm: { x: number; y: number }[] = []

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const perp = getPerp(i)
    const t = i / (points.length - 1)
    const taper = Math.pow(t, 1.2)
    const currentRibbonHW = (ribbonWidth * stretchFactor * taper) / 2
    const currentGlowW = edgeWidth * 3 * stretchFactor * taper

    edgeGlowLeftTop.push({
      x: p.x + perp.px * (currentRibbonHW + currentGlowW / 2),
      y: p.y + perp.py * (currentRibbonHW + currentGlowW / 2),
    })
    edgeGlowRightTop.unshift({
      x: p.x + perp.px * (currentRibbonHW - currentGlowW / 2),
      y: p.y + perp.py * (currentRibbonHW - currentGlowW / 2),
    })

    edgeGlowLeftBtm.push({
      x: p.x - perp.px * (currentRibbonHW - currentGlowW / 2),
      y: p.y - perp.py * (currentRibbonHW - currentGlowW / 2),
    })
    edgeGlowRightBtm.unshift({
      x: p.x - perp.px * (currentRibbonHW + currentGlowW / 2),
      y: p.y - perp.py * (currentRibbonHW + currentGlowW / 2),
    })
  }
  layers.push({
    color: BLADE_CONFIG.color,
    opacity: 0.5,
    points: [...edgeGlowLeftTop, ...edgeGlowRightTop],
  })
  layers.push({
    color: BLADE_CONFIG.color,
    opacity: 0.5,
    points: [...edgeGlowLeftBtm, ...edgeGlowRightBtm],
  })

  // === Layer 4: Crisp white edge cores ===
  layers.push({ color: 0xffffff, opacity: 0.9, points: topEdgePoly })
  layers.push({ color: 0xffffff, opacity: 0.9, points: btmEdgePoly })

  // === Layer 5: Head glow - bright point at the current position ===
  const headGlowSize = isMobile ? 8 : 6

  return { layers, head, headGlowSize }
}
