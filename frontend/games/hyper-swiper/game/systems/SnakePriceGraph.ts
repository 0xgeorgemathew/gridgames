import type { GameObjects } from 'phaser'
import { Math as PhaserMath } from 'phaser'

const ARCADE_GRAPH_CONFIG = {
  visualMultiplier: 100, // Exaggerate small moves for arcade feel
  minRange: 10, // Minimum display range to prevent extreme sensitivity
  autoScalePadding: 1.333, // Target ~75% graph utilization
  leverage: 500, // For liquidation calculation
} as const

const VOLATILITY_WINDOW_MS = 30000
const BASE_SMOOTHING_HALF_LIFE_MS = 260
const MIN_SMOOTHING_HALF_LIFE_MS = 160
const MAX_SMOOTHING_HALF_LIFE_MS = 560
const TARGET_VOLATILITY_RANGE_PCT = 0.1

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
}

export class SnakePriceGraph {
  private priceHistory: { time: number; price: number }[] = []
  private rawPriceHistory: { time: number; price: number }[] = []
  private displayedPrice: number | null = null
  private momentumBoost = 0
  private lastRawDisplayValue = 0
  private graphics: GameObjects.Graphics

  constructor(graphics: GameObjects.Graphics) {
    this.graphics = graphics
  }

  reset(): void {
    this.graphics.clear()
    this.priceHistory = []
    this.rawPriceHistory = []
    this.displayedPrice = null
    this.momentumBoost = 0
    this.lastRawDisplayValue = 0
  }

  update({
    delta,
    priceData,
    isPlaying,
    firstPrice,
    width,
    height,
    pixelsPerMs,
  }: SnakeGraphUpdateArgs): void {
    if (!priceData || !isPlaying || !firstPrice) {
      this.reset()
      return
    }

    const now = Date.now()

    this.rawPriceHistory.push({ time: now, price: priceData.price })
    this.rawPriceHistory = this.rawPriceHistory.filter((p) => now - p.time <= VOLATILITY_WINDOW_MS)

    const rawPcts = this.rawPriceHistory.map(
      (p) => ((p.price - firstPrice) / firstPrice) * 100
    )
    const currentRawPct = ((priceData.price - firstPrice) / firstPrice) * 100
    const rawMinPct = Math.min(...rawPcts, currentRawPct)
    const rawMaxPct = Math.max(...rawPcts, currentRawPct)
    const rawRangePct = Math.max(0.01, rawMaxPct - rawMinPct)

    const volatilityScale = PhaserMath.Clamp(rawRangePct / TARGET_VOLATILITY_RANGE_PCT, 0.6, 2.5)
    const smoothingHalfLifeMs = PhaserMath.Clamp(
      BASE_SMOOTHING_HALF_LIFE_MS * volatilityScale,
      MIN_SMOOTHING_HALF_LIFE_MS,
      MAX_SMOOTHING_HALF_LIFE_MS
    )

    if (this.displayedPrice === null) {
      this.displayedPrice = priceData.price
    }

    const t = 1 - Math.pow(0.5, delta / smoothingHalfLifeMs)
    this.displayedPrice = PhaserMath.Linear(this.displayedPrice, priceData.price, t)

    const headX = width / 2

    const lastPoint = this.priceHistory[this.priceHistory.length - 1]
    if (!lastPoint || (now - lastPoint.time) * pixelsPerMs >= 1) {
      this.priceHistory.push({ time: now, price: this.displayedPrice })
    }

    const maxAgeMs = headX / pixelsPerMs + 1000
    this.priceHistory = this.priceHistory.filter((p) => now - p.time <= maxAgeMs)

    if (this.priceHistory.length < 2) {
      return
    }

    const startPrice = firstPrice

    const recentHistory = this.priceHistory.filter((p) => now - p.time <= VOLATILITY_WINDOW_MS)
    const recentPcts = recentHistory.map((p) => ((p.price - startPrice) / startPrice) * 100)
    const currentPct = ((this.displayedPrice - startPrice) / startPrice) * 100

    const recentMinPct = Math.min(...recentPcts, currentPct)
    const recentMaxPct = Math.max(...recentPcts, currentPct)
    const recentRangePct = Math.max(0.01, recentMaxPct - recentMinPct)
    const recentMidPct = (recentMaxPct + recentMinPct) / 2

    const targetFillRatio = 0.75
    const rawMultiplier = targetFillRatio / (recentRangePct / 2)
    const visualMultiplier = Math.max(100, Math.min(2000, rawMultiplier))

    const displayValues = this.priceHistory.map((p) => {
      const priceChangePct = ((p.price - startPrice) / startPrice) * 100
      return priceChangePct * visualMultiplier
    })

    const rawCurrentDisplayValue = currentPct * visualMultiplier
    const velocity = rawCurrentDisplayValue - this.lastRawDisplayValue
    this.lastRawDisplayValue = rawCurrentDisplayValue

    const kBoost = 0.03
    const instantBoost = Math.min(0.25, Math.abs(velocity) * kBoost)

    this.momentumBoost = Math.max(0, this.momentumBoost - (0.25 * delta) / 320)
    this.momentumBoost = Math.max(this.momentumBoost, instantBoost)

    const boostFactor = 1 + this.momentumBoost
    const currentDisplayValue = rawCurrentDisplayValue * boostFactor

    const maxAbsValue = (recentRangePct / 2) * visualMultiplier
    const paddedMax = Math.max(maxAbsValue * ARCADE_GRAPH_CONFIG.autoScalePadding, 0.01 * visualMultiplier)
    const centerDisplayValue = recentMidPct * visualMultiplier

    const hudHeight = 128
    const graphHeight = height - hudHeight
    const centerY = graphHeight / 2

    this.graphics.clear()

    const zeroLineY = centerY - ((0 - centerDisplayValue) / paddedMax) * (graphHeight / 2)

    if (zeroLineY > -100 && zeroLineY < graphHeight + 100) {
      this.graphics.lineStyle(1, 0xffffff, 0.2)
      this.graphics.beginPath()
      this.graphics.moveTo(0, zeroLineY)
      this.graphics.lineTo(width, zeroLineY)
      this.graphics.strokePath()
    }

    const curvePoints = displayValues.map((value, i) => {
      const point = this.priceHistory[i]
      const timeDiff = now - point.time
      const x = headX - timeDiff * pixelsPerMs
      const y = centerY - ((value - centerDisplayValue) / paddedMax) * (graphHeight / 2)
      return { x, y }
    })

    const currentY =
      centerY - ((currentDisplayValue - centerDisplayValue) / paddedMax) * (graphHeight / 2)
    curvePoints.push({ x: headX, y: currentY })

    const isAboveZero = currentDisplayValue >= 0
    const lineColor = isAboveZero ? 0x00ff88 : 0xff4466
    const glowColor = isAboveZero ? 0x00ff88 : 0xff4466

    this.graphics.lineStyle(8, glowColor, 0.25)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    this.graphics.strokePath()

    this.graphics.lineStyle(2, lineColor, 0.65)
    this.graphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.graphics.moveTo(pt.x, pt.y)
      else this.graphics.lineTo(pt.x, pt.y)
    })
    this.graphics.strokePath()

    this.graphics.fillStyle(0xffffff, 0.7)
    this.graphics.fillCircle(headX, currentY, 4)
    this.graphics.fillStyle(glowColor, 0.4)
    this.graphics.fillCircle(headX, currentY, 12)
  }
}
