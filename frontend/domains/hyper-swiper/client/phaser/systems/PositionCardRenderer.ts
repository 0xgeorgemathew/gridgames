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
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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
    borderRadius: 0,
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
  borderRadius: 0,
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
  if (typeof window === 'undefined') {
    return { ...BASE_DIMS, borderRadius: BASE_DIMS.height / 2 }
  }
  const height = window.screen.height
  const dims = height < 667 || height > 932 ? BASE_DIMS : (CARD_DIMS_BY_HEIGHT[height] ?? BASE_DIMS)
  return { ...dims, borderRadius: dims.height / 2 }
}

interface CompactCardDimensionsConfig {
  width: number
  height: number
  borderRadius: number
  padding: number
  glowPadding: number
  iconSize: number
  fontSize: number
  buttonFontSize: number
  gap: number
}

const COMPACT_DIMS_BY_HEIGHT: Record<number, CompactCardDimensionsConfig> = {
  667: {
    width: 70,
    height: 36,
    borderRadius: 0,
    padding: 6,
    glowPadding: 8,
    iconSize: 20,
    fontSize: 11,
    buttonFontSize: 12,
    gap: 4,
  },
  736: {
    width: 76,
    height: 38,
    borderRadius: 0,
    padding: 6,
    glowPadding: 8,
    iconSize: 22,
    fontSize: 12,
    buttonFontSize: 14,
    gap: 5,
  },
  780: {
    width: 82,
    height: 40,
    borderRadius: 0,
    padding: 7,
    glowPadding: 9,
    iconSize: 24,
    fontSize: 12,
    buttonFontSize: 14,
    gap: 5,
  },
  844: {
    width: 88,
    height: 42,
    borderRadius: 0,
    padding: 7,
    glowPadding: 10,
    iconSize: 26,
    fontSize: 13,
    buttonFontSize: 15,
    gap: 6,
  },
  852: {
    width: 88,
    height: 42,
    borderRadius: 0,
    padding: 7,
    glowPadding: 10,
    iconSize: 26,
    fontSize: 13,
    buttonFontSize: 15,
    gap: 6,
  },
  896: {
    width: 88,
    height: 42,
    borderRadius: 0,
    padding: 7,
    glowPadding: 10,
    iconSize: 26,
    fontSize: 13,
    buttonFontSize: 15,
    gap: 6,
  },
  926: {
    width: 94,
    height: 44,
    borderRadius: 0,
    padding: 8,
    glowPadding: 10,
    iconSize: 28,
    fontSize: 14,
    buttonFontSize: 16,
    gap: 6,
  },
  932: {
    width: 100,
    height: 46,
    borderRadius: 0,
    padding: 8,
    glowPadding: 11,
    iconSize: 30,
    fontSize: 14,
    buttonFontSize: 16,
    gap: 7,
  },
}

const BASE_COMPACT_DIMS: CompactCardDimensionsConfig = {
  width: 88,
  height: 42,
  borderRadius: 0,
  padding: 7,
  glowPadding: 10,
  iconSize: 26,
  fontSize: 13,
  buttonFontSize: 15,
  gap: 6,
}

