import * as Phaser from 'phaser'
import { Scene } from 'phaser'
import type { CoinType } from '@/domains/hyper-swiper/shared/trading.types'

// Radius and hitbox multiplier remain the authoritative visual/collision contract.
export const COIN_CONFIG = {
  long: {
    color: 0x00f3ff,
    glowColor: 0x00f3ff,
    darkCore: 0x07181c,
    edgeColor: 0x9cfaff,
    radius: 15.4,
    hitboxMultiplier: 1.4,
    symbol: 'long',
    label: 'LONG',
  },
  short: {
    color: 0xff6b00,
    glowColor: 0xff6b00,
    darkCore: 0x211207,
    edgeColor: 0xffbe83,
    radius: 15.4,
    hitboxMultiplier: 1.4,
    symbol: 'short',
    label: 'SHORT',
  },
} as const

export class CoinRenderer {
  constructor(private scene: Scene) {}

  generateCachedTextures(): void {
    for (const type of ['long', 'short'] as CoinType[]) {
      const key = `texture_${type}`
      if (this.scene.textures.exists(key)) continue
      const config = COIN_CONFIG[type]
      const scale = 4
      const radius = config.radius * scale
      const diameter = (config.radius + 6) * 2 * scale
      const graphics = this.scene.add.graphics()
      for (let i = 6; i > 0; i--) {
        graphics.lineStyle(scale * i, config.color, 0.018)
        graphics.strokeCircle(0, 0, radius)
      }
      graphics.fillStyle(0x0a0a0a, 1)
      graphics.fillCircle(0, 0, radius)
      graphics.fillStyle(config.darkCore, 1)
      graphics.fillCircle(0, 0, radius - 3 * scale)
      graphics.lineStyle(scale * 0.65, config.edgeColor, 0.8)
      graphics.strokeCircle(0, 0, radius)
      // Separate energy cells around the sculpted rim.
      graphics.lineStyle(scale * 2.2, config.color, 1)
      for (let cell = 0; cell < 8; cell++) {
        const start = (cell * Math.PI) / 4 + 0.07
        graphics.beginPath()
        graphics.arc(0, 0, radius - scale * 2, start, start + Math.PI / 4 - 0.14)
        graphics.strokePath()
      }
      graphics.lineStyle(scale * 0.55, config.color, 0.45)
      graphics.strokeCircle(0, 0, radius * 0.6)
      graphics.lineStyle(scale * 1.9, 0xffffff, 1)
      const direction = type === 'long' ? -1 : 1
      for (const offset of [-2, 3]) {
        graphics.beginPath()
        graphics.moveTo(-5 * scale, (offset - direction * 2) * scale)
        graphics.lineTo(0, (offset + direction * 3) * scale)
        graphics.lineTo(5 * scale, (offset - direction * 2) * scale)
        graphics.strokePath()
      }
      const texture = this.scene.make.renderTexture({ width: diameter, height: diameter }, false)
      texture.draw(graphics, diameter / 2, diameter / 2)
      texture.saveTexture(key)
      this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
      texture.destroy()
      graphics.destroy()
    }
  }
}
