import * as Phaser from 'phaser'
import { Scene } from 'phaser'

export const BUTTON_CONFIG = {
  long: { color: 0x00f3ff, label: 'LONG' },
  short: { color: 0xff6b00, label: 'SHORT' },
} as const
export type ButtonType = keyof typeof BUTTON_CONFIG
export type ButtonGlowState = 'light' | 'medium' | 'brightest' | 'disabled'

export class ButtonRenderer {
  constructor(private scene: Scene) {}

  generateCachedTextures(): void {
    for (const type of ['long', 'short'] as ButtonType[]) {
      for (const state of ['light', 'medium', 'brightest', 'disabled'] as ButtonGlowState[]) {
        const key = `button_${type}_${state}`
        if (this.scene.textures.exists(key)) continue
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 480
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        const config = BUTTON_CONFIG[type]
        const color = `#${config.color.toString(16).padStart(6, '0')}`
        const disabled = state === 'disabled'
        const pressed = state === 'brightest'
        ctx.translate(240, 240)
        ctx.globalAlpha = disabled ? 0.35 : 1
        ctx.shadowColor = color
        ctx.shadowBlur = pressed ? 36 : 16
        ctx.fillStyle = '#0a0a0a'
        ctx.beginPath()
        ctx.arc(0, 0, 176, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = pressed ? 12 : 6
        for (let segment = 0; segment < 8; segment++) {
          const start = (segment * Math.PI) / 4 + 0.06
          ctx.beginPath()
          ctx.arc(0, 0, 168, start, start + Math.PI / 4 - 0.12)
          ctx.stroke()
        }
        ctx.shadowBlur = 0
        ctx.globalAlpha *= 0.45
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, 0, 140, 0, Math.PI * 2)
        ctx.stroke()
        // Radial circuit traces terminate before the control's center.
        for (let trace = 0; trace < 4; trace++) {
          ctx.save()
          ctx.rotate((trace * Math.PI) / 2)
          ctx.beginPath()
          ctx.moveTo(120, 0)
          ctx.lineTo(100, 0)
          ctx.lineTo(90, 10)
          ctx.stroke()
          ctx.restore()
        }
        ctx.globalAlpha = disabled ? 0.45 : 1
        const direction = type === 'long' ? -1 : 1
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 12
        ctx.lineJoin = 'miter'
        ctx.beginPath()
        ctx.moveTo(-40, -18 - direction * 18)
        ctx.lineTo(0, -18 + direction * 22)
        ctx.lineTo(40, -18 - direction * 18)
        ctx.stroke()
        ctx.fillStyle = color
        ctx.font = 'bold 32px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(config.label, 0, 75)
        this.scene.textures.addCanvas(key, canvas)
        this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
      }
    }
  }
}

export function getButtonDisplaySize(): number {
  return 120
}
