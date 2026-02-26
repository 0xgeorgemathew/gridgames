import Phaser, { GameObjects, Scene } from 'phaser'

const GRID_CONFIG = {
  color: 0x00f3ff,
  minCellWidth: 42,
  maxCellWidth: 72,
  minCellHeight: 30,
  maxCellHeight: 56,
  majorXEvery: 3,
  majorYEvery: 3,
  scrollSpeed: 35,
  textureKey: 'trading-grid-tile',
} as const

export class GridBackgroundSystem {
  private scene: Scene
  private gridScrollX = 0
  private gridLayer!: GameObjects.TileSprite
  private backgroundImage!: GameObjects.Image

  constructor(scene: Scene) {
    this.scene = scene
  }

  create(): void {
    this.createVignetteBackground()

    this.backgroundImage = this.scene.add.image(0, 0, 'vignette-bg')
    this.backgroundImage.setOrigin(0, 0)
    this.backgroundImage.setDepth(-2)
    this.ensureGridLayer()
  }

  update(delta: number): void {
    this.updateGrid(delta)
  }

  handleResize(): void {
    this.createVignetteBackground()
    this.drawGridBackground()
  }

  shutdown(): void {
    this.gridLayer?.destroy()
    if (this.scene.textures.exists(GRID_CONFIG.textureKey)) {
      this.scene.textures.remove(GRID_CONFIG.textureKey)
    }
    this.backgroundImage?.destroy()
  }

  getScrollSpeed(): number {
    return GRID_CONFIG.scrollSpeed
  }

  private drawGridBackground(): void {
    this.backgroundImage.setDisplaySize(
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    )
    this.ensureGridLayer()
  }

  private getGridCellSize() {
    const width = this.scene.cameras.main.width
    const height = this.scene.cameras.main.height

    return {
      cellWidth: Math.round(
        Math.max(GRID_CONFIG.minCellWidth, Math.min(GRID_CONFIG.maxCellWidth, width / 9))
      ),
      cellHeight: Math.round(
        Math.max(GRID_CONFIG.minCellHeight, Math.min(GRID_CONFIG.maxCellHeight, height / 14))
      ),
    }
  }

  private buildGridTexture(): void {
    const { cellWidth, cellHeight } = this.getGridCellSize()
    const tileWidth = Math.max(300, cellWidth * 12)
    const tileHeight = Math.max(200, cellHeight * 8)

    const canvas = document.createElement('canvas')
    canvas.width = tileWidth
    canvas.height = tileHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, tileWidth, tileHeight)

    const bgGradient = ctx.createRadialGradient(
      tileWidth / 2,
      tileHeight / 2,
      0,
      tileWidth / 2,
      tileHeight / 2,
      Math.max(tileWidth, tileHeight)
    )
    bgGradient.addColorStop(0, 'rgba(0, 188, 255, 0.0375)')
    bgGradient.addColorStop(1, 'rgba(0, 50, 100, 0.0)')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, tileWidth, tileHeight)

    const drawH = (y: number) => {
      ctx.strokeStyle = 'rgba(0, 188, 255, 0.0625)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(tileWidth, y)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(tileWidth, y)
      ctx.stroke()
    }

    const drawV = (x: number) => {
      ctx.strokeStyle = 'rgba(0, 188, 255, 0.0625)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, tileHeight)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, tileHeight)
      ctx.stroke()
    }

    const rows = Math.ceil(tileHeight / cellHeight)
    const cols = Math.ceil(tileWidth / cellWidth)

    for (let j = 0; j < rows; j++) {
      const y = j * cellHeight
      drawH(y)
    }

    for (let i = 0; i < cols; i++) {
      const x = i * cellWidth
      drawV(x)
    }

    for (let i = 0; i < cols; i++) {
      const x = i * cellWidth

      for (let j = 0; j < rows; j++) {
        const y = j * cellHeight

        ctx.fillStyle = 'rgba(0, 243, 255, 0.375)'
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1)
      }
    }

    if (this.scene.textures.exists(GRID_CONFIG.textureKey)) {
      this.scene.textures.remove(GRID_CONFIG.textureKey)
    }
    this.scene.textures.addCanvas(GRID_CONFIG.textureKey, canvas)
  }

  private configureGridBloom(): void {
    const bloomPipeline = this.gridLayer.getPostPipeline('BloomPostFX') as any
    if (!bloomPipeline) return

    if (typeof bloomPipeline.setBlurStrength === 'function') {
      bloomPipeline.setBlurStrength(1.15)
    } else if ('strength' in bloomPipeline) {
      bloomPipeline.strength = 1.15
    } else if ('blurStrength' in bloomPipeline) {
      bloomPipeline.blurStrength = 1.15
    }

    if (typeof bloomPipeline.setBlurQuality === 'function') {
      bloomPipeline.setBlurQuality(2)
    } else if ('blurQuality' in bloomPipeline) {
      bloomPipeline.blurQuality = 2
    }
  }

  private ensureGridLayer(): void {
    const width = this.scene.cameras.main.width
    const height = this.scene.cameras.main.height

    this.buildGridTexture()

    if (!this.gridLayer) {
      this.gridLayer = this.scene.add.tileSprite(0, 0, width, height, GRID_CONFIG.textureKey)
      this.gridLayer.setOrigin(0, 0)
      this.gridLayer.setDepth(-1)
      this.gridLayer.setBlendMode(Phaser.BlendModes.ADD)
      this.gridLayer.setPostPipeline('BloomPostFX')
      this.configureGridBloom()
    } else {
      this.gridLayer.setTexture(GRID_CONFIG.textureKey)
      this.gridLayer.setPosition(0, 0)
      this.gridLayer.setSize(width, height)
      this.gridLayer.setDisplaySize(width, height)
      this.configureGridBloom()
    }
  }

  private updateGrid(delta: number): void {
    const time = this.scene.time.now / 1000
    const pulseIntensity = 0.4 + Math.sin(time * 2) * 0.15

    this.gridScrollX += (GRID_CONFIG.scrollSpeed * delta) / 1000
    this.gridLayer.tilePositionX = this.gridScrollX
    this.gridLayer.setAlpha(0.98 + pulseIntensity * 0.14)
  }

  private createVignetteBackground(): void {
    const width = this.scene.cameras.main.width
    const height = this.scene.cameras.main.height

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.max(width, height) / 1.5
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius)

    gradient.addColorStop(0, 'rgba(8, 25, 32, 0.5)')
    gradient.addColorStop(0.6, 'rgba(3, 8, 10, 0.7)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const textureKey = 'vignette-bg'
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey)
    }
    this.scene.textures.addCanvas(textureKey, canvas)

    if (this.backgroundImage) {
      this.backgroundImage.setTexture(textureKey)
      this.backgroundImage.setDisplaySize(width, height)
    }
  }
}
