import type { GameObjects, Scene } from 'phaser'
const TILE_KEY = 'tap-market-stage-tile'

/** Static etched stage art with a low-cost traveling beat rail. */
export class GridBackgroundSystem {
  private gridLayer?: GameObjects.TileSprite
  private stage?: GameObjects.Graphics
  private reducedMotion = false
  constructor(private scene: Scene) {}
  create(): void {
    this.reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!this.scene.textures.exists(TILE_KEY)) {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 192
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = 'rgba(247,240,223,0.045)'
        for (let x = 0; x < 192; x += 48) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, 192)
          ctx.stroke()
        }
        for (let y = 0; y < 192; y += 48) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(192, y)
          ctx.stroke()
          ctx.fillStyle = 'rgba(255,199,106,0.18)'
          ctx.fillRect(0, y, 5, 1)
        }
        this.scene.textures.addCanvas(TILE_KEY, canvas)
      }
    }
    this.stage = this.scene.add.graphics().setDepth(-3)
    if (this.scene.textures.exists(TILE_KEY)) {
      this.gridLayer = this.scene.add.tileSprite(0, 0, 1, 1, TILE_KEY)
        .setOrigin(0).setDepth(-2)
    }
    this.handleResize()
  }
  update(delta: number): void {
    if (this.gridLayer && !this.reducedMotion) {
      this.gridLayer.tilePositionX += delta * 0.008
    }
  }
  handleResize(): void {
    const { width, height } = this.scene.cameras.main
    this.gridLayer?.setSize(width, height).setDisplaySize(width, height)
    if (!this.stage) return
    this.stage.clear()
    this.stage.fillStyle(0x111217, 0.97)
    this.stage.fillRect(0, 0, width, height)
    this.stage.fillStyle(0x1d1d23, 0.9)
    this.stage.fillRect(width * 0.08, 90, width * 0.84, Math.max(0, height - 270))
    this.stage.lineStyle(1, 0xffc76a, 0.22)
    this.stage.lineBetween(width / 2, 90, width / 2, height - 220)
    for (let y = 100; y < height - 210; y += 24) {
      this.stage.lineStyle(1, 0xf7f0df, y % 48 === 4 ? 0.3 : 0.1)
      this.stage.lineBetween(10, y, 17, y)
      this.stage.lineBetween(width - 17, y, width - 10, y)
    }
    this.stage.fillStyle(0x090a0e, 0.8)
    this.stage.fillRect(0, Math.max(0, height - 220), width, 220)
    this.stage.lineStyle(1, 0xffc76a, 0.25)
    this.stage.lineBetween(0, height - 220, width, height - 220)
  }
  getScrollSpeed(): number { return 35 }
  shutdown(): void {
    this.gridLayer?.destroy()
    this.stage?.destroy()
    this.gridLayer = undefined
    this.stage = undefined
    // Cached tile is reused on scene restart and freed with the texture manager.
  }
}
