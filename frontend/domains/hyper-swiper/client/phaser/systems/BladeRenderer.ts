import * as Phaser from 'phaser'
import { Scene, GameObjects, Geom } from 'phaser'

import { BLADE_CONFIG, tronRibbon } from '@/platform/game-engine/visuals/tron-ribbon'

export class BladeRenderer {
  private scene: Scene
  private isMobile: boolean

  private bladePath: Array<Geom.Point & { time: number }> = []
  private bladeGraphics: GameObjects.Graphics
  private bladeVelocity = { x: 0, y: 0 }
  private lastBladePoint: Geom.Point | null = null
  private reusableBladePoint = new Geom.Point(0, 0)
  private readonly VISUAL_LIFETIME_MS = 180
  private readonly COLLISION_LIFETIME_MS = 70

  // Visual trail length (long for dramatic effect)
  private readonly MOBILE_VISUAL_TRAIL = 24
  private readonly DESKTOP_VISUAL_TRAIL = 20
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
    this.expirePoints(performance.now())
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
    const now = performance.now()
    this.expirePoints(now)
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
      // A new pointer event describes fresh movement even if delivery was slow.
      // Expire the segment by its newest endpoint, not by the previous event.
      if (now - p2.time >= this.COLLISION_LIFETIME_MS) continue

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
    const now = performance.now()
    this.expirePoints(now)
    this.reusableBladePoint.x = pointerX
    this.reusableBladePoint.y = pointerY

    if (
      !this.lastBladePoint ||
      this.lastBladePoint.x !== this.reusableBladePoint.x ||
      this.lastBladePoint.y !== this.reusableBladePoint.y
    ) {
      const pathPoint = Object.assign(
        new Geom.Point(this.reusableBladePoint.x, this.reusableBladePoint.y),
        { time: now }
      )
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
    this.bladeVelocity = { x: 0, y: 0 }
  }

  /**
   * Draw the blade trail - Tron Legacy style light ribbon
   * Features: translucent glass body, bright edge core lines, subtle digital flicker
   */
  draw(): void {
    const now = performance.now()
    this.expirePoints(now)
    this.bladeGraphics.clear()
    if (this.bladePath.length < 2) return

    const ribbon = tronRibbon(this.bladePath, this.isMobile, now * 0.006)
    if (!ribbon) return
    const head = this.bladePath[this.bladePath.length - 1]
    const prev = this.bladePath[this.bladePath.length - 2]
    this.bladeVelocity.x = head.x - prev.x
    this.bladeVelocity.y = head.y - prev.y
    this.bladeGraphics.setBlendMode(Phaser.BlendModes.SCREEN)
    for (const layer of ribbon.layers) {
      this.bladeGraphics.fillStyle(layer.color, layer.opacity)
      this.bladeGraphics.fillPoints(layer.points, true, true)
    }
    for (const [scale, color, alpha] of [
      [2, BLADE_CONFIG.color, 0.4],
      [1, BLADE_CONFIG.color, 0.7],
      [0.4, 0xffffff, 0.9],
    ]) {
      this.bladeGraphics.fillStyle(color, alpha)
      this.bladeGraphics.fillCircle(head.x, head.y, ribbon.headGlowSize * scale)
    }

    this.bladeGraphics.setDepth(1000)
  }

  private expirePoints(now: number): void {
    while (this.bladePath.length && now - this.bladePath[0].time >= this.VISUAL_LIFETIME_MS)
      this.bladePath.shift()
    this.lastBladePoint = this.bladePath.at(-1) ?? null
    if (
      this.bladePath.length < 2 ||
      now - this.bladePath.at(-1)!.time >= this.COLLISION_LIFETIME_MS
    )
      this.bladeVelocity = { x: 0, y: 0 }
  }

  /**
   * Destroy the blade renderer
   */
  destroy(): void {
    this.bladeGraphics.destroy()
  }
}
