import type { GameObjects, Scene } from 'phaser'

// Elegant, physics-based smoothing configuration
const CONFIG = {
  // Constant X-axis speed (fraction of background scroll speed). NO time dilation.
  scrollSpeedFactor: 0.6,

  // Price smoothing: how fast the displayed path catches up to raw market data
  priceHalfLifeMs: 300,

  // Camera Zoom (Amplitude) smoothing: dampens high vol, amplifies low vol
  zoomHalfLifeMs: 2500,

  // Camera Center tracking: smoothly pans up/down to keep price centered
  centerHalfLifeMs: 3500,

  // Time window to evaluate recent high/lows - widened for better UX stability
  windowMs: 30000,

  // What percentage of available vertical screen space should the recent range fill
  targetViewRatio: 0.65,

  // Minimum spacing between saved points (prevents jagged zig-zags and overdrawing)
  minPointSpacingPx: 2.5,

  // Absolute limits on zoom
  maxZoom: 9000, // Max amplification for extremely calm markets
  minZoom: 40, // Max dampening for extremely volatile markets

  // Ribbon Visuals
  ribbonHeight: 45, // How tall the solid light wall is (Tron Trail)

  // Threshold for animation styling
  LOSS_THRESHOLD: -10, // Price% - triggers loss-style animation
  PROFIT_THRESHOLD: 10, // Price% - triggers profit-style animation
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

// Tron-style geometric shard particle for animations
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
  shardType: number // 0 = triangle, 1 = voxel, 2 = cube
  phase: number // 0 = shatter, 1 = float, 2 = evaporate
}

