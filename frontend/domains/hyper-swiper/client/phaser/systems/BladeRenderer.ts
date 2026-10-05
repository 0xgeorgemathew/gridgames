import { Scene, GameObjects, Geom } from 'phaser'

const BLADE_CONFIG = {
  color: 0x00f3ff,
  // Ribbon dimensions - the "height" of the vertical light wall
  mobileRibbonWidth: 16,
  desktopRibbonWidth: 12,
  // Edge core line intensity
  mobileEdgeWidth: 2,
  desktopEdgeWidth: 1.5,
  // Collision detection width (how wide the slicing hitbox is)
  mobileCollisionWidth: 24,
  desktopCollisionWidth: 18,
} as const

export class BladeRenderer {
  private scene: Scene
  private isMobile: boolean

  private bladePath: Geom.Point[] = []
  private bladeGraphics: GameObjects.Graphics
  private bladeVelocity = { x: 0, y: 0 }
  private lastBladePoint: Geom.Point | null = null
  private reusableBladePoint = new Geom.Point(0, 0)
  private flickerTime = 0

  // Visual trail length (long for dramatic effect)
  private readonly MOBILE_VISUAL_TRAIL = 80
  private readonly DESKTOP_VISUAL_TRAIL = 60
  // Collision trail length (short, only check recent movement)
  private readonly COLLISION_TRAIL_LENGTH = 6

  constructor(scene: Scene, isMobile: boolean) {
    this.scene = scene
    this.isMobile = isMobile
    this.bladeGraphics = scene.add.graphics()
    this.bladeGraphics.setDepth(1000)
  }

  /**
   * Get the current blade path
   */
  getBladePath(): Geom.Point[] {
    return this.bladePath
  }

  /**
   * Get the blade velocity
   */
  getBladeVelocity(): { x: number; y: number } {
    return this.bladeVelocity
  }

  /**
   * Get collision segments for slicing detection.
   * Returns recent segments with edge offsets to allow the ribbon edges to slice.
   * Returns array of line segments as [x1, y1, x2, y2]
   */
  getCollisionSegments(): { x1: number; y1: number; x2: number; y2: number }[] {
    if (this.bladePath.length < 2) return []

    const segments: { x1: number; y1: number; x2: number; y2: number }[] = []
    const collisionWidth = this.isMobile
      ? BLADE_CONFIG.mobileCollisionWidth
      : BLADE_CONFIG.desktopCollisionWidth
    const halfWidth = collisionWidth / 2

    // Get the recent points for collision (last N segments)
    const startIdx = Math.max(0, this.bladePath.length - this.COLLISION_TRAIL_LENGTH)

    for (let i = startIdx; i < this.bladePath.length - 1; i++) {
      const p1 = this.bladePath[i]
      const p2 = this.bladePath[i + 1]

      // Calculate perpendicular offset for ribbon edges
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const px = (-dy / len) * halfWidth
      const py = (dx / len) * halfWidth

      // Center line segment
      segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })

      // Top edge segment
      segments.push({
        x1: p1.x + px,
        y1: p1.y + py,
        x2: p2.x + px,
        y2: p2.y + py,
      })