export function getCompactCardDimensions(): CompactCardDimensionsConfig {
  if (typeof window === 'undefined') {
    return { ...BASE_COMPACT_DIMS, borderRadius: BASE_COMPACT_DIMS.height / 2 }
  }
  const height = window.screen.height
  const dims =
    height < 667 || height > 932
      ? BASE_COMPACT_DIMS
      : (COMPACT_DIMS_BY_HEIGHT[height] ?? BASE_COMPACT_DIMS)
  return { ...dims, borderRadius: dims.height / 2 }
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

export const COMPACT_CARD_DIMENSIONS = {
  get width() {
    return getCompactCardDimensions().width
  },
  get height() {
    return getCompactCardDimensions().height
  },
  get borderRadius() {
    return getCompactCardDimensions().borderRadius
  },
  get padding() {
    return getCompactCardDimensions().padding
  },
  get glowPadding() {
    return getCompactCardDimensions().glowPadding
  },
  get iconSize() {
    return getCompactCardDimensions().iconSize
  },
  get fontSize() {
    return getCompactCardDimensions().fontSize
  },
  get buttonFontSize() {
    return getCompactCardDimensions().buttonFontSize
  },
  get gap() {
    return getCompactCardDimensions().gap
  },
}

export const CARD_COLORS = {
  near_zero: {
    borderColor: 0x00f3ff,
    borderAlpha: 0.5,
    glowColor: 0x00f3ff,
    glowAlpha: 0.2,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  profit: {
    borderColor: 0x4ade80,
    borderAlpha: 0.8,
    glowColor: 0x4ade80,
    glowAlpha: 0.5,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  loss: {
    borderColor: 0xf87171,
    borderAlpha: 0.8,
    glowColor: 0xf87171,
    glowAlpha: 0.5,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  closing: {
    borderColor: 0x00f3ff,
    borderAlpha: 0.8,
    glowColor: 0x00f3ff,
    glowAlpha: 0.6,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
  liquidated: {
    borderColor: 0xf87171,
    borderAlpha: 1.0,
    glowColor: 0xf87171,
    glowAlpha: 0.7,
    background: 0x0a0a14,
    backgroundAlpha: 0.85,
  },
} as const

export class PositionCardRenderer {
  private scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  private drawRoundedRect(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean = true
  ): void {
    if (radius <= 0) {
      if (fill) {
        graphics.fillRect(x, y, width, height)
      } else {
        graphics.strokeRect(x, y, width, height)
      }
      return
    }

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

  generateCachedTextures(): void {
    const states: Array<CardVisualState> = ['near_zero', 'profit', 'loss', 'closing', 'liquidated']

    states.forEach((state) => {
      this.generateCardTexture(state)
    })

    this.generateCompactCardTextures()

    this.generateDirectionIndicators()
    this.generateCloseButtonIcons()
  }

  private saveCanvasTexture(textureKey: string, canvas: HTMLCanvasElement): void {
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey)
    }

    const renderTexture = this.scene.make.renderTexture(
      { width: canvas.width, height: canvas.height },
      false
    )
    const tempTextureKey = `__temp_${textureKey}__`

    this.scene.textures.addCanvas(tempTextureKey, canvas)
    const tempSprite = this.scene.add.image(0, 0, tempTextureKey)
    renderTexture.draw(tempSprite, canvas.width / 2, canvas.height / 2)
    renderTexture.saveTexture(textureKey)
    this.scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR)

    renderTexture.destroy()
    tempSprite.destroy()
    this.scene.textures.remove(tempTextureKey)
  }

  private generateCloseButtonIcons(): void {
    const size = 36
    const scale = 4
    const scaledSize = size * scale
    const center = scaledSize / 2
    const radius = scaledSize / 2

    if (this.scene.textures.exists('close_icon')) {
      this.scene.textures.remove('close_icon')
    }
    if (this.scene.textures.exists('locked_icon')) {
      this.scene.textures.remove('locked_icon')
    }

    const closeCanvas = document.createElement('canvas')
    closeCanvas.width = scaledSize
    closeCanvas.height = scaledSize
    const closeCtx = closeCanvas.getContext('2d')

    if (!closeCtx) return

    closeCtx.fillStyle = '#166534'
    closeCtx.beginPath()
    closeCtx.arc(center, center, radius, 0, Math.PI * 2)
    closeCtx.fill()

    closeCtx.strokeStyle = '#dcfce7'
    closeCtx.lineWidth = 2.5 * scale
    closeCtx.lineCap = 'round'
    const crossInset = scaledSize * 0.31
    closeCtx.beginPath()
    closeCtx.moveTo(crossInset, crossInset)
    closeCtx.lineTo(scaledSize - crossInset, scaledSize - crossInset)
    closeCtx.moveTo(scaledSize - crossInset, crossInset)
    closeCtx.lineTo(crossInset, scaledSize - crossInset)
    closeCtx.stroke()

    this.saveCanvasTexture('close_icon', closeCanvas)

    const lockCanvas = document.createElement('canvas')
    lockCanvas.width = scaledSize
    lockCanvas.height = scaledSize
    const lockCtx = lockCanvas.getContext('2d')

    if (!lockCtx) return

    lockCtx.fillStyle = '#1e293b'
    lockCtx.beginPath()
    lockCtx.arc(center, center, radius, 0, Math.PI * 2)
    lockCtx.fill()

    const accentColor = '#f8fafc'
    const shackleStrokeWidth = 3 * scale
    const bodyWidth = scaledSize * 0.34
    const bodyHeight = scaledSize * 0.26
    const bodyX = (scaledSize - bodyWidth) / 2
    const bodyY = scaledSize * 0.54
    const shackleOuterRadius = bodyWidth * 0.42
    const shackleCenterX = scaledSize / 2
    const shackleCenterY = bodyY - shackleOuterRadius * 1.08

    lockCtx.strokeStyle = accentColor
    lockCtx.lineWidth = shackleStrokeWidth
    lockCtx.lineCap = 'round'
    lockCtx.lineJoin = 'round'
    lockCtx.beginPath()
    lockCtx.moveTo(bodyX + shackleStrokeWidth / 2, bodyY)
    lockCtx.lineTo(bodyX + shackleStrokeWidth / 2, shackleCenterY)
    lockCtx.arc(shackleCenterX, shackleCenterY, shackleOuterRadius, Math.PI, 0, false)
    lockCtx.lineTo(bodyX + bodyWidth - shackleStrokeWidth / 2, bodyY)
    lockCtx.stroke()

    lockCtx.fillStyle = accentColor
    lockCtx.beginPath()
    lockCtx.roundRect(bodyX, bodyY - scale, bodyWidth, bodyHeight, 5 * scale)
    lockCtx.fill()

    const keyholeRadius = bodyWidth * 0.05
    const keyholeX = scaledSize / 2
    const keyholeY = bodyY + bodyHeight * 0.32
    lockCtx.fillStyle = '#334155'
    lockCtx.beginPath()
    lockCtx.arc(keyholeX, keyholeY, keyholeRadius, 0, Math.PI * 2)
    lockCtx.fill()
    lockCtx.beginPath()
    lockCtx.roundRect(
      keyholeX - keyholeRadius * 0.42,
      keyholeY,
      keyholeRadius * 0.84,
      bodyHeight * 0.16,
      keyholeRadius * 0.42
    )
    lockCtx.fill()

    this.saveCanvasTexture('locked_icon', lockCanvas)
  }

  private generateCompactCardTextures(): void {
    const states: Array<CardVisualState> = ['near_zero', 'profit', 'loss', 'closing', 'liquidated']

    states.forEach((state) => {
      this.generateCompactCardTexture(state)
    })
  }

  private generateCompactCardTexture(state: CardVisualState): void {
    const colors = CARD_COLORS[state]
    const dims = getCompactCardDimensions()
    const { width, height, borderRadius, glowPadding } = dims

    const scale = 2
    const scaledWidth = width * scale
    const scaledHeight = height * scale
    const scaledRadius = borderRadius * scale
    const scaledGlowPadding = glowPadding * scale

    const textureWidth = scaledWidth + scaledGlowPadding * 2
    const textureHeight = scaledHeight + scaledGlowPadding * 2

    const container = this.scene.add.container(0, 0)
    const graphics = this.scene.add.graphics()

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

    const textureKey = `card_compact_${state}`
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

  private generateCardTexture(state: CardVisualState): void {
    const colors = CARD_COLORS[state]
    const dims = getCardDimensions()
    const { width, height, borderRadius, glowPadding } = dims

    const scale = 2
    const scaledWidth = width * scale
    const scaledHeight = height * scale
    const scaledRadius = borderRadius * scale
    const scaledGlowPadding = glowPadding * scale

    const textureWidth = scaledWidth + scaledGlowPadding * 2
    const textureHeight = scaledHeight + scaledGlowPadding * 2

    const container = this.scene.add.container(0, 0)
    const graphics = this.scene.add.graphics()

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

  private generateDirectionIndicators(): void {
    const dims = getCardDimensions()
    const size = dims.iconSize
    const scale = 2
    const scaledSize = size * scale

    if (this.scene.textures.exists('indicator_up')) {
      this.scene.textures.remove('indicator_up')
    }
    if (this.scene.textures.exists('indicator_down')) {
      this.scene.textures.remove('indicator_down')
    }

    const upContainer = this.scene.add.container(0, 0)
    const upBg = this.scene.add.graphics()
    upBg.fillStyle(0x4ade80, 0.25)
    upBg.fillCircle(scaledSize / 2, scaledSize / 2, scaledSize / 2)
    upContainer.add(upBg)

    const upTriangle = this.scene.add.graphics()
    upTriangle.fillStyle(0x4ade80, 1)
    upTriangle.lineStyle(2 * scale, 0x4ade80, 1)
    this.drawTriangleUp(upTriangle, scaledSize / 2, scaledSize / 2, scaledSize * 0.4)
    upContainer.add(upTriangle)

    let renderTexture = this.scene.make.renderTexture(
      { width: scaledSize, height: scaledSize },
      false
    )
    renderTexture.draw(upContainer, 0, 0)
    renderTexture.saveTexture('indicator_up')
    this.scene.textures.get('indicator_up').setFilter(Phaser.Textures.FilterMode.LINEAR)
    renderTexture.destroy()
    upContainer.destroy()

    const downContainer = this.scene.add.container(0, 0)
    const downBg = this.scene.add.graphics()
    downBg.fillStyle(0xf87171, 0.25)
    downBg.fillCircle(scaledSize / 2, scaledSize / 2, scaledSize / 2)
    downContainer.add(downBg)

    const downTriangle = this.scene.add.graphics()
    downTriangle.fillStyle(0xf87171, 1)
    downTriangle.lineStyle(2 * scale, 0xf87171, 1)
    this.drawTriangleDown(downTriangle, scaledSize / 2, scaledSize / 2, scaledSize * 0.4)
    downContainer.add(downTriangle)

    renderTexture = this.scene.make.renderTexture({ width: scaledSize, height: scaledSize }, false)
    renderTexture.draw(downContainer, 0, 0)
    renderTexture.saveTexture('indicator_down')
    this.scene.textures.get('indicator_down').setFilter(Phaser.Textures.FilterMode.LINEAR)
    renderTexture.destroy()
    downContainer.destroy()
  }
}