// Flash ring that expands outward
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

  private graphics: GameObjects.Graphics
  private scene: Scene | null = null

  // Animation state
  private isAnimating = false
  private graphExploded = false

  // Current head position (for animation emission)
  private currentHeadX = 0
  private currentHeadY = 0
  private currentCoreColor = 0x00f3ff

  // Current curve points for explosion emission
  private currentCurvePoints: { x: number; y: number }[] = []

  // Particle system
  private shardParticles: ShardParticle[] = []
  private flashRings: FlashRing[] = []
  private particleGraphics: GameObjects.Graphics | null = null
  private flashOverlay: GameObjects.Graphics | null = null

  // Flash overlay state
  private flashAlpha = 0
  private flashColor = 0xff0000

  private readonly MAX_SHARDS = 300
  private readonly MAX_FLASH_RINGS = 8

  constructor(graphics: GameObjects.Graphics) {
    this.graphics = graphics
  }

  /**
   * Set scene reference for camera shake and particle effects
   */
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

    // Reset animation state
    this.isAnimating = false
    this.graphExploded = false
    this.currentCurvePoints = []

    // Clear particles
    this.shardParticles = []
    this.flashRings = []
    this.flashAlpha = 0

    if (this.particleGraphics) this.particleGraphics.clear()
    if (this.flashOverlay) this.flashOverlay.clear()
  }

  /**
   * Trigger liquidation animation (red flash, particles, shake)
   * Called externally when position_liquidated event is received
   */
  triggerLiquidationAnimation(): void {
    if (this.isAnimating) return
    this.isAnimating = true
    this.graphExploded = true

    // 1. Flash the graph red
    this.flashColor = 0xff0000
    this.flashAlpha = 0.6

    // 2. Camera shake (strong)
    if (this.scene) {
      this.scene.cameras.main.shake(150, 0.008)
    }

    // 3. Explode the entire graph (de-rez effect)
    this.explodeEntireGraph(0xff0000)
  }

  /**
   * Trigger close animation based on final price change
   * Called externally when position is closed
   */
  triggerCloseAnimation(finalPct: number): void {
    if (this.isAnimating) return
    this.isAnimating = true
    this.graphExploded = true

    // Determine animation style based on profit/loss
    if (finalPct >= CONFIG.PROFIT_THRESHOLD) {
      // Profit - green celebration
      this.flashColor = 0x00ff88
      this.flashAlpha = 0.5
      if (this.scene) {
        this.scene.cameras.main.shake(100, 0.004)
      }
      this.explodeEntireGraph(0x00ff88)
    } else if (finalPct <= CONFIG.LOSS_THRESHOLD) {
      // Loss - red animation
      this.flashColor = 0xff0000
      this.flashAlpha = 0.5
      if (this.scene) {
        this.scene.cameras.main.shake(100, 0.004)
      }
      this.explodeEntireGraph(0xff0000)
    } else {
      // Neutral - dimmer flash based on direction
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
    // Note: firstPrice can be 0 (valid), so check for null/undefined explicitly
    if (!priceData || !isPlaying || firstPrice === null || firstPrice === undefined) {
      this.reset()
      return
    }

    // If graph has exploded, only update particles
    if (this.graphExploded) {
      this.updateAnimations(delta, width, height)
      return
    }

    if (this.startPrice === null) {
      this.startPrice = firstPrice
    } else if (this.startPrice !== firstPrice) {
      const oldFirstPrice = this.startPrice
      this.startPrice = firstPrice

      // Shift center tracking to match new percentage scale gracefully
      if (this.currentCenterPct !== null) {
        const centeredPrice = oldFirstPrice * (1 + this.currentCenterPct / 100)
        this.currentCenterPct = ((centeredPrice - firstPrice) / firstPrice) * 100
      }

      // Recalculate historical percentages to seamlessly shift the graph relative to new baseline
      for (const pt of this.history) {
        pt.pct = ((pt.price - firstPrice) / firstPrice) * 100
      }
    }
    const now = Date.now()
    const targetPrice = priceData.price

    // 1. Smooth the Price
    if (this.currentDisplayedPrice === null) {
      this.currentDisplayedPrice = targetPrice
    } else {
      const t = 1 - Math.pow(0.5, delta / Math.max(1, CONFIG.priceHalfLifeMs))
      this.currentDisplayedPrice += (targetPrice - this.currentDisplayedPrice) * t
    }

    const currentPct = ((this.currentDisplayedPrice - firstPrice) / firstPrice) * 100

    // 2. Constant Velocity X-Axis
    const effectiveSpd = pixelsPerMs * CONFIG.scrollSpeedFactor

    const lastPt = this.history[this.history.length - 1]
    if (!lastPt || (now - lastPt.time) * effectiveSpd >= CONFIG.minPointSpacingPx) {
      this.history.push({ time: now, price: this.currentDisplayedPrice, pct: currentPct })
    }

    const headX = width / 2

    // Cull old points
    const maxAgeMs = headX / effectiveSpd + 2000
    this.history = this.history.filter((p) => now - p.time <= maxAgeMs)

    if (this.history.length < 2) return

    // 3. Evaluate Volatility (Recent Highs & Lows)
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

    // Padding to keep chevron and trail within visible graph area
    const topPadding = 30
    const bottomPadding = 80
    const minY = topPadding
    const maxY = graphHeight - bottomPadding

    // Clamp helper for Y values
    const clampY = (y: number) => Math.max(minY, Math.min(maxY, y))

    // 4. Calculate Targets for dynamic scaling
    const targetZoom = (graphHeight * CONFIG.targetViewRatio) / range
    const targetCenterPct = (windowMax + windowMin) / 2

    // 5. Smoothly Transition Camera
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

    // 6. Draw the Blade / Light Cycle Trail
    this.graphics.clear()

    // Map history to screen coordinates with Y clamping
    const curvePoints = this.history.map((p) => {
      const x = headX - (now - p.time) * effectiveSpd
      const y = clampY(centerY - (p.pct - this.currentCenterPct!) * this.currentZoom!)
      return { x, y }
    })

    // Attach true current head position with Y clamping
    const currentY = clampY(centerY - (currentPct - this.currentCenterPct) * this.currentZoom)
    curvePoints.push({ x: headX, y: currentY })

    // Store for explosion emission
    this.currentCurvePoints = [...curvePoints]
    this.currentHeadX = headX
    this.currentHeadY = currentY

    // UX Visual Anchor: Zero Line (Start Price Baseline)
    const zeroY = centerY - (0 - this.currentCenterPct) * this.currentZoom
    if (zeroY > -100 && zeroY < graphHeight + 100) {
      this.graphics.lineStyle(1.5, 0xffffff, 0.25)
      this.graphics.beginPath()
      this.graphics.moveTo(0, zeroY)
      this.graphics.lineTo(width, zeroY)
      this.graphics.strokePath()
    }

    // Colors: Tron Legacy Cyan vs Tron Legacy Orange
    const isAboveStart = currentPct >= 0
    // Profit: Tron Cyan (0x00f3ff) | Loss: Tron Orange (0xff6600)
    const coreColor = isAboveStart ? 0x00f3ff : 0xff6600
    this.currentCoreColor = coreColor

    // --- TRON LIGHT CYCLE RIBBON (WALL OF LIGHT) --- //

    // Layer 1: Ambient Ribbon Wall (Fills downward to create a 3D strip)
    this.graphics.fillStyle(coreColor, 0.15)
    this.graphics.beginPath()
    // Forward edge (top of ribbon)
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    // Backward edge (bottom of ribbon)
    for (let i = curvePoints.length - 1; i >= 0; i--) {
      this.graphics.lineTo(curvePoints[i].x, curvePoints[i].y + CONFIG.ribbonHeight)
    }
    this.graphics.closePath()
    this.graphics.fillPath()

    // Layer 2: Inner denser ribbon (gives depth to the blade)
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

    // Layer 3: Top Edge Glow (Thick translucent line)
    this.graphics.lineStyle(6, coreColor, 0.4)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    this.graphics.strokePath()

    // Layer 4: The Blade (Crisp, over-bright core)
    this.graphics.lineStyle(2, 0xffffff, 0.9)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    this.graphics.strokePath()

    // --- LEADING INDICATOR (The Tip) --- //

    // Static multi-layer optical bloom (neon glow core)
    this.graphics.fillStyle(coreColor, 0.6)
    this.graphics.fillCircle(headX, currentY, 12)

    // Outward propagating energy rings (shockwave pulse effect)
    const duration = 2666

    // Pulse Ring 1
    const phase1 = (now % duration) / duration
    const radius1 = 12 + phase1 * 50.55
    const alpha1 = 0.25 * Math.max(0, 1 - phase1)
    this.graphics.lineStyle(2, coreColor, alpha1)
    this.graphics.strokeCircle(headX, currentY, radius1)

    // Pulse Ring 2 (Offset by half the duration for continuous emission)
    const phase2 = ((now + duration / 2) % duration) / duration
    const radius2 = 12 + phase2 * 50.55
    const alpha2 = 0.25 * Math.max(0, 1 - phase2)
    this.graphics.lineStyle(2, coreColor, alpha2)
    this.graphics.strokeCircle(headX, currentY, radius2)

    // Calculate smooth trajectory angle for the chevron tip
    let tipAngle = 0
    if (curvePoints.length > 3) {
      const prev = curvePoints[curvePoints.length - 4]
      tipAngle = Math.atan2(currentY - prev.y, headX - prev.x)
    }

    // Sleek white swallowtail/chevron pointing forward and tilting
    this.graphics.fillStyle(0xffffff, 1.0)
    this.graphics.beginPath()

    const cosA = Math.cos(tipAngle)
    const sinA = Math.sin(tipAngle)

    const rotate = (dx: number, dy: number) => ({
      rx: headX + dx * cosA - dy * sinA,
      ry: currentY + dx * sinA + dy * cosA,
    })

    const p1 = rotate(6, 0) // Forward nose
    const p2 = rotate(-6, -6) // Top wing
    const p3 = rotate(-2, 0) // Inner swallowtail
    const p4 = rotate(-6, 6) // Bottom wing

    this.graphics.moveTo(p1.rx, p1.ry)
    this.graphics.lineTo(p2.rx, p2.ry)
    this.graphics.lineTo(p3.rx, p3.ry)
    this.graphics.lineTo(p4.rx, p4.ry)
    this.graphics.closePath()
    this.graphics.fillPath()

    // Update animations
    this.updateAnimations(delta, width, height)
  }

  // ==================== ANIMATION METHODS ====================

  /**
   * Explode the entire visible graph into particles (de-rez effect)
   */
  private explodeEntireGraph(color: number): void {
    const pointsToExplode = this.currentCurvePoints
    const step = Math.max(1, Math.floor(pointsToExplode.length / 50))

    for (let i = 0; i < pointsToExplode.length; i += step) {
      const pt = pointsToExplode[i]
      this.emitGraphExplosion(pt.x, pt.y, color, 3)
    }

    // Extra burst at the head position
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

  /**
   * Emit particles for graph explosion
   */
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

  /**
   * Update all animations
   */
  private updateAnimations(delta: number, width: number, height: number): void {
    if (!this.particleGraphics || !this.flashOverlay) return

    this.updateShardParticles(delta)
    this.updateFlashOverlay(width, height)

    // Reset animation state when all particles are gone - allows graph to resume
    if (this.graphExploded && this.shardParticles.length === 0 && this.flashAlpha < 0.01) {
      this.graphExploded = false
      this.isAnimating = false
      this.graphics.clear()
      this.history = []
      this.currentCurvePoints = []
    }
  }

  /**
   * Update shard particles
   */
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

    // Draw shards
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

  /**
   * Update full-screen flash overlay
   */
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

  // Shard drawing helpers
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

  /**
   * Clean up graphics resources
   */
  destroy(): void {
    this.particleGraphics?.destroy()
    this.flashOverlay?.destroy()
  }
}
