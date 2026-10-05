import type { GameObjects, Scene } from 'phaser'

const CONFIG = {
  scrollSpeedFactor: 0.6,
  priceHalfLifeMs: 300,
  zoomHalfLifeMs: 2500,
  centerHalfLifeMs: 3500,
  windowMs: 30000,
  targetViewRatio: 0.65,
  minPointSpacingPx: 2.5,
  maxZoom: 9000,
  minZoom: 40,
  ribbonHeight: 45,
  LOSS_THRESHOLD: -10,
  PROFIT_THRESHOLD: 10,
} as const

type PriceData = {
  price: number
}

type SnakeGraphUpdateArgs = {
  delta: number
  priceData: PriceData | null
  isPlaying: boolean
  firstPrice: number | null
  width: number
  height: number
  pixelsPerMs: number
  hudHeight?: number
}

interface ShardParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: number
  rotation: number
  rotationSpeed: number
  size: number
  shardType: number
  phase: number
}

interface FlashRing {
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
  maxLife: number
  color: number
}

export class SnakePriceGraph {
  private history: { time: number; price: number; pct: number }[] = []
  private currentDisplayedPrice: number | null = null
  private startPrice: number | null = null
  private currentZoom: number | null = null
  private currentCenterPct: number | null = null
  private scene: Scene | null = null
  private isAnimating = false
  private graphExploded = false
  private currentCurvePoints: { x: number; y: number }[] = []
  private shardParticles: ShardParticle[] = []
  private flashRings: FlashRing[] = []
  private particleGraphics: GameObjects.Graphics | null = null
  private flashOverlay: GameObjects.Graphics | null = null
  private flashAlpha = 0
  private flashColor = 0xff0000

  private readonly MAX_SHARDS = 300
  private readonly MAX_FLASH_RINGS = 8

  constructor(private graphics: GameObjects.Graphics) {}

  setScene(scene: Scene): void {
    this.scene = scene
    this.particleGraphics = scene.add.graphics()
    this.particleGraphics.setDepth(-0.3)
    this.flashOverlay = scene.add.graphics()
    this.flashOverlay.setDepth(-0.1)
    this.flashOverlay.setBlendMode(Phaser.BlendModes.ADD)
  }

  reset(): void {
    this.graphics.clear()
    this.history = []
    this.currentDisplayedPrice = null
    this.startPrice = null
    this.currentZoom = null
    this.currentCenterPct = null
    this.isAnimating = false
    this.graphExploded = false
    this.currentCurvePoints = []
    this.shardParticles = []
    this.flashRings = []
    this.flashAlpha = 0

    if (this.particleGraphics) this.particleGraphics.clear()
    if (this.flashOverlay) this.flashOverlay.clear()
  }

  triggerLiquidationAnimation(): void {
    if (this.isAnimating) return
    this.isAnimating = true
    this.graphExploded = true
    this.flashColor = 0xff0000
    this.flashAlpha = 0.6

    if (this.scene) {
      this.scene.cameras.main.shake(150, 0.008)
    }

    this.explodeEntireGraph(0xff0000)
  }

  triggerCloseAnimation(finalPct: number): void {
    if (this.isAnimating) return
    this.isAnimating = true

    if (finalPct >= CONFIG.PROFIT_THRESHOLD) {
      this.flashColor = 0x00ff88
      this.flashAlpha = 0.5
      if (this.scene) {
        this.scene.cameras.main.shake(100, 0.004)
      }
      this.explodeEntireGraph(0x00ff88)
    } else if (finalPct <= CONFIG.LOSS_THRESHOLD) {
      this.flashColor = 0xff0000
      this.flashAlpha = 0.5
      if (this.scene) {
        this.scene.cameras.main.shake(100, 0.004)
      }
      this.explodeEntireGraph(0xff0000)
    } else {
      this.flashColor = finalPct >= 0 ? 0x00ff88 : 0xff0000
      this.flashAlpha = 0.25
      this.explodeEntireGraph(this.flashColor)
    }
  }

