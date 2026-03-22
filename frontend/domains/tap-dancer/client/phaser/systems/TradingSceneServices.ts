import { Scene } from 'phaser'
import { ButtonSystem } from './ButtonSystem'
import { GridBackgroundSystem } from './GridBackgroundSystem'
import { PositionCardSystem } from './PositionCardSystem'
import { PriceGraphSystem } from './PriceGraphSystem'
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'
import type { Direction } from '@/domains/tap-dancer/shared/trading.types'

/**
 * TapDancer TradingSceneServices
 *
 * Orchestrator for all Phaser-based gameplay visuals:
 * - Grid background
 * - Price graph (Tron-style light cycle trail)
 */
export class TradingSceneServices {
  private scene: Scene
  private isShutdown = false
  private eventEmitter!: Phaser.Events.EventEmitter

  private gridBackground!: GridBackgroundSystem
  private priceGraph!: PriceGraphSystem
  private buttonSystem!: ButtonSystem
  private positionCardSystem!: PositionCardSystem

  // Event handler references for cleanup
  private buttonTapHandler?: ({ direction }: { direction: Direction }) => void
  private closePositionHandler?: ({ positionId }: { positionId: string }) => void

  constructor(scene: Scene) {
    this.scene = scene
  }

  preload(): void {
    // No assets to preload
  }

  create(eventEmitter: Phaser.Events.EventEmitter): void {
    this.eventEmitter = eventEmitter

    this.scene.physics.world.setBounds(
      0,
      0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    )

    // Initialize visual systems
    this.gridBackground = new GridBackgroundSystem(this.scene)
    this.priceGraph = new PriceGraphSystem(this.scene, this.gridBackground.getScrollSpeed())
    this.buttonSystem = new ButtonSystem(this.scene)
    this.positionCardSystem = new PositionCardSystem(this.scene)

    // Create systems in depth order
    this.gridBackground.create() // depth: -1
    this.priceGraph.create() // depth: -0.5
    this.buttonSystem.create(eventEmitter) // depth: 10
    this.positionCardSystem.create(eventEmitter) // depth: 20

    // Bridge Phaser events to store actions
    this.buttonTapHandler = ({ direction }) => {
      useTradingStore.getState().openPosition(direction)
    }
    window.phaserEvents?.on('button_tap', this.buttonTapHandler)

    this.closePositionHandler = ({ positionId }) => {
      useTradingStore.getState().closePosition(positionId)
    }
    window.phaserEvents?.on('close_position', this.closePositionHandler)
  }

  update(delta: number): void {
    if (this.isShutdown) return

    this.gridBackground.update(delta)
    this.priceGraph.update(delta)
    this.buttonSystem.update(delta)
    this.positionCardSystem.update(delta)
  }

  handleResize(): void {
    this.gridBackground.handleResize()
    this.priceGraph.handleResize()
    this.buttonSystem.handleResize()
    this.positionCardSystem.handleResize()
  }

  shutdown(): void {
    this.isShutdown = true

    // Remove event listeners
    if (this.buttonTapHandler) {
      window.phaserEvents?.off('button_tap', this.buttonTapHandler)
    }
    if (this.closePositionHandler) {
      window.phaserEvents?.off('close_position', this.closePositionHandler)
    }

    this.scene.tweens.killAll()

    this.gridBackground?.shutdown()
    this.priceGraph?.shutdown()
    this.buttonSystem?.shutdown()
    this.positionCardSystem?.shutdown()
  }
}
