import { Scene } from 'phaser'
import type { CoinType } from '../types/trading'

// Coin configuration for visual rendering (Classic Casino Token theme)
// Colors: Muted, metallic tones with thick dark edges for milled rim effect
// Hitbox multipliers adjust slice difficulty: larger = easier, smaller = harder
export const COIN_CONFIG = {
  long: {
    color: 0x2ecc71, // Muted Emerald Green
    glowColor: 0x186b3b, // Dimmed Emerald Green
    coreColor: 0x051a0d,
    radius: 14, // Slightly larger radius for the transparent effect
    hitboxMultiplier: 1.4, // 40% larger hitbox - easier to slice
    symbol: '₿',
  },
  short: {
    color: 0xe74c3c, // Muted Alizarin Red
    glowColor: 0x7a2820, // Dimmed Alizarin Red
    coreColor: 0x1a0907,
    radius: 14,
    hitboxMultiplier: 1.4, // 40% larger hitbox - easier to slice
    symbol: '₿',
  },
} as const

export class CoinRenderer {
  private scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  /**
   * Helper function to adjust color brightness
   * Used for creating metallic/glass gradient effects
   */
  private adjustBrightness(hexColor: number, factor: number): number {
    const color = Phaser.Display.Color.ValueToColor(hexColor)
    color.red = Math.floor(Math.min(255, color.red * factor))
    color.green = Math.floor(Math.min(255, color.green * factor))
    color.blue = Math.floor(Math.min(255, color.blue * factor))
    return Phaser.Display.Color.GetColor(color.red, color.green, color.blue)
  }

  /**
   * Generate all cached coin textures
   */
  generateCachedTextures(): void {
    const textureKeys: Array<CoinType> = ['long', 'short']

    textureKeys.forEach((type) => {
      const config = COIN_CONFIG[type]

      // Quadruple the texture size for smooth gradients
      const scale = 4

      // Calculate max boundary needed
      // Just enough padding for the thickest line stroke
      const paddedRadius = config.radius + 3
      const diameter = paddedRadius * 2 * scale

      // Create a container to hold all elements
      const container = this.scene.add.container(0, 0)

      // Create graphics for coin body
      const graphics = this.scene.add.graphics()
      const scaledRadius = config.radius * scale

      // =========================================================================
      // GLASS COIN LAYERED STRUCTURE (Transparent, Physical, Illuminated)
      // =========================================================================

      // 1. BASE GLASS TINT (Transparent core)
      // Gives the glass its base physical color/tint without blocking the background
      graphics.fillStyle(config.color, 0.15) // Extremely faint color tint
      graphics.fillCircle(0, 0, scaledRadius)

      // 2. INTERNAL ILLUMINATION (Soft self-glowing ambient light from center)
      // Represents light trapped inside the glass bouncing around
      const glowSteps = 10
      for (let i = glowSteps; i > 0; i--) {
        const r = scaledRadius * (i / glowSteps)
        // Opacity drops off as it gets to the edge, creating a ball of soft light inside
        const opacity = 0.03 * (1 - i / glowSteps)
        graphics.fillStyle(config.glowColor, opacity)
        graphics.fillCircle(0, 0, r)
      }

      // 3. INNER GLASS BEVEL (Refraction near the edges)
      graphics.lineStyle(3 * scale, config.color, 0.25)
      graphics.strokeCircle(0, 0, scaledRadius * 0.85)

      // 4. OUTER PHYSICAL EDGE (The rim/cut of the glass)
      // Sharp distinct edge where light catches the surface cut
      graphics.lineStyle(1 * scale, 0xffffff, 0.6) // Crisp white highlight on the absolute tip
      graphics.strokeCircle(0, 0, scaledRadius)

      graphics.lineStyle(2.5 * scale, config.color, 0.4) // Darker tone on the inside of the cut
      graphics.strokeCircle(0, 0, scaledRadius - 0.5 * scale)

      container.add(graphics)

      // 5. SPECULAR HIGHLIGHT (The shine reflection off the glass dome)
      // This is what makes it look like a physical 3D glass object rather than a 2D circle
      const highlight = this.scene.add.graphics()
      highlight.fillStyle(0xffffff, 0.4)

      // Draw a curved highlight shape near the top left (assuming light source is top left)
      highlight.beginPath()
      highlight.arc(0, 0, scaledRadius * 0.9, Math.PI * 1.05, Math.PI * 1.45, false) // Outer top-left curve
      highlight.arc(0, 0, scaledRadius * 0.6, Math.PI * 1.45, Math.PI * 1.05, true) // Inner curve to hollow it out
      highlight.closePath()
      highlight.fillPath()

      // Minor reflection bump on bottom right
      highlight.fillStyle(0xffffff, 0.15)
      highlight.beginPath()
      highlight.arc(0, 0, scaledRadius * 0.85, Math.PI * 0.2, Math.PI * 0.4, false)
      highlight.arc(0, 0, scaledRadius * 0.75, Math.PI * 0.4, Math.PI * 0.2, true)
      highlight.closePath()
      highlight.fillPath()

      container.add(highlight)

      // =========================================================================
      // SYMBOL RENDERING (Internal floating neon shape)
      // =========================================================================

      const symbolScale = config.radius * 0.85 * scale

      const hexColorString = `#${config.color.toString(16).padStart(6, '0')}`
      const deepHexColorString = `#${config.glowColor.toString(16).padStart(6, '0')}`

      // Bright white/colored center text, appears suspended in the glass
      const mainText = this.scene.add
        .text(0, 0, config.symbol, {
          fontSize: `${symbolScale}px`,
          fontFamily: 'Arial',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)

      // The light cast BY the symbol INTO the glass around it
      mainText.setShadow(0, 0, deepHexColorString, 12 * scale, false, true)

      // Adds thick 3D-light bleed to the text inside the glass
      const outlineText = this.scene.add
        .text(0, 0, config.symbol, {
          fontSize: `${symbolScale}px`,
          fontFamily: 'Arial',
          color: hexColorString,
          stroke: deepHexColorString,
          strokeThickness: 3 * scale,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)

      outlineText.setAlpha(0.7)

      container.add(outlineText)
      container.add(mainText)

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
