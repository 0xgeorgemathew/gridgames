import { Scene } from 'phaser'
import { GridBackgroundSystem } from './GridBackgroundSystem'
import { PriceGraphSystem } from './PriceGraphSystem'

/**
 * TapDancer TradingSceneServices
 *
 * Simplified orchestrator - no coin systems needed!
 * Just the beautiful grid background and snake price graph.
 */
export class TradingSceneServices {
  private scene: Scene
  private isShutdown = false

  private gridBackground!: GridBackgroundSystem
  private priceGraph!: PriceGraphSystem

  constructor(scene: Scene) {
    this.scene = scene
  }

  preload(): void {
    // No audio system needed for TapDancer (no swiping sounds)
  }

  create(_eventEmitter: Phaser.Events.EventEmitter): void {
    this.scene.physics.world.setBounds(
      0,
      0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    )

    // Initialize only the visual systems (no coin/collision systems)
    this.gridBackground = new GridBackgroundSystem(this.scene)
    this.priceGraph = new PriceGraphSystem(this.scene, this.gridBackground.getScrollSpeed())

    // Create systems in order
    this.gridBackground.create()
    this.priceGraph.create()

    // No event handlers needed - TapDancer doesn't have coins
  }

  update(delta: number): void {
    if (this.isShutdown) return

    this.gridBackground.update(delta)
    this.priceGraph.update(delta)
  }

  handleResize(): void {
    this.gridBackground.handleResize()
  }

  shutdown(): void {
    this.isShutdown = true
    this.scene.tweens.killAll()

    this.gridBackground?.shutdown()
    this.priceGraph?.shutdown()
  }
}
