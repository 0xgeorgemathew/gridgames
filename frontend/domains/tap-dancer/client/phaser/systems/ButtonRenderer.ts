import { Scene } from 'phaser'

export const BUTTON_CONFIG = {
  long: { color: 0xd9f56e, label: '↑' },
  short: { color: 0xff68bc, label: '↓' },
} as const
export type ButtonType = keyof typeof BUTTON_CONFIG
export type ButtonGlowState = 'light' | 'medium' | 'brightest' | 'disabled'

/** Machined keycaps cached per texture manager rather than redrawn on taps. */
export class ButtonRenderer {
  constructor(private scene: Scene) {}
  generateCachedTextures(): void {
    const states: ButtonGlowState[] = ['light', 'medium', 'brightest', 'disabled']
    for (const type of ['long', 'short'] as ButtonType[]) {
      for (const state of states) this.generateTexture(type, state)
    }
  }
  private generateTexture(type: ButtonType, state: ButtonGlowState): void {
    const key = 'button_' + type + '_' + state
    if (this.scene.textures.exists(key)) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 360
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(3, 3)
    const disabled = state === 'disabled'
    const pressed = state === 'brightest'
    const accent = disabled ? '#65635d' : type === 'long' ? '#d9f56e' : '#ff68bc'
    const face = (x: number, y: number, size: number, cut: number) => {
      ctx.beginPath()
      ctx.moveTo(x + cut, y)
      ctx.lineTo(x + size - cut, y)
      ctx.lineTo(x + size, y + cut)
      ctx.lineTo(x + size, y + size - cut)
      ctx.lineTo(x + size - cut, y + size)
      ctx.lineTo(x + cut, y + size)
      ctx.lineTo(x, y + size - cut)
      ctx.lineTo(x, y + cut)
      ctx.closePath()
    }
    face(10, 15, 100, 15)
    ctx.fillStyle = '#080a0d'
    ctx.fill()
    ctx.strokeStyle = '#414047'
    ctx.stroke()
    face(16, 14, 88, 12)
    ctx.fillStyle = disabled ? '#24252a' : accent
    ctx.fill()
    face(17, pressed ? 19 : 15, 86, 12)
    const gradient = ctx.createLinearGradient(0, 16, 0, 102)
    gradient.addColorStop(0, pressed ? '#36383a' : '#36383f')
    gradient.addColorStop(1, '#15171c')
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.strokeStyle = accent
    ctx.lineWidth = pressed ? 2 : 1
    ctx.stroke()
    ctx.save()
    ctx.translate(60, 57)
    ctx.strokeStyle = accent
    ctx.globalAlpha = disabled ? 0.35 : 0.7
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * 33, Math.sin(angle) * 33)
      ctx.lineTo(Math.cos(angle) * 36, Math.sin(angle) * 36)
      ctx.stroke()
    }
    ctx.restore()
    ctx.fillStyle = disabled ? '#85827d' : '#f7f0df'
    ctx.textAlign = 'center'
    ctx.font = '700 34px Arial'
    ctx.fillText(BUTTON_CONFIG[type].label, 60, pressed ? 62 : 58)
    ctx.font = '800 9px Arial'
    ctx.fillStyle = accent
    ctx.fillText(type.toUpperCase(), 60, 82)
    ctx.font = '600 6px monospace'
    ctx.fillText(disabled ? 'LOCKED' : 'TAP TO OPEN', 60, 94)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 0 || pressed ? accent : '#4a4944'
      ctx.fillRect(51 + i * 7, 23, 4, 2)
    }
    this.scene.textures.addCanvas(key, canvas)
  }
}
export function getButtonDisplaySize(): number { return 120 }
