import { GameObjects, Scene } from 'phaser'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { SnakePriceGraph } from './SnakePriceGraph'

export class PriceGraphSystem {
  private scene: Scene
  private snakeGraphics!: GameObjects.Graphics
  private snakeGraph!: SnakePriceGraph
  private scrollSpeed: number

  constructor(scene: Scene, scrollSpeed: number) {
    this.scene = scene
    this.scrollSpeed = scrollSpeed
  }

  create(): void {
    this.snakeGraphics = this.scene.add.graphics()
    this.snakeGraphics.setDepth(-0.5)
    this.snakeGraph = new SnakePriceGraph(this.snakeGraphics)
  }

  update(delta: number): void {
    const { priceData, isPlaying, firstPrice } = useTradingStore.getState()
    const pixelsPerMs = this.scrollSpeed / 1000

    // Debug: log why graph might not render
    if (!priceData) {
      console.log('[PriceGraphSystem] No priceData')
    }
    if (!isPlaying) {
      console.log('[PriceGraphSystem] Not playing')
    }
    if (firstPrice === null || firstPrice === undefined) {
      console.log('[PriceGraphSystem] No firstPrice')
    }

    this.snakeGraph.update({
      delta,
      priceData,
      isPlaying,
      firstPrice,
      width: this.scene.cameras.main.width,
      height: this.scene.cameras.main.height,
      pixelsPerMs,
    })
  }

  shutdown(): void {
    this.snakeGraphics?.destroy()
  }
}
