import { Scene, GameObjects, Geom, Physics } from 'phaser'
import { useTradingStore, type PhaserEventBridge } from '../stores/trading-store'
import type { CoinType, CoinSpawnEvent } from '../types/trading'
import { Token } from '../objects/Token'
import { DEFAULT_BTC_PRICE } from '@/lib/formatPrice'

// Import extracted systems
import { ParticleSystem } from '../systems/ParticleSystem'
import { CoinRenderer, COIN_CONFIG } from '../systems/CoinRenderer'
import { SpatialGrid } from '../systems/SpatialGrid'
import { VisualEffects } from '../systems/VisualEffects'
import { BladeRenderer } from '../systems/BladeRenderer'
import { AudioManager } from '../systems/AudioManager'

// =============================================================================
// Visual Configuration
// =============================================================================

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

// Arcade graph configuration for500× leverage
const ARCADE_GRAPH_CONFIG = {
  visualMultiplier: 100, // Exaggerate small moves for arcade feel
  minRange: 10, // Minimum display range to prevent extreme sensitivity
  autoScalePadding: 1.333, // Target ~75% graph utilization
  leverage: 500, // For liquidation calculation
} as const

const VOLATILITY_WINDOW_MS = 30000
const BASE_SMOOTHING_HALF_LIFE_MS = 180
const MIN_SMOOTHING_HALF_LIFE_MS = 120
const MAX_SMOOTHING_HALF_LIFE_MS = 420
const TARGET_VOLATILITY_RANGE_PCT = 0.12

export class TradingScene extends Scene {
  // Game objects
  private tokenPool!: GameObjects.Group

  // Grid
  private gridLayer!: GameObjects.TileSprite
  private backgroundImage!: GameObjects.Image

  // Collision detection
  private collisionLine = new Geom.Line(0, 0, 0, 0)
  private collisionCircle = new Geom.Circle(0, 0, 0)

  // Extracted systems
  private particles!: ParticleSystem
  private coinRenderer!: CoinRenderer
  private spatialGrid!: SpatialGrid
  private visualEffects!: VisualEffects
  private bladeRenderer!: BladeRenderer
  private audio!: AudioManager

  // State
  private isShutdown = false
  private isMobile = false
  private gridScrollX = 0
  private eventEmitter: Phaser.Events.EventEmitter

  // Window visibility handlers for cleanup
  private visibilityChangeHandler?: () => void
  private windowBlurHandler?: () => void

  // Snake Graph
  private priceHistory: { time: number; price: number }[] = []
  private rawPriceHistory: { time: number; price: number }[] = []
  private snakeGraphics!: Phaser.GameObjects.Graphics
  private displayedPrice: number | null = null
  private momentumBoost = 0
  private lastRawDisplayValue = 0

  constructor() {
    super({ key: 'TradingScene' })
    this.eventEmitter = new Phaser.Events.EventEmitter()
  }

  preload(): void {
    // Preload audio assets
    this.audio = new AudioManager(this)
    this.audio.preload()
  }

  create(): void {
    this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS
    this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height)

    // Initialize systems
    this.particles = new ParticleSystem(this)
    this.coinRenderer = new CoinRenderer(this)
    this.spatialGrid = new SpatialGrid()
    this.visualEffects = new VisualEffects(this, this.isMobile)
    this.bladeRenderer = new BladeRenderer(this, this.isMobile)
    this.audio.create()

    // Create vignette background texture once
    this.createVignetteBackground()

    // Create background image with vignette texture
    this.backgroundImage = this.add.image(0, 0, 'vignette-bg')
    this.backgroundImage.setOrigin(0, 0)
    this.backgroundImage.setDepth(-2)
    this.ensureGridLayer()

    // Setup snake graph
    this.snakeGraphics = this.add.graphics()
    this.snakeGraphics.setDepth(-0.5)

    // Generate textures (only call and put now)
    this.coinRenderer.generateCachedTextures()

    // Token pool (use regular group since Token manages its own physics in spawn())
    this.tokenPool = this.add.group({
      classType: Token,
      runChildUpdate: true,
      maxSize: 50,
      active: true,
      createCallback: (token) => {
        const t = token as Token
        t.setVisible(false)
        t.setActive(false)
      },
    })

