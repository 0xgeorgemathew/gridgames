import { Scene } from 'phaser'
import type { CoinType } from '@/domains/hyper-swiper/shared/trading.types'

/**
 * Coin configuration for visual rendering
 * Tron Legacy-inspired solid discs with neon rims
 * Clean, minimal, high-contrast design
 */
export const COIN_CONFIG = {
  long: {
    color: 0x00ffaa, // Bright cyan-green neon
    glowColor: 0x00ffcc, // Luminous glow
    darkCore: 0x001a12, // Very dark teal core
    edgeColor: 0x00ff88, // Sharp neon edge
    radius: 15.4, // 10% bigger (14 * 1.1)
    hitboxMultiplier: 1.4,
    symbol: 'long',
    label: 'LONG',
  },
  short: {
    color: 0xff2266, // Hot pink-red neon
    glowColor: 0xff4488, // Luminous glow
    darkCore: 0x1a0812, // Very dark magenta core
    edgeColor: 0xff6699, // Sharp neon edge
    radius: 15.4, // 10% bigger (14 * 1.1)
    hitboxMultiplier: 1.4,
    symbol: 'short',
    label: 'SHORT',
  },
} as const

export class CoinRenderer {
  private scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  /**
   * Draw a chevron pointing up (like » rotated -90 degrees)
   */
  private drawChevronUp(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number,
    fill: boolean = true
  ): void {
    const halfSize = size / 2
    const thickness = size * 0.3

    graphics.beginPath()
    graphics.moveTo(cx - halfSize, cy - thickness / 2)
    graphics.lineTo(cx, cy - halfSize)
    graphics.lineTo(cx + halfSize, cy - thickness / 2)
    graphics.lineTo(cx + halfSize, cy + thickness / 2)
    graphics.lineTo(cx, cy)
    graphics.lineTo(cx - halfSize, cy + thickness / 2)
    graphics.closePath()

    if (fill) {
      graphics.fillPath()
    } else {
      graphics.strokePath()
    }
  }

  /**
   * Draw a chevron pointing down (like » rotated 90 degrees)
   */
  private drawChevronDown(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number,
    fill: boolean = true
  ): void {
    const halfSize = size / 2
    const thickness = size * 0.3

    graphics.beginPath()
    graphics.moveTo(cx - halfSize, cy - thickness / 2)
    graphics.lineTo(cx, cy)
    graphics.lineTo(cx + halfSize, cy - thickness / 2)
    graphics.lineTo(cx + halfSize, cy + thickness / 2)
    graphics.lineTo(cx, cy + halfSize)
    graphics.lineTo(cx - halfSize, cy + thickness / 2)
    graphics.closePath()

    if (fill) {
      graphics.fillPath()
    } else {
      graphics.strokePath()
    }
  }

  /**
   * Generate all cached coin textures
   * Tron Legacy aesthetic - clean and minimal:
   * - Solid opaque dark discs
   * - Refined multi-layer neon edge
   * - Single glowing chevron
   */
  generateCachedTextures(): void {
    const textureKeys: Array<CoinType> = ['long', 'short']

    textureKeys.forEach((type) => {
      const config = COIN_CONFIG[type]

      // High resolution for crisp edges
      const scale = 4
      const paddedRadius = config.radius + 6 // Extra padding for outer glow
      const diameter = paddedRadius * 2 * scale

      const container = this.scene.add.container(0, 0)
      const graphics = this.scene.add.graphics()
      const scaledRadius = config.radius * scale

      // =========================================================================
      // LAYER 1: OUTER NEON HALO (The iconic Tron glow)
      // =========================================================================
      const haloSteps = 14
      for (let i = haloSteps; i > 0; i--) {
        const t = i / haloSteps
        const r = scaledRadius * (1.0 + t * 0.35)
        const opacity = 0.07 * Math.pow(1 - t, 2)
        graphics.fillStyle(config.glowColor, opacity)
        graphics.fillCircle(0, 0, r)
      }

      // =========================================================================
      // LAYER 2: SOLID DARK CORE (The opaque disc body)
      // =========================================================================
      graphics.fillStyle(config.darkCore, 1.0)
      graphics.fillCircle(0, 0, scaledRadius)

      container.add(graphics)

      // =========================================================================
      // LAYER 3: REFINED EDGE SYSTEM (Multi-layer for crisp definition)
      // =========================================================================
      const edge = this.scene.add.graphics()

      // Inner dark ring (creates depth/separation from core)
      edge.lineStyle(1.5 * scale, config.darkCore, 1.0)
      edge.strokeCircle(0, 0, scaledRadius - 3 * scale)

      // Primary neon ring (main glow)
      edge.lineStyle(2.5 * scale, config.color, 1.0)
      edge.strokeCircle(0, 0, scaledRadius - 1.8 * scale)

      // Outer accent ring (subtle color boost)
      edge.lineStyle(1.2 * scale, config.edgeColor, 0.8)
      edge.strokeCircle(0, 0, scaledRadius - 0.8 * scale)

      // Crisp white outer highlight (defines the absolute edge)
      edge.lineStyle(0.6 * scale, 0xffffff, 0.6)
      edge.strokeCircle(0, 0, scaledRadius - 0.2 * scale)

      container.add(edge)

      // =========================================================================
      // LAYER 4: CHEVRON (Drawn with graphics, not text)
      // =========================================================================
      const chevronSize = scaledRadius * 0.55
      const chevron = this.scene.add.graphics()

      // Outer glow chevron
      chevron.fillStyle(config.glowColor, 0.3)
      if (type === 'long') {
        this.drawChevronUp(chevron, 0, 0, chevronSize * 1.15)
      } else {
        this.drawChevronDown(chevron, 0, 0, chevronSize * 1.15)
      }

      // Main white chevron
      chevron.fillStyle(0xffffff, 0.95)
      if (type === 'long') {
        this.drawChevronUp(chevron, 0, 0, chevronSize)
      } else {
        this.drawChevronDown(chevron, 0, 0, chevronSize)
      }

      container.add(chevron)

      // =========================================================================
      // GENERATE TEXTURE FROM CONTAINER
      // =========================================================================
      const renderTexture = this.scene.make.renderTexture(
        { width: diameter, height: diameter },
        false
      )
      renderTexture.draw(container, diameter / 2, diameter / 2)
      renderTexture.saveTexture(`texture_${type}`)

      this.scene.textures.get(`texture_${type}`).setFilter(Phaser.Textures.FilterMode.LINEAR)

      renderTexture.destroy()
      container.destroy()
    })
  }
}
