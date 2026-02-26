import { Scene } from 'phaser'

export type CardVisualState = 'near_zero' | 'profit' | 'loss' | 'closing' | 'liquidated'

interface CardDimensionsConfig {
  width: number
  height: number
  borderRadius: number
  padding: number
  glowPadding: number
  iconSize: number
  entryFontSize: number
  leverageFontSize: number
  badgeFontSize: number
  pnlFontSize: number
  closeFontSize: number
  gap: number
}

const CARD_DIMS_BY_HEIGHT: Record<number, CardDimensionsConfig> = {
  667: {
    width: 320,
    height: 40,
    borderRadius: 10,
    padding: 6,
    glowPadding: 10,
    iconSize: 22,
    entryFontSize: 12,
    leverageFontSize: 8,
    badgeFontSize: 9,
    pnlFontSize: 12,
    closeFontSize: 16,
    gap: 6,
  },
  736: {
    width: 340,
    height: 44,
    borderRadius: 10,
    padding: 7,
    glowPadding: 10,
    iconSize: 24,
    entryFontSize: 13,
    leverageFontSize: 8,
    badgeFontSize: 9,
    pnlFontSize: 13,
    closeFontSize: 18,
    gap: 7,
  },
  780: {
    width: 360,
    height: 46,
    borderRadius: 11,
    padding: 7,
    glowPadding: 11,
    iconSize: 26,
    entryFontSize: 13,
    leverageFontSize: 8,
    badgeFontSize: 10,
    pnlFontSize: 13,
    closeFontSize: 18,
    gap: 7,
  },
  844: {
    width: 380,
    height: 48,
    borderRadius: 12,
    padding: 8,
    glowPadding: 12,
    iconSize: 28,
    entryFontSize: 14,
    leverageFontSize: 9,
    badgeFontSize: 10,
    pnlFontSize: 14,
    closeFontSize: 20,
    gap: 8,
  },
  852: {
    width: 380,
    height: 48,
    borderRadius: 12,
    padding: 8,
    glowPadding: 12,
    iconSize: 28,
    entryFontSize: 14,
    leverageFontSize: 9,
    badgeFontSize: 10,
    pnlFontSize: 14,
    closeFontSize: 20,
    gap: 8,
  },
  896: {
    width: 380,
    height: 48,
    borderRadius: 12,
    padding: 8,
    glowPadding: 12,
    iconSize: 28,
    entryFontSize: 14,
    leverageFontSize: 9,
    badgeFontSize: 10,
    pnlFontSize: 14,
    closeFontSize: 20,
    gap: 8,
  },
  926: {
    width: 400,
    height: 52,
    borderRadius: 13,
    padding: 8,
    glowPadding: 13,
    iconSize: 30,
    entryFontSize: 15,
    leverageFontSize: 9,
    badgeFontSize: 10,
    pnlFontSize: 15,
    closeFontSize: 22,
    gap: 9,
  },
  932: {
    width: 410,
    height: 54,
    borderRadius: 14,
    padding: 9,
    glowPadding: 14,
    iconSize: 32,
    entryFontSize: 16,
    leverageFontSize: 10,
    badgeFontSize: 11,
    pnlFontSize: 16,
    closeFontSize: 24,
    gap: 10,
  },
}

const BASE_DIMS: CardDimensionsConfig = {
  width: 380,
  height: 48,
  borderRadius: 12,
  padding: 8,
  glowPadding: 12,
  iconSize: 28,
  entryFontSize: 14,
  leverageFontSize: 9,
  badgeFontSize: 10,
  pnlFontSize: 14,
  closeFontSize: 20,
  gap: 8,
}

export function getCardDimensions(): CardDimensionsConfig {
  if (typeof window === 'undefined') return BASE_DIMS
  const height = window.screen.height
  if (height < 667 || height > 932) return BASE_DIMS
  return CARD_DIMS_BY_HEIGHT[height] ?? BASE_DIMS
}

export const CARD_DIMENSIONS = {
  get width() {
    return getCardDimensions().width
  },
  get height() {
    return getCardDimensions().height
  },
  get borderRadius() {
    return getCardDimensions().borderRadius
  },
  get padding() {
    return getCardDimensions().padding
  },
  get glowPadding() {
    return getCardDimensions().glowPadding
  },
  get iconSize() {
    return getCardDimensions().iconSize
  },
  get entryFontSize() {
    return getCardDimensions().entryFontSize
  },
  get leverageFontSize() {
    return getCardDimensions().leverageFontSize
  },
  get badgeFontSize() {
    return getCardDimensions().badgeFontSize
  },
  get pnlFontSize() {
    return getCardDimensions().pnlFontSize
  },
  get closeFontSize() {
    return getCardDimensions().closeFontSize
  },
  get gap() {
    return getCardDimensions().gap
  },
}

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
    const dims = getCardDimensions()
    const { width, height, borderRadius, glowPadding } = dims

    // High resolution for crisp edges
    const scale = 2
    const scaledWidth = width * scale
    const scaledHeight = height * scale
    const scaledRadius = borderRadius * scale
    const scaledGlowPadding = glowPadding * scale

    const textureWidth = scaledWidth + scaledGlowPadding * 2
    const textureHeight = scaledHeight + scaledGlowPadding * 2

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
          scaledGlowPadding - expand,
          scaledGlowPadding - expand,
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
      scaledGlowPadding,
      scaledGlowPadding,
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
      scaledGlowPadding,
      scaledGlowPadding,
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
    const dims = getCardDimensions()
    const size = dims.iconSize
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