    this.eventEmitter.on('coin_spawn', this.handleCoinSpawn.bind(this))
    this.eventEmitter.on('opponent_slice', this.handleOpponentSlice.bind(this))
    this.eventEmitter.on('clear_coins', this.cleanupCoins.bind(this))
    this.eventEmitter.on('sound_muted', (muted: boolean) => {
      this.audio.setMuted(muted)
    })

    // Listen for Phaser's built-in unlocked event (fires when unlock succeeds)
    // Phaser handles iOS Safari's synchronous resume() requirement internally
    this.sound.on('unlocked', () => {
      console.log('[Phaser] Audio unlocked successfully')
      this.audio.setUnlocked(true)
    })

    // Listen for unlock requests from React UI (still use window.phaserEvents bridge)
    // Required for mobile browsers that start AudioContext in suspended state
    this.eventEmitter.on('unlock_audio', () => {
      // Call Phaser's built-in unlock (handles iOS Safari correctly)
      this.sound.unlock()
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.bladeRenderer.updateBladePath(pointer.x, pointer.y)

      // Play swipe sound on movement using Phaser's built-in smoothed velocity
      // pointer.velocity is automatically calculated each frame with motionFactor smoothing
      const speed = pointer.velocity.length()

      // Skip idle movements (below threshold)
      const MIN_SPEED = 15
      if (speed < MIN_SPEED) return

      // AudioManager handles overlap prevention
      this.audio.playSwipe()
    })

    this.input.on('pointerup', () => this.bladeRenderer.clearBladePath())
    this.input.on('pointerout', () => this.bladeRenderer.clearBladePath())

