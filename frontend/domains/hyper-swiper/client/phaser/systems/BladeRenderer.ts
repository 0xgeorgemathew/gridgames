import * as Phaser from 'phaser'
import { Scene, GameObjects, Geom } from 'phaser'

import { BLADE_CONFIG, tronRibbon } from '@/platform/game-engine/visuals/tron-ribbon'

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

    const ribbon = tronRibbon(this.bladePath, this.isMobile, this.flickerTime)
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

  /**
   * Destroy the blade renderer
   */
  destroy(): void {
    this.bladeGraphics.destroy()
  }
}
