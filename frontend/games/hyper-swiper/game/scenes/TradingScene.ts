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
  scrollSpeed: 30,
  sweepSpeed: 44,
  textureKey: 'trading-grid-tile',
  sweepTextureKey: 'trading-grid-sweep',
} as const

export class TradingScene extends Scene {
  // Game objects
  private tokenPool!: GameObjects.Group

  // Grid
  private gridLayer!: GameObjects.TileSprite
  private gridSweep!: GameObjects.Image
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
  private gridSweepOffset = 0
  private eventEmitter: Phaser.Events.EventEmitter

  // Window visibility handlers for cleanup
  private visibilityChangeHandler?: () => void
  private windowBlurHandler?: () => void

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
    this.updateCoinPhysics()
    this.particles.update(clampedDelta)
    this.bladeRenderer.draw()
    this.checkCollisions()
    this.visualEffects.update()
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
    const tileWidth = Math.max(240, cellWidth * 8)
    const tileHeight = Math.max(180, cellHeight * 6)

    const canvas = document.createElement('canvas')
    canvas.width = tileWidth
    canvas.height = tileHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, tileWidth, tileHeight)

    // Subtle CRT-like scanline texture for a Tron Legacy atmosphere
    ctx.fillStyle = 'rgba(0, 215, 255, 0.028)'
    for (let y = 0; y < tileHeight; y += 4) {
      ctx.fillRect(0, y, tileWidth, 1)
    }

    const topGlow = ctx.createLinearGradient(0, 0, 0, tileHeight)
    topGlow.addColorStop(0, 'rgba(0, 245, 255, 0.09)')
    topGlow.addColorStop(0.3, 'rgba(0, 245, 255, 0.04)')
    topGlow.addColorStop(1, 'rgba(0, 245, 255, 0)')
    ctx.fillStyle = topGlow
    ctx.fillRect(0, 0, tileWidth, tileHeight)

    const drawH = (y: number, major: boolean) => {
      ctx.strokeStyle = major ? 'rgba(0, 245, 255, 0.26)' : 'rgba(0, 225, 255, 0.11)'
      ctx.lineWidth = major ? 3.2 : 2.2
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(tileWidth, y + 0.5)
      ctx.stroke()

      ctx.strokeStyle = major ? 'rgba(145, 255, 255, 0.78)' : 'rgba(0, 235, 255, 0.43)'
      ctx.lineWidth = major ? 1.5 : 1
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(tileWidth, y + 0.5)
      ctx.stroke()
    }

    const drawV = (x: number, major: boolean) => {
      ctx.strokeStyle = major ? 'rgba(0, 245, 255, 0.3)' : 'rgba(0, 225, 255, 0.12)'
      ctx.lineWidth = major ? 3.4 : 2.2
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, tileHeight)
      ctx.stroke()

      ctx.strokeStyle = major ? 'rgba(150, 255, 255, 0.82)' : 'rgba(0, 235, 255, 0.45)'
      ctx.lineWidth = major ? 1.7 : 1
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, tileHeight)
      ctx.stroke()
    }

    const rows = Math.ceil(tileHeight / cellHeight)
    const cols = Math.ceil(tileWidth / cellWidth)

    for (let j = 0; j < rows; j++) {
      const y = j * cellHeight
      const major = j % GRID_CONFIG.majorYEvery === 0
      drawH(y, major)
    }

    for (let i = 0; i < cols; i++) {
      const x = i * cellWidth
      const major = i % GRID_CONFIG.majorXEvery === 0
      drawV(x, major)
    }

    // Nodes on all intersections so the mesh reads continuously; majors are brighter.
    for (let i = 0; i < cols; i++) {
      const x = i * cellWidth

      for (let j = 0; j < rows; j++) {
        const y = j * cellHeight

        const major = i % GRID_CONFIG.majorXEvery === 0 && j % GRID_CONFIG.majorYEvery === 0
        if (major) {
          ctx.fillStyle = 'rgba(0, 245, 255, 0.38)'
          ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4)
          ctx.fillStyle = 'rgba(225, 255, 255, 0.84)'
          ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8)
        } else {
          ctx.fillStyle = 'rgba(0, 235, 255, 0.16)'
          ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2)
        }
      }
    }

    if (this.textures.exists(GRID_CONFIG.textureKey)) {
      this.textures.remove(GRID_CONFIG.textureKey)
    }
    this.textures.addCanvas(GRID_CONFIG.textureKey, canvas)
  }

  private buildGridSweepTexture(height: number): void {
    const sweepWidth = Math.max(96, Math.round(this.cameras.main.width * 0.14))
    const canvas = document.createElement('canvas')
    canvas.width = sweepWidth
    canvas.height = Math.max(120, Math.round(height))
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, sweepWidth, 0)
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0)')
    gradient.addColorStop(0.38, 'rgba(0, 245, 255, 0.09)')
    gradient.addColorStop(0.5, 'rgba(120, 255, 255, 0.24)')
    gradient.addColorStop(0.62, 'rgba(0, 245, 255, 0.09)')
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Core energy line in the center of the sweep.
    const coreX = sweepWidth * 0.5
    ctx.strokeStyle = 'rgba(205, 255, 255, 0.42)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(coreX + 0.5, 0)
    ctx.lineTo(coreX + 0.5, canvas.height)
    ctx.stroke()

    if (this.textures.exists(GRID_CONFIG.sweepTextureKey)) {
      this.textures.remove(GRID_CONFIG.sweepTextureKey)
    }
    this.textures.addCanvas(GRID_CONFIG.sweepTextureKey, canvas)
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
    this.buildGridSweepTexture(height)

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

    if (!this.gridSweep) {
      this.gridSweep = this.add.image(width, height / 2, GRID_CONFIG.sweepTextureKey)
      this.gridSweep.setDepth(-0.95)
      this.gridSweep.setBlendMode(Phaser.BlendModes.ADD)
      this.gridSweep.setOrigin(0.5, 0.5)
      this.gridSweep.setAlpha(0.2)
    } else {
      this.gridSweep.setTexture(GRID_CONFIG.sweepTextureKey)
      this.gridSweep.setPosition(width, height / 2)
    }
  }

  private updateGrid(delta: number): void {
    const time = this.time.now / 1000
    const pulseIntensity = 0.4 + Math.sin(time * 2) * 0.15

    this.gridScrollX += (GRID_CONFIG.scrollSpeed * delta) / 1000
    this.gridLayer.tilePositionX = this.gridScrollX
    this.gridLayer.setAlpha(0.84 + pulseIntensity * 0.14)

    this.gridSweepOffset += (GRID_CONFIG.sweepSpeed * delta) / 1000
    const sweepWidth = this.gridSweep.width
    const span = this.cameras.main.width + sweepWidth * 2
    const sweepX = this.cameras.main.width + sweepWidth - (this.gridSweepOffset % span)
    this.gridSweep.setPosition(sweepX, this.cameras.main.height / 2)
    this.gridSweep.setAlpha(0.18 + pulseIntensity * 0.08)
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
    this.gridSweep?.destroy()
    if (this.textures.exists(GRID_CONFIG.textureKey)) {
      this.textures.remove(GRID_CONFIG.textureKey)
    }
    if (this.textures.exists(GRID_CONFIG.sweepTextureKey)) {
      this.textures.remove(GRID_CONFIG.sweepTextureKey)
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
      const mobileScale = this.isMobile ? 0.7 : 1
      const hitboxRadius = config.radius * 0.85 * mobileScale * (config.hitboxMultiplier ?? 1.0)
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

    // Dark charcoal/teal center to pure black edges
    gradient.addColorStop(0, '#051014')
    gradient.addColorStop(0.6, '#03080a')
    gradient.addColorStop(1, '#000000')

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

    token.spawn(spawnX, spawnY, data.coinType, data.coinId, config, this.isMobile)

    token.setData('gridX', token.x)
    token.setData('gridY', token.y)

    this.spatialGrid.addCoinToGrid(data.coinId, token.x, token.y)
  }

  private handleOpponentSlice(data: { playerName: string; coinType: CoinType }): void {
    // Guard against events firing after scene shutdown
    if (this.isShutdown || !this.add || !this.cameras) return

    this.visualEffects.showOpponentSlice(data.playerName, data.coinType)
  }

  private sliceCoin(coinId: string, coin: Token): void {
    console.log('[Phaser:sliceCoin] Called with coinId:', coinId)
    const type = coin.getData('type') as CoinType
    console.log('[Phaser:sliceCoin] Coin type:', type)
    const config = COIN_CONFIG[type]
    const store = useTradingStore.getState()

    // Play slice sound at coin position for stereo panning
    const screenWidth = this.cameras.main.width
    this.audio.playSliceAt(coin.x, screenWidth)

    this.particles.emitSlice(coin.x, coin.y, config.color, 20)
    this.visualEffects.createDirectionalArrow(coin.x, coin.y, type)
    this.visualEffects.createSplitEffect(coin.x, coin.y, config.color, config.radius, type)

    // Server uses its own price feed for order creation (single source of truth)
    store.sliceCoin(coinId, type)
    console.log('[Phaser:sliceCoin] Called store.sliceCoin')

    this.removeCoin(coinId)
  }
}
