import { Scene } from 'phaser'

/**
 * Simplified button configuration
 */
export const BUTTON_CONFIG = {
  long: {
    color: 0x00ffaa, // Cyan-green
    label: '↑',
  },
  short: {
    color: 0xff4466, // Red-pink
    label: '↓',
  },
} as const

export type ButtonType = keyof typeof BUTTON_CONFIG
export type ButtonGlowState = 'light' | 'medium' | 'brightest' | 'disabled'

/**
 * Simplified button renderer using Canvas 2D API
 */
export class ButtonRenderer {
  private scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  /**
   * Get inner glow intensity based on state
   */
  private getGlowIntensity(state: ButtonGlowState): number {
    switch (state) {
      case 'light':
        return 0.15
      case 'medium':
        return 0.5
      case 'brightest':
        return 0.8
      case 'disabled':
        return 0
    }
  }

  /**
   * Convert hex color to rgba string
   */
  private hexToRgba(hex: number, alpha: number): string {
    const r = (hex >> 16) & 255
    const g = (hex >> 8) & 255
    const b = hex & 255
    return `rgba(${r},${g},${b},${alpha})`
  }

  /**
   * Generate all cached button textures
   */
  generateCachedTextures(): void {
    const types: Array<ButtonType> = ['long', 'short']
    const states: Array<ButtonGlowState> = ['light', 'medium', 'brightest', 'disabled']

    types.forEach((type) => {
      states.forEach((state) => {
        this.generateTexture(type, state)
      })
    })
  }

  /**
   * Generate a single texture for a button type and state
   */
  private generateTexture(type: ButtonType, state: ButtonGlowState): void {
    const config = BUTTON_CONFIG[type]
    const isDisabled = state === 'disabled'
    const radius = 44

    // High resolution for crisp rendering
    const scale = 4
    const diameter = (radius * 2 + 32) * scale
    const scaledRadius = radius * scale

    // Create offscreen canvas
    const canvas = document.createElement('canvas')
    canvas.width = diameter
    canvas.height = diameter
    const ctx = canvas.getContext('2d')!
    const center = diameter / 2

    // Get glow intensity
    const glowIntensity = this.getGlowIntensity(state)

    // =========================================================================
    // LAYER 1: OUTER GLOW
    // =========================================================================
    const outerGlow = ctx.createRadialGradient(
      center,
      center,
      scaledRadius * 0.5,
      center,
      center,
      scaledRadius * 1.4
    )
    outerGlow.addColorStop(0, 'rgba(0,0,0,0)')
    outerGlow.addColorStop(0.6, this.hexToRgba(config.color, glowIntensity * 0.3))
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.fillStyle = outerGlow
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius * 1.4, 0, Math.PI * 2)
    ctx.fill()

    // =========================================================================
    // LAYER 2: SOLID DARK CORE
    // =========================================================================
    const darkCore = type === 'long' ? 0x001a12 : 0x1a0812
    ctx.fillStyle = this.hexToRgba(darkCore, isDisabled ? 0.5 : 1.0)
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius, 0, Math.PI * 2)
    ctx.fill()

    // =========================================================================
    // LAYER 3: INNER GLOW
    // =========================================================================
    const innerGlow = ctx.createRadialGradient(
      center,
      center,
      scaledRadius * 0.3,
      center,
      center,
      scaledRadius
    )
    innerGlow.addColorStop(0, this.hexToRgba(config.color, 0))
    innerGlow.addColorStop(1, this.hexToRgba(config.color, glowIntensity * 0.5))

    ctx.fillStyle = innerGlow
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius, 0, Math.PI * 2)
    ctx.fill()

    // =========================================================================
    // LAYER 4: BORDER
    // =========================================================================
    const edgeAlpha = isDisabled ? 0.4 : 1.0

    // Primary border
    ctx.strokeStyle = this.hexToRgba(config.color, edgeAlpha * 0.9)
    ctx.lineWidth = 3 * scale
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius - 1.5 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // =========================================================================
    // LAYER 5: ARROW ICON (thick bold arrows)
    // =========================================================================
    const textAlpha = isDisabled ? 0.35 : 1.0
    const fontSize = scaledRadius * 1.1

    ctx.save()
    ctx.translate(center, center)
    ctx.font = `900 ${fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Thick stroke outline
    ctx.strokeStyle = this.hexToRgba(config.color, textAlpha * 0.8)
    ctx.lineWidth = scale * 2
    ctx.strokeText(config.label, 0, 0)

    // Text glow
    ctx.fillStyle = this.hexToRgba(config.color, textAlpha * 0.4)
    ctx.fillText(config.label, 2, 2)

    // Main text
    ctx.fillStyle = `rgba(255,255,255,${textAlpha})`
    ctx.fillText(config.label, 0, 0)

    ctx.restore()

    // =========================================================================
    // CREATE PHASER TEXTURE FROM CANVAS
    // =========================================================================
    const textureKey = `button_${type}_${state}`

    // Remove existing texture if present
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey)
    }

    // Create a RenderTexture and draw the canvas content onto it
    const renderTexture = this.scene.make.renderTexture(
      { width: diameter, height: diameter },
      false
    )

    // Create a temporary image from canvas and draw to render texture
    const tempTextureKey = `__temp_button_canvas_${type}_${state}__`
    this.scene.textures.addCanvas(tempTextureKey, canvas)
    const tempSprite = this.scene.add.image(0, 0, tempTextureKey)
    renderTexture.draw(tempSprite, diameter / 2, diameter / 2)

    // Save as proper WebGL texture
    renderTexture.saveTexture(textureKey)
    this.scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR)

    // Cleanup temporary resources
    renderTexture.destroy()
    tempSprite.destroy()
    this.scene.textures.remove(tempTextureKey)
  }
}

/**
 * Get the display size for buttons (used by CoinButton)
 */
export function getButtonDisplaySize(): number {
  return 44 * 2 + 32
}