    // Handle window visibility changes to clear blade when tab loses focus
    // This prevents "ghost blade" artifacts when clicking outside the game window
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        this.bladeRenderer.clearBladePath()
      }
    }
    this.windowBlurHandler = () => {
      this.bladeRenderer.clearBladePath()
    }

    // Use document visibility API for tab switching (Alt+Tab, Cmd+Tab)
    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
    // Also handle window blur for clicking outside the browser
    window.addEventListener('blur', this.windowBlurHandler)
    ;(window as { phaserEvents?: PhaserEventBridge }).phaserEvents = this
      .eventEmitter as PhaserEventBridge
    ;(window as { setSceneReady?: (ready: boolean) => void }).setSceneReady = (ready: boolean) => {
      useTradingStore.getState().isSceneReady = ready
    }
    ;(window as unknown as { setSceneReady?: (ready: boolean) => void }).setSceneReady?.(true)

    // Emit scene_ready to server after Phaser initialization completes
    // This ensures the server waits for both clients before starting the game loop
    const tradingStore = useTradingStore.getState()
    if (tradingStore.socket && tradingStore.socket.connected) {
      tradingStore.socket.emit('scene_ready')
    }

    const updateDimensions = () => {
      if (!this.isCameraAvailable()) return
      ;(window as { sceneDimensions?: { width: number; height: number } }).sceneDimensions = {
        width: this.cameras.main.width,
        height: this.cameras.main.height,
      }
    }

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (!this.isCameraAvailable()) return

      this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height)
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height)
      this.createVignetteBackground()
      this.drawGridBackground()
      updateDimensions()
    })

    updateDimensions()
    setTimeout(updateDimensions, 100)
    setTimeout(updateDimensions, 300)
    setTimeout(updateDimensions, 500)
  }

  update(_time: number, delta: number): void {
    if (this.isShutdown) return

    const clampedDelta = Math.max(4, Math.min(50, delta))

    this.updateGrid(clampedDelta)
    this.updateSnakeGraph(clampedDelta)
    this.updateCoinPhysics()
    this.particles.update(clampedDelta)
    this.bladeRenderer.draw()
    this.checkCollisions()
    this.visualEffects.update()
  }

  private updateSnakeGraph(delta: number): void {
    if (!this.snakeGraphics) return

    // Poll the zustand store directly for the latest price
    const { priceData, isPlaying, firstPrice } = useTradingStore.getState()
    if (!isPlaying || !priceData || !firstPrice) {
      this.snakeGraphics.clear()
      this.priceHistory = []
      this.displayedPrice = null
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

    const volatilityScale = Phaser.Math.Clamp(
      rawRangePct / TARGET_VOLATILITY_RANGE_PCT,
      0.6,
      2.5
    )
    const smoothingHalfLifeMs = Phaser.Math.Clamp(
      BASE_SMOOTHING_HALF_LIFE_MS * volatilityScale,
      MIN_SMOOTHING_HALF_LIFE_MS,
      MAX_SMOOTHING_HALF_LIFE_MS
    )

    // Initialize displayedPrice if null
    if (this.displayedPrice === null) {
      this.displayedPrice = priceData.price
    }

    // Smoothly interpolate displayedPrice towards the actual price
    // Volatility-adjusted half-life for consistent on-screen speed
    const t = 1 - Math.pow(0.5, delta / smoothingHalfLifeMs)
    this.displayedPrice = Phaser.Math.Linear(this.displayedPrice, priceData.price, t)

    const width = this.cameras.main.width
    const height = this.cameras.main.height
    // Anchor the head in the exact horizontal middle of the screen
    const headX = width / 2

    // Calculate how many pixels the grid moves per millisecond
    const pixelsPerMs = GRID_CONFIG.scrollSpeed / 1000

    // Only push points if they are far enough apart visually to save memory (e.g. 1 pixel)
    const lastPoint = this.priceHistory[this.priceHistory.length - 1]
    if (!lastPoint || (now - lastPoint.time) * pixelsPerMs >= 1) {
      this.priceHistory.push({ time: now, price: this.displayedPrice })
    }

    // Keep only points that are still horizontally on screen (between headX and left edge)
    const maxAgeMs = headX / pixelsPerMs + 1000 // +1s buffer offscreen
    this.priceHistory = this.priceHistory.filter((p) => now - p.time <= maxAgeMs)

    if (this.priceHistory.length < 2) {
      return
    }

    // === ARCADE-OPTIMIZED GRAPH ===
    const startPrice = firstPrice

    // Track live volatility envelope over last 30 seconds
    const recentHistory = this.priceHistory.filter((p) => now - p.time <= VOLATILITY_WINDOW_MS)

    // Convert history points to percentage from startPrice
    const recentPcts = recentHistory.map((p) => ((p.price - startPrice) / startPrice) * 100)
    const currentPct = ((this.displayedPrice - startPrice) / startPrice) * 100

    // Find the min and max percentage within the active window
    const recentMinPct = Math.min(...recentPcts, currentPct)
    const recentMaxPct = Math.max(...recentPcts, currentPct)

    // The true range of motion we are currently experiencing
    const recentRangePct = Math.max(0.01, recentMaxPct - recentMinPct)

    // The midpoint of the current action - this will become the visual center of the screen
    const recentMidPct = (recentMaxPct + recentMinPct) / 2

    // Target 75% utilization of the screen for the current range
    const targetFillRatio = 0.75
    // We want the range to fill targetFillRatio, so half the range should fill half the target
    // Instead of using distance from zero, we scale based on the total high-low range
    const rawMultiplier = targetFillRatio / (recentRangePct / 2) // Div by 2 because graph is centered
    // Allow much higher max multiplier since we are zoomed in on a sliding window now
    const visualMultiplier = Math.max(100, Math.min(2000, rawMultiplier))

    // Calculate display values
    const displayValues = this.priceHistory.map((p) => {
      const priceChangePct = ((p.price - startPrice) / startPrice) * 100
      return priceChangePct * visualMultiplier
    })

    // Phase 5: Momentum Amplification Layer
    const rawCurrentDisplayValue = currentPct * visualMultiplier

    // Calculate velocity (difference across frames)
    const velocity = rawCurrentDisplayValue - this.lastRawDisplayValue
    this.lastRawDisplayValue = rawCurrentDisplayValue

    const kBoost = 0.05
    const instantBoost = Math.min(0.4, Math.abs(velocity) * kBoost)

    // Decay previous boost over ~300ms
    this.momentumBoost = Math.max(0, this.momentumBoost - (0.4 * delta) / 300)
    // Apply new boost if higher
    this.momentumBoost = Math.max(this.momentumBoost, instantBoost)

    const boostFactor = 1 + this.momentumBoost
    const currentDisplayValue = rawCurrentDisplayValue * boostFactor

    // Auto-scale Y-axis based on the local range
    const maxAbsValue = (recentRangePct / 2) * visualMultiplier
    const paddedMax = Math.max(
      maxAbsValue * ARCADE_GRAPH_CONFIG.autoScalePadding,
      0.01 * visualMultiplier
    )

    // Calculate the display value of the screen's center point
    const centerDisplayValue = recentMidPct * visualMultiplier

    // Graph area - leave space at bottom for HUD (approximately 128px)
    const hudHeight = 128
    const graphHeight = height - hudHeight
    const centerY = graphHeight / 2 // Physical center of the rendering area

    this.snakeGraphics.clear()

    // Draw zero line (entry price) - now drifts up/down off center
    const zeroLineY = centerY - ((0 - centerDisplayValue) / paddedMax) * (graphHeight / 2)

    // Only draw the zero line if it's broadly on screen (with a little padding)
    if (zeroLineY > -100 && zeroLineY < graphHeight + 100) {
      this.snakeGraphics.lineStyle(1, 0xffffff, 0.3)
      this.snakeGraphics.beginPath()
      this.snakeGraphics.moveTo(0, zeroLineY)
      this.snakeGraphics.lineTo(width, zeroLineY)
      this.snakeGraphics.strokePath()
    }

    // Calculate curve points relative to the dynamic center
    const curvePoints = displayValues.map((value, i) => {
      const point = this.priceHistory[i]
      const timeDiff = now - point.time
      const x = headX - timeDiff * pixelsPerMs
      // Map value relative to centerDisplayValue
      const y = centerY - ((value - centerDisplayValue) / paddedMax) * (graphHeight / 2)
      return { x, y }
    })

    // Add current head position
    const currentY =
      centerY - ((currentDisplayValue - centerDisplayValue) / paddedMax) * (graphHeight / 2)
    curvePoints.push({ x: headX, y: currentY })

    // Determine line color based on whether we are above or below the entry price (not the screen center)
    const isAboveZero = currentDisplayValue >= 0
    const lineColor = isAboveZero ? 0x00ff88 : 0xff4466 // Green above entry, red below
    const glowColor = isAboveZero ? 0x00ff88 : 0xff4466

    // Draw glowing underlay
    this.snakeGraphics.lineStyle(8, glowColor, 0.4)
    this.snakeGraphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.snakeGraphics.moveTo(pt.x, pt.y)
      else this.snakeGraphics.lineTo(pt.x, pt.y)
    })
    this.snakeGraphics.strokePath()

    // Draw bright core line
    this.snakeGraphics.lineStyle(2, lineColor, 0.9)
    this.snakeGraphics.beginPath()
    curvePoints.forEach((pt, i) => {
      if (i === 0) this.snakeGraphics.moveTo(pt.x, pt.y)
      else this.snakeGraphics.lineTo(pt.x, pt.y)
    })
    this.snakeGraphics.strokePath()

    // Draw the head of the snake (glowing dot)
    this.snakeGraphics.fillStyle(0xffffff, 1)
    this.snakeGraphics.fillCircle(headX, currentY, 4)
    this.snakeGraphics.fillStyle(glowColor, 0.6)
    this.snakeGraphics.fillCircle(headX, currentY, 12)

    // Draw liquidation bands (faint red bands at ±liquidation threshold from zero)
    const liquidationThreshold = (1 / ARCADE_GRAPH_CONFIG.leverage) * 100 * visualMultiplier

    // Distance in pixels from the absolute zero point to a liquidation band
    const liquidationDistY = (liquidationThreshold / paddedMax) * (graphHeight / 2)

    // Band rects
    const topBandY = zeroLineY - liquidationDistY - 4
    const bottomBandY = zeroLineY + liquidationDistY - 4

    // Upper liquidation band (shorts liquidated)
    if (topBandY > -20 && topBandY < graphHeight) {
      this.snakeGraphics.fillStyle(0xff4466, 0.1)
      this.snakeGraphics.fillRect(0, topBandY, width, 8)
    }

    // Lower liquidation band (longs liquidated)
    if (bottomBandY > -20 && bottomBandY < graphHeight) {
      this.snakeGraphics.fillStyle(0xff4466, 0.1)
      this.snakeGraphics.fillRect(0, bottomBandY, width, 8)
    }
  }

  private drawGridBackground(): void {
    // Update background image size to match viewport
    this.backgroundImage.setDisplaySize(this.cameras.main.width, this.cameras.main.height)
    this.ensureGridLayer()
  }

  private getGridCellSize() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

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
    // Increase resolution for crisper lines
    const tileWidth = Math.max(300, cellWidth * 12)
    const tileHeight = Math.max(200, cellHeight * 8)

    const canvas = document.createElement('canvas')
    canvas.width = tileWidth
    canvas.height = tileHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, tileWidth, tileHeight)

    // Deep volumetric background glow instead of just lines
    const bgGradient = ctx.createRadialGradient(
      tileWidth / 2,
      tileHeight / 2,
      0,
      tileWidth / 2,
      tileHeight / 2,
      Math.max(tileWidth, tileHeight)
    )
    bgGradient.addColorStop(0, 'rgba(0, 150, 255, 0.03)')
    bgGradient.addColorStop(1, 'rgba(0, 50, 100, 0.0)')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, tileWidth, tileHeight)

    const drawH = (y: number) => {
      // Glow underlay
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.05)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(tileWidth, y)
      ctx.stroke()

      // Core line
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(tileWidth, y)
      ctx.stroke()
    }

    const drawV = (x: number) => {
      // Glow underlay
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.05)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, tileHeight)
      ctx.stroke()

      // Core line
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, tileHeight)
      ctx.stroke()
    }

    const rows = Math.ceil(tileHeight / cellHeight)
    const cols = Math.ceil(tileWidth / cellWidth)

    // Draw grid lines
    for (let j = 0; j < rows; j++) {
      const y = j * cellHeight
      drawH(y)
    }

    for (let i = 0; i < cols; i++) {
      const x = i * cellWidth
      drawV(x)
    }

    // High-tech intersection nodes
    for (let i = 0; i < cols; i++) {
      const x = i * cellWidth

      for (let j = 0; j < rows; j++) {
        const y = j * cellHeight

        // Minor intersection dots everywhere
        ctx.fillStyle = 'rgba(0, 243, 255, 0.3)'
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1)
      }
    }

    if (this.textures.exists(GRID_CONFIG.textureKey)) {
      this.textures.remove(GRID_CONFIG.textureKey)
    }
    this.textures.addCanvas(GRID_CONFIG.textureKey, canvas)
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
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.buildGridTexture()

    if (!this.gridLayer) {
      this.gridLayer = this.add.tileSprite(0, 0, width, height, GRID_CONFIG.textureKey)
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
    const time = this.time.now / 1000
    const pulseIntensity = 0.4 + Math.sin(time * 2) * 0.15

    this.gridScrollX += (GRID_CONFIG.scrollSpeed * delta) / 1000
    this.gridLayer.tilePositionX = this.gridScrollX
    this.gridLayer.setAlpha(0.84 + pulseIntensity * 0.14)
  }

  private updateCoinPhysics(): void {
    if (!this.tokenPool) return

    const sceneHeight = this.cameras.main.height

    this.tokenPool.getChildren().forEach((token) => {
      const t = token as Token
      if (!t.active) return

      const coinId = t.getData('id')
      const gridX = (t.getData('gridX') as number) ?? t.x
      const gridY = (t.getData('gridY') as number) ?? t.y

      if (t.y > sceneHeight + 200) {
        this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)
        t.setActive(false)
        t.setVisible(false)
        // CRITICAL: Disable physics body to prevent memory leaks
        if (t.body) {
          this.physics.world.disableBody(t.body)
        }
        return
      }

      if (Math.abs(t.x - gridX) > 1 || Math.abs(t.y - gridY) > 1) {
        this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)
        this.spatialGrid.addCoinToGrid(coinId, t.x, t.y)
        t.setData('gridX', t.x)
        t.setData('gridY', t.y)
      }
    })
  }

  private removeCoin(coinId: string): void {
    // Find token in pool
    const token = this.tokenPool.getChildren().find((t) => {
      const tokenObj = t as Token
      return tokenObj.getData('id') === coinId && tokenObj.active
    }) as Token | undefined

    if (token) {
      // Get tracked grid position (not current position)
      const gridX = (token.getData('gridX') as number) ?? token.x
      const gridY = (token.getData('gridY') as number) ?? token.y

      // Remove from spatial grid using tracked position
      this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)

      // Disable physics before returning to pool
      if (token.body) {
        this.physics.world.disableBody(token.body)
      }

      // Return to pool
      token.setActive(false)
      token.setVisible(false)
    }
  }

  shutdown(): void {
    this.isShutdown = true
    this.tweens.killAll()

    this.particles.destroy()
    this.gridLayer?.destroy()
    if (this.textures.exists(GRID_CONFIG.textureKey)) {
      this.textures.remove(GRID_CONFIG.textureKey)
    }
    this.backgroundImage?.destroy()
    this.visualEffects.setShutdown(true)
    this.visualEffects.destroy()
    this.bladeRenderer.destroy()
    this.audio.destroy()

    this.scale.off('resize')

    const setReady = (window as unknown as { setSceneReady?: (ready: boolean) => void })
      .setSceneReady
    setReady?.(false)
    delete (window as unknown as { setSceneReady?: (ready: boolean) => void }).setSceneReady
    delete (window as { phaserEvents?: PhaserEventBridge }).phaserEvents

    // Remove window event listeners to prevent memory leaks
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
      this.visibilityChangeHandler = undefined
    }
    if (this.windowBlurHandler) {
      window.removeEventListener('blur', this.windowBlurHandler)
      this.windowBlurHandler = undefined
    }

    this.tokenPool.clear(true, true)
    // Remove all event listeners before destroying the event emitter
    this.eventEmitter.removeAllListeners()
    this.eventEmitter.destroy()
    this.spatialGrid.clear()

    this.input.off('pointermove')
    this.input.off('pointerup')
    this.input.off('pointerout')
  }

  private checkCollisions(): void {
    // Get all collision segments (center + edges for recent blade positions)
    const segments = this.bladeRenderer.getCollisionSegments()
    if (segments.length === 0) return

    // Guard against shutdown - tokenPool may be destroyed
    if (!this.tokenPool) return

    // Track sliced coins this frame to prevent double-slicing
    const slicedThisFrame = new Set<string>()

    // Iterate pool and check all nearby coins against all segments
    for (const token of this.tokenPool.getChildren()) {
      const tokenObj = token as Token
      if (!tokenObj.active) continue

      const coinId = tokenObj.getData('id')
      if (slicedThisFrame.has(coinId)) continue

      const type = tokenObj.getData('type') as CoinType
      const config = COIN_CONFIG[type]

      // Hitbox: 85% of visual size, accounting for mobile scale (matching Token.spawn())
      const mobileScale = this.isMobile ? 0.5 : 0.65
      const RENDER_SCALE = 4
      const hitboxRadius =
        config.radius * RENDER_SCALE * 0.85 * mobileScale * (config.hitboxMultiplier ?? 1.0)
      this.collisionCircle.setTo(tokenObj.x, tokenObj.y, hitboxRadius)

      // Check against all collision segments
      for (const seg of segments) {
        this.collisionLine.setTo(seg.x1, seg.y1, seg.x2, seg.y2)

        if (Geom.Intersects.LineToCircle(this.collisionLine, this.collisionCircle)) {
          this.sliceCoin(coinId, tokenObj)
          slicedThisFrame.add(coinId)
          break // Move to next coin once sliced
        }
      }
    }
  }

  private isCameraAvailable(): boolean {
    return this.cameras?.main !== undefined
  }

  private createVignetteBackground(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Create canvas texture for vignette effect
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Create radial gradient: center (0x051014) → edges (0x000000)
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.max(width, height) / 1.5
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius)

    // Dark charcoal/teal center to black edges, with alpha for the graph behind
    gradient.addColorStop(0, 'rgba(5, 16, 20, 0.4)')
    gradient.addColorStop(0.6, 'rgba(3, 8, 10, 0.7)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Add texture to cache
    const textureKey = 'vignette-bg'
    if (this.textures.exists(textureKey)) {
      this.textures.remove(textureKey)
    }
    this.textures.addCanvas(textureKey, canvas)

    // Update existing background image or create new one
    if (this.backgroundImage) {
      this.backgroundImage.setTexture(textureKey)
      this.backgroundImage.setDisplaySize(width, height)
    }
  }

  private cleanupCoins(): void {
    // Guard: Check shutdown state and required systems
    if (!this.tokenPool || this.isShutdown) return

    // Immediately deactivate and hide all active tokens
    this.tokenPool.getChildren().forEach((child) => {
      const token = child as Token

      // Double-check guard: Token may be deactivated during iteration
      if (!token.active) return

      token.setActive(false)
      token.setVisible(false)

      // CRITICAL: Disable physics body (not just stop) to prevent memory leaks
      if (token.body) {
        this.physics.world.disableBody(token.body)
      }

      // Remove from spatial grid using tracked position
      const coinId = token.getData('id')
      if (coinId && this.spatialGrid) {
        const gridX = (token.getData('gridX') as number) ?? token.x
        const gridY = (token.getData('gridY') as number) ?? token.y
        this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)
      }
    })

    // Force clear spatial grid backup
    if (this.spatialGrid) {
      this.spatialGrid.clear()
    }
  }

  private handleCoinSpawn(data: CoinSpawnEvent): void {
    if (this.isShutdown || !this.tokenPool) return

    const config = COIN_CONFIG[data.coinType]
    if (!config) return

    // Convert normalized position to screen coordinates (with defensive bounds check)
    const spawnX = Math.max(0, Math.min(1, data.xNormalized)) * this.cameras.main.width
    const spawnY = this.cameras.main.height + 100 // Bottom toss

    const token = this.tokenPool.get(spawnX, spawnY) as Token
    if (!token) return

    if (token.body && token.body.enable) {
      token.body.enable = true
    }

    token.spawn(
      spawnX,
      spawnY,
      data.coinType,
      data.coinId,
      config,
      this.isMobile,
      data.velocityX,
      data.velocityY
    )

    token.setData('gridX', token.x)
    token.setData('gridY', token.y)

    this.spatialGrid.addCoinToGrid(data.coinId, token.x, token.y)
  }

  private handleOpponentSlice(data: {
    playerName: string
    coinType: CoinType
    coinId: string
  }): void {
    // Guard against events firing after scene shutdown
    if (this.isShutdown || !this.add || !this.cameras || !this.tokenPool) return

    // Find the specific coin by ID
    const tokens = this.tokenPool.getChildren() as Token[]
    const targetCoin = tokens.find((t) => t.active && t.getData('id') === data.coinId)

    if (targetCoin) {
      // Do visual effects as if it was sliced locally, but DO NOT notify the server again
      const type = targetCoin.getData('type') as CoinType
      const config = COIN_CONFIG[type]

      // Play sound
      const screenWidth = this.cameras.main.width
      this.audio.playSliceAt(targetCoin.x, screenWidth)

      // Play effects
      this.particles.emitSlice(targetCoin.x, targetCoin.y, config.color, 20)
      this.visualEffects.createSplitEffect(
        targetCoin.x,
        targetCoin.y,
        config.color,
        config.radius,
        type
      )

      // Remove the coin explicitly without triggering state updates that might re-loop back to the server
      this.removeCoin(data.coinId)
    }
  }

  private sliceCoin(coinId: string, coin: Token): void {
    // console.log('[Phaser:sliceCoin] Called with coinId:', coinId)
    const type = coin.getData('type') as CoinType
    // console.log('[Phaser:sliceCoin] Coin type:', type)
    const config = COIN_CONFIG[type]
    const store = useTradingStore.getState()

    // Play slice sound at coin position for stereo panning
    const screenWidth = this.cameras.main.width
    this.audio.playSliceAt(coin.x, screenWidth)

    this.particles.emitSlice(coin.x, coin.y, config.color, 20)
    this.visualEffects.createSplitEffect(coin.x, coin.y, config.color, config.radius, type)

    // Optional: Add screen shake for addictive feedback
    this.cameras.main.shake(100, 0.005)

    // Server uses its own price feed for order creation (single source of truth)
    store.sliceCoin(coinId, type)
    // console.log('[Phaser:sliceCoin] Called store.sliceCoin')

    this.removeCoin(coinId)
  }
}