  update({
    delta,
    priceData,
    isPlaying,
    firstPrice,
    width,
    height,
    pixelsPerMs,
    hudHeight = 128,
  }: SnakeGraphUpdateArgs): void {
    if (!priceData || !isPlaying || firstPrice === null || firstPrice === undefined) {
      this.reset()
      return
    }

    if (this.graphExploded) {
      this.updateAnimations(delta, width, height)
      return
    }

    if (this.startPrice === null) {
      this.startPrice = firstPrice
    } else if (this.startPrice !== firstPrice) {
      const oldFirstPrice = this.startPrice
      this.startPrice = firstPrice

      if (this.currentCenterPct !== null) {
        const centeredPrice = oldFirstPrice * (1 + this.currentCenterPct / 100)
        this.currentCenterPct = ((centeredPrice - firstPrice) / firstPrice) * 100
      }

      for (const pt of this.history) {
        pt.pct = ((pt.price - firstPrice) / firstPrice) * 100
      }
    }

    const now = Date.now()
    const targetPrice = priceData.price

    if (this.currentDisplayedPrice === null) {
      this.currentDisplayedPrice = targetPrice
    } else {
      const t = 1 - Math.pow(0.5, delta / Math.max(1, CONFIG.priceHalfLifeMs))
      this.currentDisplayedPrice += (targetPrice - this.currentDisplayedPrice) * t
    }

    const currentPct = ((this.currentDisplayedPrice - firstPrice) / firstPrice) * 100
    const effectiveSpd = pixelsPerMs * CONFIG.scrollSpeedFactor
    const lastPt = this.history[this.history.length - 1]

    if (!lastPt || (now - lastPt.time) * effectiveSpd >= CONFIG.minPointSpacingPx) {
      this.history.push({ time: now, price: this.currentDisplayedPrice, pct: currentPct })
    }

    const headX = width / 2
    const maxAgeMs = headX / effectiveSpd + 2000
    this.history = this.history.filter((p) => now - p.time <= maxAgeMs)

    if (this.history.length < 2) return

    const windowStart = now - CONFIG.windowMs
    let windowMin = currentPct
    let windowMax = currentPct

    for (const p of this.history) {
      if (p.time >= windowStart) {
        if (p.pct < windowMin) windowMin = p.pct
        if (p.pct > windowMax) windowMax = p.pct
      }
    }

    let range = windowMax - windowMin
    if (range < 0.001) range = 0.001

    const graphHeight = height - hudHeight
    const centerY = graphHeight / 2
    const topPadding = 30
    const bottomPadding = 80
    const minY = topPadding
    const maxY = graphHeight - bottomPadding
    const clampY = (y: number) => Math.max(minY, Math.min(maxY, y))

    const targetZoom = (graphHeight * CONFIG.targetViewRatio) / range
    const targetCenterPct = (windowMax + windowMin) / 2

    if (this.currentZoom === null) {
      this.currentZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, targetZoom))
    }
    if (this.currentCenterPct === null) {
      this.currentCenterPct = targetCenterPct
    }

    const zoomT = 1 - Math.pow(0.5, delta / Math.max(1, CONFIG.zoomHalfLifeMs))
    const clampedTargetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, targetZoom))
    this.currentZoom += (clampedTargetZoom - this.currentZoom) * zoomT

    const centerT = 1 - Math.pow(0.5, delta / Math.max(1, CONFIG.centerHalfLifeMs))
    this.currentCenterPct += (targetCenterPct - this.currentCenterPct) * centerT

    this.graphics.clear()

    const curvePoints = this.history.map((p) => {
      const x = headX - (now - p.time) * effectiveSpd
      const y = clampY(centerY - (p.pct - this.currentCenterPct!) * this.currentZoom!)
      return { x, y }
    })

    const currentY = clampY(centerY - (currentPct - this.currentCenterPct) * this.currentZoom)
    curvePoints.push({ x: headX, y: currentY })
    this.currentCurvePoints = [...curvePoints]

    const zeroY = centerY - (0 - this.currentCenterPct) * this.currentZoom
    if (zeroY > -100 && zeroY < graphHeight + 100) {
      this.graphics.lineStyle(1.5, 0xffffff, 0.25)
      this.graphics.beginPath()
      this.graphics.moveTo(0, zeroY)
      this.graphics.lineTo(width, zeroY)
      this.graphics.strokePath()
    }

    const coreColor = currentPct >= 0 ? 0x00f3ff : 0xff6600

    this.graphics.fillStyle(coreColor, 0.15)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    for (let i = curvePoints.length - 1; i >= 0; i--) {
      this.graphics.lineTo(curvePoints[i].x, curvePoints[i].y + CONFIG.ribbonHeight)
    }
    this.graphics.closePath()
    this.graphics.fillPath()

    this.graphics.fillStyle(coreColor, 0.25)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    for (let i = curvePoints.length - 1; i >= 0; i--) {
      this.graphics.lineTo(curvePoints[i].x, curvePoints[i].y + 12)
    }
    this.graphics.closePath()
    this.graphics.fillPath()

    this.graphics.lineStyle(6, coreColor, 0.4)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    this.graphics.strokePath()

    this.graphics.lineStyle(2, 0xffffff, 0.9)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    this.graphics.strokePath()

    this.graphics.fillStyle(coreColor, 0.6)
    this.graphics.fillCircle(headX, currentY, 12)

    const duration = 2666
    const phase1 = (now % duration) / duration
    const radius1 = 12 + phase1 * 50.55
    const alpha1 = 0.25 * Math.max(0, 1 - phase1)
    this.graphics.lineStyle(2, coreColor, alpha1)
    this.graphics.strokeCircle(headX, currentY, radius1)

    const phase2 = ((now + duration / 2) % duration) / duration
    const radius2 = 12 + phase2 * 50.55
    const alpha2 = 0.25 * Math.max(0, 1 - phase2)
    this.graphics.lineStyle(2, coreColor, alpha2)
    this.graphics.strokeCircle(headX, currentY, radius2)

    let tipAngle = 0
    if (curvePoints.length > 3) {
      const prev = curvePoints[curvePoints.length - 4]
      tipAngle = Math.atan2(currentY - prev.y, headX - prev.x)
    }

    this.graphics.fillStyle(0xffffff, 1)
    this.graphics.beginPath()

    const cosA = Math.cos(tipAngle)
    const sinA = Math.sin(tipAngle)
    const rotate = (dx: number, dy: number) => ({
      rx: headX + dx * cosA - dy * sinA,
      ry: currentY + dx * sinA + dy * cosA,
    })

    const p1 = rotate(6, 0)
    const p2 = rotate(-6, -6)
    const p3 = rotate(-2, 0)
    const p4 = rotate(-6, 6)

    this.graphics.moveTo(p1.rx, p1.ry)
    this.graphics.lineTo(p2.rx, p2.ry)
    this.graphics.lineTo(p3.rx, p3.ry)
    this.graphics.lineTo(p4.rx, p4.ry)
    this.graphics.closePath()
    this.graphics.fillPath()

    this.updateAnimations(delta, width, height)
  }

  destroy(): void {
    this.particleGraphics?.destroy()
    this.flashOverlay?.destroy()
  }

  private explodeEntireGraph(color: number): void {
    const pointsToExplode = this.currentCurvePoints
    const step = Math.max(1, Math.floor(pointsToExplode.length / 50))

    for (let i = 0; i < pointsToExplode.length; i += step) {
      const pt = pointsToExplode[i]
      this.emitGraphExplosion(pt.x, pt.y, color, 3)
    }

    if (pointsToExplode.length > 0) {
      const head = pointsToExplode[pointsToExplode.length - 1]
      this.emitGraphExplosion(head.x, head.y, color, 15)

      if (this.flashRings.length < this.MAX_FLASH_RINGS) {
        this.flashRings.push({
          x: head.x,
          y: head.y,
          radius: 12,
          maxRadius: 200,
          life: 500,
          maxLife: 500,
          color,
        })
      }
    }
  }

  private emitGraphExplosion(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.shardParticles.length >= this.MAX_SHARDS) break

      const angle = Math.random() * Math.PI * 2
      const speed = 80 + Math.random() * 180
      const shardType = Math.random() < 0.4 ? 0 : Math.random() < 0.5 ? 1 : 2
      const baseSize = shardType === 0 ? 3 + Math.random() * 5 : 2 + Math.random() * 4

      this.shardParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 600 + Math.random() * 400,
        maxLife: 600 + Math.random() * 400,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        size: baseSize,
        shardType,
        phase: 0,
      })
    }
  }

  private updateAnimations(delta: number, width: number, height: number): void {
    if (!this.particleGraphics || !this.flashOverlay) return

    this.updateShardParticles(delta)
    this.updateFlashOverlay(width, height)

    if (this.isAnimating && this.shardParticles.length === 0 && this.flashAlpha < 0.01) {
      this.isAnimating = false
      if (this.graphExploded) {
        this.graphExploded = false
        this.graphics.clear()
        this.history = []
        this.currentDisplayedPrice = null
        this.startPrice = null
        this.currentZoom = null
        this.currentCenterPct = null
        this.currentCurvePoints = []
      }
    }
  }

  private updateShardParticles(delta: number): void {
    if (!this.particleGraphics) return

    const dt = delta / 1000

    for (let i = this.shardParticles.length - 1; i >= 0; i--) {
      const p = this.shardParticles[i]
      const lifeRatio = p.life / p.maxLife

      if (lifeRatio < 0.3) {
        p.phase = 2
      } else if (lifeRatio < 0.6) {
        p.phase = 1
      }

      if (p.phase === 0) {
        p.vy += 60 * dt
        p.vx *= 0.98
        p.vy *= 0.98
      } else if (p.phase === 1) {
        p.vx *= 0.92
        p.vy *= 0.92
        p.vy -= 30 * dt
      } else {
        p.vx *= 0.85
        p.vy *= 0.85
        p.vy -= 50 * dt
        p.size *= 0.96
      }

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.rotationSpeed * dt
      p.life -= delta

      if (p.life <= 0 || p.size < 0.5) {
        this.shardParticles.splice(i, 1)
      }
    }

    this.particleGraphics.clear()
    this.particleGraphics.setBlendMode(Phaser.BlendModes.ADD)

    for (const p of this.shardParticles) {
      const lifeRatio = p.life / p.maxLife
      const alpha = Math.min(1, lifeRatio * 1.5) * 0.85

      if (p.shardType === 0) {
        this.drawShardTriangle(p.x, p.y, p.size, p.rotation, p.color, alpha)
      } else if (p.shardType === 1) {
        this.drawShardVoxel(p.x, p.y, p.size * 0.8, p.rotation, p.color, alpha)
      } else {
        this.drawShardCube(p.x, p.y, p.size * 0.5, p.color, alpha)
      }
    }
  }

  private updateFlashOverlay(width: number, height: number): void {
    if (!this.flashOverlay) return

    this.flashOverlay.clear()

    if (this.flashAlpha > 0) {
      this.flashOverlay.fillStyle(this.flashColor, this.flashAlpha)
      this.flashOverlay.fillRect(0, 0, width, height)

      this.flashAlpha *= 0.92
      if (this.flashAlpha < 0.01) {
        this.flashAlpha = 0
      }
    }
  }

  private drawShardTriangle(
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: number,
    alpha: number
  ): void {
    if (!this.particleGraphics) return

    this.particleGraphics.fillStyle(color, alpha * 0.8)
    this.particleGraphics.beginPath()
    for (let i = 0; i < 3; i++) {
      const angle = rotation + (i * Math.PI * 2) / 3
      const px = x + Math.cos(angle) * size
      const py = y + Math.sin(angle) * size
      if (i === 0) this.particleGraphics.moveTo(px, py)
      else this.particleGraphics.lineTo(px, py)
    }
    this.particleGraphics.closePath()
    this.particleGraphics.fillPath()

    this.particleGraphics.fillStyle(0xffffff, alpha * 0.9)
    this.particleGraphics.beginPath()
    for (let i = 0; i < 3; i++) {
      const angle = rotation + (i * Math.PI * 2) / 3
      const px = x + Math.cos(angle) * size * 0.4
      const py = y + Math.sin(angle) * size * 0.4
      if (i === 0) this.particleGraphics.moveTo(px, py)
      else this.particleGraphics.lineTo(px, py)
    }
    this.particleGraphics.closePath()
    this.particleGraphics.fillPath()
  }

  private drawShardVoxel(
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: number,
    alpha: number
  ): void {
    if (!this.particleGraphics) return

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    this.particleGraphics.fillStyle(color, alpha * 0.7)
    this.particleGraphics.beginPath()
    this.particleGraphics.moveTo(x + cos * size, y + sin * size)
    this.particleGraphics.lineTo(x - sin * size, y + cos * size)
    this.particleGraphics.lineTo(x - cos * size, y - sin * size)
    this.particleGraphics.lineTo(x + sin * size, y - cos * size)
    this.particleGraphics.closePath()
    this.particleGraphics.fillPath()

    this.particleGraphics.fillStyle(0xffffff, alpha * 0.8)
    const coreSize = size * 0.4
    this.particleGraphics.beginPath()
    this.particleGraphics.moveTo(x + cos * coreSize, y + sin * coreSize)
    this.particleGraphics.lineTo(x - sin * coreSize, y + cos * coreSize)
    this.particleGraphics.lineTo(x - cos * coreSize, y - sin * coreSize)
    this.particleGraphics.lineTo(x + sin * coreSize, y - cos * coreSize)
    this.particleGraphics.closePath()
    this.particleGraphics.fillPath()
  }

  private drawShardCube(x: number, y: number, size: number, color: number, alpha: number): void {
    if (!this.particleGraphics) return

    this.particleGraphics.fillStyle(color, alpha * 0.8)
    this.particleGraphics.fillRect(x - size, y - size, size * 2, size * 2)

    this.particleGraphics.fillStyle(0xffffff, alpha)
    this.particleGraphics.fillRect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6)
  }
}
