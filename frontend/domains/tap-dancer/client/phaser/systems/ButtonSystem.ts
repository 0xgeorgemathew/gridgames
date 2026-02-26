import { Scene } from 'phaser'
import { ButtonRenderer, type ButtonType } from './ButtonRenderer'
import { CoinButton } from '../objects/CoinButton'
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'
import { CLIENT_GAME_CONFIG as CFG } from '@/domains/tap-dancer/client/game.config'

interface ButtonSizes {
  buttonSize: number
  gap: number
  bottomOffset: number
}

// Ripple effect configuration
interface GridRipple {
  x: number
  y: number
  radius: number
  color: number
  startTime: number
  duration: number
}

const RIPPLE_CONFIG = {
  initialRadius: 44, // Start at half button size
  maxRadiusFactor: 2.5, // Expand to 2.5x button size
  duration: 400, // Animation duration in ms
  ringCount: 3, // Number of rings per ripple
  ringDelay: 80, // Delay between rings in ms
  lineWidth: 2,
  initialAlpha: 0.6,
} as const

const BUTTON_SIZES_BY_HEIGHT: Record<number, ButtonSizes> = {
  667: { buttonSize: 72, gap: 40, bottomOffset: 80 },
  736: { buttonSize: 76, gap: 42, bottomOffset: 84 },
  780: { buttonSize: 80, gap: 44, bottomOffset: 88 },
  844: { buttonSize: 88, gap: 48, bottomOffset: 96 },
  852: { buttonSize: 88, gap: 48, bottomOffset: 96 },
  896: { buttonSize: 84, gap: 46, bottomOffset: 92 },
  926: { buttonSize: 92, gap: 50, bottomOffset: 100 },
  932: { buttonSize: 96, gap: 52, bottomOffset: 104 },
}

const BASE_SIZES: ButtonSizes = { buttonSize: 88, gap: 48, bottomOffset: 96 }

function getButtonSizes(): ButtonSizes {
  if (typeof window === 'undefined') return BASE_SIZES
  const height = window.screen.height
  if (height < 667 || height > 932) return BASE_SIZES
  return BUTTON_SIZES_BY_HEIGHT[height] ?? BASE_SIZES
}

/**
 * ButtonSystem - Orchestration layer for trading buttons
 *
 * Creates and manages LONG/SHORT buttons as Phaser game objects.
 * Subscribes to Zustand store for beat sync and balance updates.
 */
export class ButtonSystem {
  private scene: Scene
  private eventEmitter?: Phaser.Events.EventEmitter

  private upButton?: CoinButton
  private downButton?: CoinButton

  private unsubscribeStore?: () => void
  private isShutdown = false

  // Track previous values to avoid redundant updates
  private lastBeatActive = false
  private lastCanOpen = true

  // Grid ripple effect
  private gridRipples: GridRipple[] = []
  private rippleGraphics?: Phaser.GameObjects.Graphics

  constructor(scene: Scene) {
    this.scene = scene
  }

  /**
   * Create button textures and buttons
   */
  create(eventEmitter: Phaser.Events.EventEmitter): void {
    this.eventEmitter = eventEmitter

    // Generate cached textures
    const renderer = new ButtonRenderer(this.scene)
    renderer.generateCachedTextures()

    // Initialize ripple graphics (depth between grid and buttons)
    this.rippleGraphics = this.scene.add.graphics()
    this.rippleGraphics.setDepth(5)

    const { buttonSize, gap, bottomOffset } = getButtonSizes()

    const camera = this.scene.cameras.main
    const centerX = camera.width / 2
    const bottomY = camera.height - bottomOffset - buttonSize / 2

    // Create LONG (UP) button - left side
    this.upButton = new CoinButton(this.scene, {
      direction: 'long',
      x: centerX - gap - buttonSize / 2,
      y: bottomY,
      onToggle: (direction) => this.handleButtonTap(direction),
      size: buttonSize,
    })
    this.scene.add.existing(this.upButton as Phaser.GameObjects.Container)

    // Create SHORT (DOWN) button - right side
    this.downButton = new CoinButton(this.scene, {
      direction: 'short',
      x: centerX + gap + buttonSize / 2,
      y: bottomY,
      onToggle: (direction) => this.handleButtonTap(direction),
      size: buttonSize,
    })
    this.scene.add.existing(this.downButton as Phaser.GameObjects.Container)

    // Subscribe to store updates
    this.subscribeToStore()

    // Initial state update
    this.updateButtonStates()
  }

