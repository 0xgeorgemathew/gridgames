import type { GameObjects } from 'phaser'

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

export class SnakePriceGraph {
  private history: { time: number; price: number; pct: number }[] = []
  private currentDisplayedPrice: number | null = null
  private startPrice: number | null = null

  private currentZoom: number | null = null
  private currentCenterPct: number | null = null

  private graphics: GameObjects.Graphics

  constructor(graphics: GameObjects.Graphics) {
    this.graphics = graphics
  }

  reset(): void {
    this.graphics.clear()
    this.history = []
    this.currentDisplayedPrice = null
    this.startPrice = null
    this.currentZoom = null
    this.currentCenterPct = null
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
    if (!priceData || !isPlaying || !firstPrice) {
      this.reset()
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
    // Replaced the ugly vertical block with a high-tech glowing arrow at the exact price point

    // Static multi-layer optical bloom (neon glow core)
    this.graphics.fillStyle(coreColor, 0.6)
    this.graphics.fillCircle(headX, currentY, 12)

    // Outward propagating energy rings (shockwave pulse effect)
    const duration = 2666

    // Pulse Ring 1
    const phase1 = (now % duration) / duration
    // Radius expands outward strictly from the innermost core (12px) to 60px
    const radius1 = 12 + phase1 * 50.55
    // Opacity peaks at 25% and softly fades out as it expands
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
      // Look back a few points to get a stable, readable slope
      const prev = curvePoints[curvePoints.length - 4]
      tipAngle = Math.atan2(currentY - prev.y, headX - prev.x)
    }

    // Sleek white swallowtail/chevron pointing forward and tilting
    this.graphics.fillStyle(0xffffff, 1.0)
    this.graphics.beginPath()

    const cosA = Math.cos(tipAngle)
    const sinA = Math.sin(tipAngle)

    // Local rotation helper
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
  }
}
