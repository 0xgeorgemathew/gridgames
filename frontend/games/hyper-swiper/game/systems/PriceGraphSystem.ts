import { GameObjects, Scene } from 'phaser'
import { useTradingStore } from '../stores/trading-store'
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
