import * as Phaser from 'phaser'
import type { Scene } from 'phaser'
import { CLIENT_GAME_CONFIG as CFG } from '../../game.config'
import type { CoinType } from '@/domains/hyper-swiper/shared/trading.types'

/**
 * Coin configuration for visual rendering
 * Orbital discs with segmented rims
 * Clean, minimal, high-contrast design
 */
export const COIN_CONFIG = {
  long: {
    color: 0xa3ffdb, // Mint long marker
    glowColor: 0xa3ffdb, // Luminous glow
    darkCore: 0x001a12, // Very dark teal core
    edgeColor: 0xa3ffdb, // Sharp neon edge
    radius: 15.4, // 10% bigger (14 * 1.1)
    hitboxMultiplier: 1.4,
    symbol: 'long',
    label: 'LONG',
  },
  short: {
    color: 0xff7e88, // Coral short marker
    glowColor: 0xff7e88, // Luminous glow
    darkCore: 0x1a0812, // Very dark magenta core
    edgeColor: 0xff7e88, // Sharp neon edge
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

  /** Bake two vector tokens once. Radius, padding and texture keys retain hit geometry. */
  generateCachedTextures(): void {
    const types: CoinType[] = ['long', 'short']
    for (const type of types) {
      const key = `texture_${type}`
      if (this.scene.textures.exists(key)) continue
      const config = COIN_CONFIG[type]
      const scale = 4
      const diameter = (config.radius + 6) * 2 * scale
      const canvas = document.createElement('canvas')
      canvas.width = diameter
      canvas.height = diameter
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      const c = canvas.width / 2
      const radius = config.radius * scale
      const ink = type === 'long' ? '#a3ffdb' : '#ff7e88'
      const halo = ctx.createRadialGradient(c, c, radius * 0.6, c, c, radius * 1.35)
      halo.addColorStop(0, type === 'long' ? '#a3ffdb30' : '#ff7e8830')
      halo.addColorStop(1, '#00000000')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.arc(c, c, radius * 0.86, 0, Math.PI * 2)
      const core = ctx.createLinearGradient(c, c - radius, c, c + radius)
      core.addColorStop(0, type === 'long' ? '#23463d' : '#492a3e')
      core.addColorStop(1, '#0a1123')
      ctx.fillStyle = core
      ctx.fill()
      ctx.strokeStyle = ink
      ctx.lineWidth = 2
      ctx.stroke()
      // Segmented orbital rim and etched tick marks.
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(c, c, radius, (i * Math.PI * 2) / 3 + 0.12, ((i + 1) * Math.PI * 2) / 3 - 0.2)
        ctx.strokeStyle = ink
        ctx.lineWidth = 3
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(c, c, radius * 1.14, 0.35, Math.PI * 1.55)
      ctx.strokeStyle = '#f7f5ee50'
      ctx.lineWidth = 1
      ctx.stroke()
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        ctx.beginPath()
        ctx.moveTo(c + Math.cos(a) * radius * 0.91, c + Math.sin(a) * radius * 0.91)
        ctx.lineTo(c + Math.cos(a) * radius * 0.97, c + Math.sin(a) * radius * 0.97)
        ctx.strokeStyle = '#f7f5ee70'
        ctx.stroke()
      }
      // Direction identifies the coin type. Swipe direction does not select a side.
      const sign = type === 'long' ? -1 : 1
      ctx.beginPath()
      ctx.moveTo(c - 17, c - 10 * sign)
      ctx.lineTo(c, c + 10 * sign)
      ctx.lineTo(c + 17, c - 10 * sign)
      ctx.strokeStyle = '#f7f5ee'
      ctx.lineWidth = 6
      ctx.lineJoin = 'miter'
      ctx.stroke()
      ctx.fillStyle = ink
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '800 13px Arial, sans-serif'
      ctx.fillText(config.label, c, c + 19)
      ctx.fillStyle = '#f7f5ee'
      ctx.font = '800 21px Arial, sans-serif'
      ctx.fillText(`${CFG.FIXED_LEVERAGE}×`, c, c + 39)
      this.scene.textures.addCanvas(key, canvas)
      this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
    }
  }
}