      // Bottom edge segment
      segments.push({
        x1: p1.x - px,
        y1: p1.y - py,
        x2: p2.x - px,
        y2: p2.y - py,
      })
    }

    return segments
  }

  /**
   * Update blade trail from pointer movement
   */
  updateBladePath(pointerX: number, pointerY: number): void {
    this.reusableBladePoint.x = pointerX
    this.reusableBladePoint.y = pointerY

    if (
      !this.lastBladePoint ||
      this.lastBladePoint.x !== this.reusableBladePoint.x ||
      this.lastBladePoint.y !== this.reusableBladePoint.y
    ) {
      const pathPoint = new Geom.Point(this.reusableBladePoint.x, this.reusableBladePoint.y)
      this.bladePath.push(pathPoint)

      const maxTrailLength = this.isMobile ? this.MOBILE_VISUAL_TRAIL : this.DESKTOP_VISUAL_TRAIL
      if (this.bladePath.length > maxTrailLength) {
        this.bladePath.shift()
      }
      this.lastBladePoint = pathPoint
    }
  }

  /**
   * Clear the blade trail
   */
  clearBladePath(): void {
    this.bladePath = []
    this.lastBladePoint = null
  }

  /**
   * Draw the blade trail - Tron Legacy style light ribbon
   * Features: translucent glass body, bright edge core lines, subtle digital flicker
   */
  draw(): void {
    this.bladeGraphics.clear()
    if (this.bladePath.length < 2) return

    // Update flicker time for digital energy effect
    this.flickerTime += 0.1

    const head = this.bladePath[this.bladePath.length - 1]
    const prev = this.bladePath[this.bladePath.length - 2]
    const dx = head.x - prev.x
    const dy = head.y - prev.y
    const velocity = Math.sqrt(dx * dx + dy * dy) * 60

    this.bladeVelocity.x = dx
    this.bladeVelocity.y = dy

    // High velocity causes ribbon to stretch/lean into curves
    const isHighVelocity = velocity > 400
    const stretchFactor = isHighVelocity ? 1.0 + Math.min(velocity / 2000, 0.4) : 1.0

    // Using SCREEN for webgl-safe additive blending that won't corrupt the alpha channel
    // and turn black on transparent canvas backgrounds like GridScanBackground.
    this.bladeGraphics.setBlendMode(Phaser.BlendModes.SCREEN)

    const ribbonWidth = this.isMobile
      ? BLADE_CONFIG.mobileRibbonWidth
      : BLADE_CONFIG.desktopRibbonWidth
    const edgeWidth = this.isMobile ? BLADE_CONFIG.mobileEdgeWidth : BLADE_CONFIG.desktopEdgeWidth

    // Calculate perpendicular offsets for ribbon edges
    const getPerp = (i: number): { px: number; py: number } => {
      const p1 = this.bladePath[Math.max(0, i - 1)]
      const p2 = this.bladePath[Math.min(this.bladePath.length - 1, i + 1)]
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

    const flickerOffset = this.flickerTime % (Math.PI * 2)
    const flicker = 0.85 + Math.sin(flickerOffset) * 0.15

    for (let i = 0; i < this.bladePath.length; i++) {
      const p = this.bladePath[i]
      const perp = getPerp(i)

      // Taper based on age (position in array)
      const t = i / (this.bladePath.length - 1)

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
    for (let i = 0; i < this.bladePath.length; i++) {
      const p = this.bladePath[i]
      const perp = getPerp(i)
      const t = i / (this.bladePath.length - 1)
      const taper = Math.pow(t, 1.2)
      const currentGlowHW = (ribbonWidth * 2.5 * stretchFactor * taper) / 2
      glowLeft.push({ x: p.x + perp.px * currentGlowHW, y: p.y + perp.py * currentGlowHW })
      glowRight.unshift({ x: p.x - perp.px * currentGlowHW, y: p.y - perp.py * currentGlowHW })
    }

    this.bladeGraphics.fillStyle(BLADE_CONFIG.color, 0.15)
    this.bladeGraphics.fillPoints([...glowLeft, ...glowRight], true, true)

    // === Layer 2: Translucent glass-like ribbon body ===
    this.bladeGraphics.fillStyle(BLADE_CONFIG.color, 0.35 * flicker)
    this.bladeGraphics.fillPoints(ribbonPoly, true, true)

    // === Layer 3: Edge core glows (colored glow focused natively on the edges) ===
    const edgeGlowLeftTop: { x: number; y: number }[] = []
    const edgeGlowRightTop: { x: number; y: number }[] = []
    const edgeGlowLeftBtm: { x: number; y: number }[] = []
    const edgeGlowRightBtm: { x: number; y: number }[] = []

    for (let i = 0; i < this.bladePath.length; i++) {
      const p = this.bladePath[i]
      const perp = getPerp(i)
      const t = i / (this.bladePath.length - 1)
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
    this.bladeGraphics.fillStyle(BLADE_CONFIG.color, 0.5)
    this.bladeGraphics.fillPoints([...edgeGlowLeftTop, ...edgeGlowRightTop], true, true)
    this.bladeGraphics.fillPoints([...edgeGlowLeftBtm, ...edgeGlowRightBtm], true, true)

    // === Layer 4: Crisp white edge cores ===
    this.bladeGraphics.fillStyle(0xffffff, 0.9)
    this.bladeGraphics.fillPoints(topEdgePoly, true, true)
    this.bladeGraphics.fillPoints(btmEdgePoly, true, true)

    // === Layer 5: Head glow - bright point at the current position ===
    const headGlowSize = this.isMobile ? 8 : 6
    this.bladeGraphics.fillStyle(BLADE_CONFIG.color, 0.4)
    this.bladeGraphics.fillCircle(head.x, head.y, headGlowSize * 2)
    this.bladeGraphics.fillStyle(BLADE_CONFIG.color, 0.7)
    this.bladeGraphics.fillCircle(head.x, head.y, headGlowSize)
    this.bladeGraphics.fillStyle(0xffffff, 0.9)
    this.bladeGraphics.fillCircle(head.x, head.y, headGlowSize * 0.4)

    this.bladeGraphics.setDepth(1000)
  }

  /**
   * Destroy the blade renderer
   */
  destroy(): void {
    this.bladeGraphics.destroy()
  }
}