  /**
   * Subscribe to Zustand store for beat and balance updates
   */
  private subscribeToStore(): void {
    this.unsubscribeStore = useTradingStore.subscribe((state) => {
      if (this.isShutdown) return

      // Check for beat pulse
      if (state.beatActive && !this.lastBeatActive) {
        this.upButton?.playBeatPulse()
        this.downButton?.playBeatPulse()
      }
      this.lastBeatActive = state.beatActive

      // Check balance for disabled state
      const player = state.players.find((p) => p.id === state.localPlayerId)
      const canOpen = player && player.dollars >= CFG.POSITION_COLLATERAL
      if (canOpen !== this.lastCanOpen) {
        this.lastCanOpen = canOpen ?? true
        this.upButton?.setDisabled(!canOpen)
        this.downButton?.setDisabled(!canOpen)
      }
    })
  }

  /**
   * Update button states based on current store state
   */
  private updateButtonStates(): void {
    const state = useTradingStore.getState()
    const player = state.players.find((p) => p.id === state.localPlayerId)
    const canOpen = player && player.dollars >= CFG.POSITION_COLLATERAL

    this.lastCanOpen = canOpen ?? true
    this.upButton?.setDisabled(!canOpen)
    this.downButton?.setDisabled(!canOpen)
  }

  /**
   * Handle button tap - emit event for TradingSceneServices to handle
   */
  private handleButtonTap(direction: ButtonType): void {
    if (this.isShutdown) return

    // Trigger grid ripple effect
    this.triggerGridRipple(direction)

    // Emit event that TradingSceneServices will listen to
    window.phaserEvents?.emit('button_tap', { direction })
  }

  /**
   * Trigger grid ripple effect from button position
   */
  private triggerGridRipple(direction: ButtonType): void {
    const button = direction === 'long' ? this.upButton : this.downButton
    if (!button) return

    const { buttonSize } = getButtonSizes()
    const color = direction === 'long' ? 0x00f3ff : 0xff6600

    // Spawn staggered rings
    for (let i = 0; i < RIPPLE_CONFIG.ringCount; i++) {
      this.gridRipples.push({
        x: button.x,
        y: button.y,
        radius: RIPPLE_CONFIG.initialRadius,
        color,
        startTime: Date.now() + i * RIPPLE_CONFIG.ringDelay,
        duration: RIPPLE_CONFIG.duration,
      })
    }
  }

  /**
   * Update - called each frame
   */
  update(_delta: number): void {
    this.updateGridRipples()
  }

  /**
   * Update and draw grid ripple effects
   */
  private updateGridRipples(): void {
    if (!this.rippleGraphics) return

    this.rippleGraphics.clear()

    const now = Date.now()
    const { buttonSize } = getButtonSizes()
    const maxRadius = buttonSize * RIPPLE_CONFIG.maxRadiusFactor

    // Update and draw active ripples
    for (let i = this.gridRipples.length - 1; i >= 0; i--) {
      const ripple = this.gridRipples[i]
      const elapsed = now - ripple.startTime

      // Skip rings that haven't started yet
      if (elapsed < 0) continue

      // Remove expired ripples
      if (elapsed >= ripple.duration) {
        this.gridRipples.splice(i, 1)
        continue
      }

      // Calculate animation progress (0 to 1)
      const progress = elapsed / ripple.duration

      // Ease-out for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      // Calculate current radius and alpha
      const currentRadius = ripple.radius + (maxRadius - ripple.radius) * easedProgress
      const alpha = RIPPLE_CONFIG.initialAlpha * (1 - progress)

      // Draw the ring
      this.rippleGraphics.lineStyle(RIPPLE_CONFIG.lineWidth, ripple.color, alpha)
      this.rippleGraphics.strokeCircle(ripple.x, ripple.y, currentRadius)
    }
  }

  /**
   * Handle resize - reposition buttons
   */
  handleResize(): void {
    if (!this.upButton || !this.downButton) return

    const camera = this.scene.cameras.main
    const { buttonSize, gap, bottomOffset } = getButtonSizes()

    const centerX = camera.width / 2
    const bottomY = camera.height - bottomOffset - buttonSize / 2

    this.upButton.setPosition(centerX - gap - buttonSize / 2, bottomY)
    this.downButton.setPosition(centerX + gap + buttonSize / 2, bottomY)
  }

  /**
   * Shutdown - cleanup
   */
  shutdown(): void {
    this.isShutdown = true

    // Clean up ripple graphics
    this.gridRipples = []
    if (this.rippleGraphics) {
      this.rippleGraphics.destroy()
      this.rippleGraphics = undefined
    }

    if (this.unsubscribeStore) {
      this.unsubscribeStore()
      this.unsubscribeStore = undefined
    }

    if (this.upButton) {
      this.upButton.destroy()
      this.upButton = undefined
    }

    if (this.downButton) {
      this.downButton.destroy()
      this.downButton = undefined
    }
  }
}
