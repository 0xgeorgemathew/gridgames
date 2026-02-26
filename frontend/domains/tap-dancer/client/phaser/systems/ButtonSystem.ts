import { Scene } from 'phaser'
import { ButtonRenderer, type ButtonType } from './ButtonRenderer'
import { CoinButton } from '../objects/CoinButton'
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'
import { CLIENT_GAME_CONFIG as CFG } from '@/domains/tap-dancer/client/game.config'

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

    // Calculate button positions (bottom-centered)
    const camera = this.scene.cameras.main
    const buttonSize = 88
    const gap = 48
    const bottomOffset = 96 // bottom-24 = 96px

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

    // Emit event that TradingSceneServices will listen to
    window.phaserEvents?.emit('button_tap', { direction })
  }

  /**
   * Update - called each frame
   */
  update(_delta: number): void {
    // Nothing needed here - button states managed via store subscription
  }

  /**
   * Handle resize - reposition buttons
   */
  handleResize(): void {
    if (!this.upButton || !this.downButton) return

    const camera = this.scene.cameras.main
    const buttonSize = 88
    const gap = 48
    const bottomOffset = 96

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
