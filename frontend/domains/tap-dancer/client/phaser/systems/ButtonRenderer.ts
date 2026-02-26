import { Scene } from 'phaser'

/**
 * Premium button configuration for visual rendering
 * Tron Legacy-inspired coin buttons matching Hyper Swiper aesthetic
 *
 * Optimized for Farcaster Mini App - crisp rendering when viewed up close on mobile
 */
export const BUTTON_CONFIG = {
  long: {
    color: 0x00ffaa, // Bright cyan-green neon
    glowColor: 0x00ffcc, // Luminous glow
    darkCore: 0x001a12, // Very dark teal core
    edgeColor: 0x00ff88, // Sharp neon edge
    radius: 44,
    label: 'LONG',
  },
  short: {
    color: 0xff2266, // Hot pink-red neon
    glowColor: 0xff4488, // Luminous glow
    darkCore: 0x1a0812, // Very dark magenta core
    edgeColor: 0xff6699, // Sharp neon edge
    radius: 44,
    label: 'SHORT',
  },
} as const

export type ButtonType = keyof typeof BUTTON_CONFIG
export type ButtonGlowState = 'light' | 'medium' | 'brightest' | 'disabled'

/**
 * Premium button renderer using Canvas 2D API for smooth gradients
 *
 * Uses native Canvas 2D radial gradients instead of Phaser Graphics
 * to eliminate banding and achieve buttery-smooth glow effects.
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
   * Draw triangle path on canvas context
   */
  private drawTriangle(ctx: CanvasRenderingContext2D, type: ButtonType, size: number): void {
    const height = (size * Math.sqrt(3)) / 2

    ctx.beginPath()
    if (type === 'long') {
      // Upward triangle
      const topY = -height * 0.6
      const bottomY = height * 0.4
      ctx.moveTo(0, topY)
      ctx.lineTo(-size / 2, bottomY)
      ctx.lineTo(size / 2, bottomY)
    } else {
      // Downward triangle
      const topY = -height * 0.4
      const bottomY = height * 0.6
      ctx.moveTo(-size / 2, topY)
      ctx.lineTo(size / 2, topY)
      ctx.lineTo(0, bottomY)
    }
    ctx.closePath()
  }

  /**
   * Generate all cached button textures
   * Creates 8 textures: 2 types x 4 states each
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
   * Uses Canvas 2D API for mathematically smooth gradients
   */
  private generateTexture(type: ButtonType, state: ButtonGlowState): void {
    const config = BUTTON_CONFIG[type]
    const isDisabled = state === 'disabled'

    // High resolution for crisp rendering
    // Canvas 2D handles gradients smoothly, so 4x scale is sufficient
    const scale = 4
    const diameter = (config.radius * 2 + 32) * scale
    const scaledRadius = config.radius * scale

    // Create offscreen canvas
    const canvas = document.createElement('canvas')
    canvas.width = diameter
    canvas.height = diameter
    const ctx = canvas.getContext('2d')!
    const center = diameter / 2

    // Get glow intensity
    const glowIntensity = this.getGlowIntensity(state)

    // =========================================================================
    // LAYER 1: OUTER GLOW with smooth radial gradient
    // =========================================================================
    // Native Canvas 2D radial gradient - no banding!
    const outerGlow = ctx.createRadialGradient(
      center,
      center,
      scaledRadius * 0.5,
      center,
      center,
      scaledRadius * 1.4
    )
    outerGlow.addColorStop(0, 'rgba(0,0,0,0)')
    outerGlow.addColorStop(0.6, this.hexToRgba(config.glowColor, glowIntensity * 0.3))
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.fillStyle = outerGlow
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius * 1.4, 0, Math.PI * 2)
    ctx.fill()

    // =========================================================================
    // LAYER 2: SOLID DARK CORE
    // =========================================================================
    ctx.fillStyle = this.hexToRgba(config.darkCore, isDisabled ? 0.5 : 1.0)
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius, 0, Math.PI * 2)
    ctx.fill()

    // =========================================================================
    // LAYER 3: INNER GLOW GRADIENT
    // =========================================================================
    const innerGlow = ctx.createRadialGradient(
      center,
      center,
      scaledRadius * 0.3,
      center,
      center,
      scaledRadius
    )
    innerGlow.addColorStop(0, this.hexToRgba(config.glowColor, 0))
    innerGlow.addColorStop(1, this.hexToRgba(config.glowColor, glowIntensity * 0.5))

    ctx.fillStyle = innerGlow
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius, 0, Math.PI * 2)
    ctx.fill()

    // =========================================================================
    // LAYER 4: MULTI-STROKE EDGE (Canvas 2D anti-aliases strokes well)
    // =========================================================================
    const edgeAlpha = isDisabled ? 0.4 : 1.0

    // Outer glow ring
    ctx.strokeStyle = this.hexToRgba(config.glowColor, edgeAlpha * 0.3)
    ctx.lineWidth = 3 * scale
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius + scale, 0, Math.PI * 2)
    ctx.stroke()

    // Primary neon ring
    ctx.strokeStyle = this.hexToRgba(config.color, edgeAlpha * 0.9)
    ctx.lineWidth = 3 * scale
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius - 1.5 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Inner highlight ring
    ctx.strokeStyle = this.hexToRgba(config.edgeColor, edgeAlpha * 0.8)
    ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius - 3.5 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // White accent
    ctx.strokeStyle = `rgba(255,255,255,${edgeAlpha * 0.5})`
    ctx.lineWidth = scale * 0.8
    ctx.beginPath()
    ctx.arc(center, center, scaledRadius - 0.5 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // =========================================================================
    // LAYER 5: TRIANGLE ICON
    // =========================================================================
    const triangleAlpha = isDisabled ? 0.35 : 1.0
    const triangleSize = scaledRadius * 0.55

    ctx.save()
    ctx.translate(center, center)

    // Triangle glow
    ctx.fillStyle = this.hexToRgba(config.glowColor, triangleAlpha * 0.25)
    this.drawTriangle(ctx, type, triangleSize * 1.3)
    ctx.fill()

    // Triangle main
    ctx.fillStyle = `rgba(255,255,255,${triangleAlpha})`
    this.drawTriangle(ctx, type, triangleSize)
    ctx.fill()

    // Triangle stroke
    ctx.strokeStyle = this.hexToRgba(config.color, triangleAlpha * 0.6)
    ctx.lineWidth = scale * 0.5
    this.drawTriangle(ctx, type, triangleSize)
    ctx.stroke()

    ctx.restore()

    // =========================================================================
    // CREATE PHASER TEXTURE FROM CANVAS
    // =========================================================================
    // CRITICAL: Use RenderTexture to convert Canvas to WebGL-compatible texture
    // addCanvas() creates a CanvasTexture which doesn't work with Image game objects
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
 * This is the visual size of the button core plus glow padding
 */
export function getButtonDisplaySize(): number {
  // (BUTTON_RADIUS * 2 + 32 padding) = 44 * 2 + 32 = 120
  return 44 * 2 + 32
}
