import { Scene } from 'phaser'

/**
 * Position card visual states
 */
export type CardVisualState = 'near_zero' | 'profit' | 'loss' | 'closing' | 'liquidated'

/**
 * Card color configuration for each visual state
 */
export const CARD_COLORS = {
  near_zero: {
    borderColor: 0x00f3ff, // Tron cyan
    borderAlpha: 0.3,
    glowColor: 0x00f3ff,
    glowAlpha: 0,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  profit: {
    borderColor: 0x4ade80, // Green-400
    borderAlpha: 0.6,
    glowColor: 0x4ade80,
    glowAlpha: 0.35,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  loss: {
    borderColor: 0xf87171, // Red-400
    borderAlpha: 0.6,
    glowColor: 0xf87171,
    glowAlpha: 0.35,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  closing: {
    borderColor: 0x00f3ff, // Tron cyan
    borderAlpha: 0.6,
    glowColor: 0x00f3ff,
    glowAlpha: 0.4,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  liquidated: {
    borderColor: 0xf87171, // Red-400
    borderAlpha: 0.8,
    glowColor: 0xf87171,
    glowAlpha: 0.5,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
} as const

/**
 * Glow padding applied to each side of the card (in pixels)
 */
export const GLOW_PADDING = 12

/**
 * Card dimensions (single-row layout)
 */
export const CARD_DIMENSIONS = {
  width: 380, // Extra wide for comfortable single-row layout
  height: 48, // Compact height for single row
  borderRadius: 12,
  padding: 8,
  glowPadding: GLOW_PADDING,
} as const

export class PositionCardRenderer {
  private scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  /**
   * Draw a rounded rectangle
   */
  private drawRoundedRect(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean = true
  ): void {
    graphics.beginPath()
    graphics.moveTo(x + radius, y)
    graphics.lineTo(x + width - radius, y)
    graphics.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false)
    graphics.lineTo(x + width, y + height - radius)
    graphics.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false)
    graphics.lineTo(x + radius, y + height)
    graphics.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false)
    graphics.lineTo(x, y + radius)
    graphics.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2, false)
    graphics.closePath()

    if (fill) {
      graphics.fillPath()
    } else {
      graphics.strokePath()
    }
  }

  /**
   * Draw an equilateral triangle pointing up
   */
  private drawTriangleUp(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number
  ): void {
    const height = (size * Math.sqrt(3)) / 2
    graphics.beginPath()
    graphics.moveTo(cx, cy - height * 0.6)
    graphics.lineTo(cx - size / 2, cy + height * 0.4)
    graphics.lineTo(cx + size / 2, cy + height * 0.4)
    graphics.closePath()
    graphics.fillPath()
  }

  /**
   * Draw an equilateral triangle pointing down
   */
  private drawTriangleDown(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number
  ): void {
    const height = (size * Math.sqrt(3)) / 2
    graphics.beginPath()
    graphics.moveTo(cx - size / 2, cy - height * 0.4)
    graphics.lineTo(cx + size / 2, cy - height * 0.4)
    graphics.lineTo(cx, cy + height * 0.6)
    graphics.closePath()
    graphics.fillPath()
  }

  /**
   * Generate all cached card textures
   */
  generateCachedTextures(): void {
    const states: Array<CardVisualState> = ['near_zero', 'profit', 'loss', 'closing', 'liquidated']

    states.forEach((state) => {
      this.generateCardTexture(state)
    })

    // Also generate direction indicator textures
    this.generateDirectionIndicators()
  }

  /**
   * Generate a card background texture for a specific state
   */
  private generateCardTexture(state: CardVisualState): void {
    const colors = CARD_COLORS[state]
    const { width, height, borderRadius } = CARD_DIMENSIONS

    // High resolution for crisp edges
    const scale = 2
    const scaledWidth = width * scale
    const scaledHeight = height * scale
    const scaledRadius = borderRadius * scale

    // Extra padding for glow
    const glowPadding = 12 * scale
    const textureWidth = scaledWidth + glowPadding * 2
    const textureHeight = scaledHeight + glowPadding * 2

    const container = this.scene.add.container(0, 0)
    const graphics = this.scene.add.graphics()

    // =========================================================================
    // LAYER 1: OUTER GLOW (for profit/loss/closing/liquidated states)
    // =========================================================================
    if (colors.glowAlpha > 0) {
      const glowSteps = 8
      for (let i = glowSteps; i > 0; i--) {
        const t = i / glowSteps
        const expand = t * 8 * scale
        const opacity = colors.glowAlpha * Math.pow(1 - t, 2)
        graphics.fillStyle(colors.glowColor, opacity)
        this.drawRoundedRect(
          graphics,
          glowPadding - expand,
          glowPadding - expand,
          scaledWidth + expand * 2,
          scaledHeight + expand * 2,
          scaledRadius + expand,
          true
        )
      }
    }

    // =========================================================================
    // LAYER 2: BACKGROUND
    // =========================================================================
    graphics.fillStyle(colors.background, colors.backgroundAlpha)
    this.drawRoundedRect(
      graphics,
      glowPadding,
      glowPadding,
      scaledWidth,
      scaledHeight,
      scaledRadius,
      true
    )

    container.add(graphics)

    // =========================================================================
    // LAYER 3: BORDER
    // =========================================================================
    const border = this.scene.add.graphics()
    border.lineStyle(2 * scale, colors.borderColor, colors.borderAlpha)
    this.drawRoundedRect(
      border,
      glowPadding,
      glowPadding,
      scaledWidth,
      scaledHeight,
      scaledRadius,
      false
    )

    container.add(border)

    // =========================================================================
    // GENERATE TEXTURE
    // =========================================================================
    const textureKey = `card_${state}`
    const renderTexture = this.scene.make.renderTexture(
      { width: textureWidth, height: textureHeight },
      false
    )
    renderTexture.draw(container, 0, 0)
    renderTexture.saveTexture(textureKey)

    this.scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR)

    renderTexture.destroy()
    container.destroy()
  }

  /**
   * Generate direction indicator textures (up/down triangles)
   */
  private generateDirectionIndicators(): void {
    const size = 24
    const scale = 2
    const scaledSize = size * scale

    // Remove existing textures if they exist (to regenerate after code changes)
    if (this.scene.textures.exists('indicator_long')) {
      this.scene.textures.remove('indicator_long')
    }
    if (this.scene.textures.exists('indicator_short')) {
      this.scene.textures.remove('indicator_short')
    }

    // LONG indicator (green, up triangle)
    const longContainer = this.scene.add.container(0, 0)
    const longBg = this.scene.add.graphics()
    longBg.fillStyle(0x4ade80, 0.2) // Green with low opacity
    longBg.fillRoundedRect(0, 0, scaledSize, scaledSize, 4 * scale)
    longContainer.add(longBg)

    const longTriangle = this.scene.add.graphics()
    longTriangle.fillStyle(0x4ade80, 1) // Green
    this.drawTriangleUp(longTriangle, scaledSize / 2, scaledSize / 2, scaledSize * 0.5)
    longContainer.add(longTriangle)

    let renderTexture = this.scene.make.renderTexture(
      { width: scaledSize, height: scaledSize },
      false
    )
    // Draw container at (0, 0) - the graphics are already positioned correctly within the container
    renderTexture.draw(longContainer, 0, 0)
    renderTexture.saveTexture('indicator_long')
    this.scene.textures.get('indicator_long').setFilter(Phaser.Textures.FilterMode.LINEAR)
    renderTexture.destroy()
    longContainer.destroy()

    // SHORT indicator (red, down triangle)
    const shortContainer = this.scene.add.container(0, 0)
    const shortBg = this.scene.add.graphics()
    shortBg.fillStyle(0xf87171, 0.2) // Red with low opacity
    shortBg.fillRoundedRect(0, 0, scaledSize, scaledSize, 4 * scale)
    shortContainer.add(shortBg)

    const shortTriangle = this.scene.add.graphics()
    shortTriangle.fillStyle(0xf87171, 1) // Red
    this.drawTriangleDown(shortTriangle, scaledSize / 2, scaledSize / 2, scaledSize * 0.5)
    shortContainer.add(shortTriangle)

    renderTexture = this.scene.make.renderTexture({ width: scaledSize, height: scaledSize }, false)
    // Draw container at (0, 0) - the graphics are already positioned correctly within the container
    renderTexture.draw(shortContainer, 0, 0)
    renderTexture.saveTexture('indicator_short')
    this.scene.textures.get('indicator_short').setFilter(Phaser.Textures.FilterMode.LINEAR)
    renderTexture.destroy()
    shortContainer.destroy()
  }
}
