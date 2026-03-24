import { GameObjects, Scene } from 'phaser'
import { PositionCloseEffectsController } from '@/domains/match/client/phaser/price-graph/PositionCloseEffects'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { SnakePriceGraph } from './SnakePriceGraph'

export class PriceGraphSystem {
  private snakeGraphics!: GameObjects.Graphics
  private snakeGraph!: SnakePriceGraph
  private closeEffects!: PositionCloseEffectsController

  constructor(
    private scene: Scene,
    private scrollSpeed: number
  ) {}

  create(): void {
    this.snakeGraphics = this.scene.add.graphics()
    this.snakeGraphics.setDepth(-0.5)
    this.snakeGraph = new SnakePriceGraph(this.snakeGraphics)
    this.closeEffects = new PositionCloseEffectsController(this.scene, this.snakeGraph)
    this.closeEffects.create()
  }

  update(delta: number): void {
    const { priceData, isPlaying, firstPrice } = useTradingStore.getState()
    const pixelsPerMs = this.scrollSpeed / 1000

    this.snakeGraph.update({
      delta,
      priceData: priceData ? { price: priceData.price } : null,
      isPlaying,
      firstPrice,
      width: this.scene.cameras.main.width,
      height: this.scene.cameras.main.height,
      pixelsPerMs,
    })
  }

  handleResize(): void {
    this.closeEffects.handleResize()
  }

  shutdown(): void {
    this.closeEffects?.shutdown()
    this.snakeGraph?.destroy()
    this.snakeGraphics?.destroy()
  }
}
