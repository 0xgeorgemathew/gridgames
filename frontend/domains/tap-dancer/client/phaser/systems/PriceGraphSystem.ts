import { GameObjects, Scene } from 'phaser'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { SnakePriceGraph } from './SnakePriceGraph'
import type { LiquidationEvent } from '@/domains/tap-dancer/shared/trading.types'

type PositionClosedEvent = {
  positionId: string
  realizedPnl: number
  isLong: boolean
}

export class PriceGraphSystem {
  private scene: Scene
  private snakeGraphics!: GameObjects.Graphics
  private snakeGraph!: SnakePriceGraph
  private scrollSpeed: number
  private liquidationListener: ((data: LiquidationEvent) => void) | null = null
  private closeListener: ((data: PositionClosedEvent) => void) | null = null

  constructor(scene: Scene, scrollSpeed: number) {
    this.scene = scene
    this.scrollSpeed = scrollSpeed
  }

  create(): void {
    this.snakeGraphics = this.scene.add.graphics()
    this.snakeGraphics.setDepth(-0.5)
    this.snakeGraph = new SnakePriceGraph(this.snakeGraphics)
    this.snakeGraph.setScene(this.scene)

    // Listen for liquidation events from the store via Phaser event bridge
    this.liquidationListener = (_data: LiquidationEvent) => {
      this.snakeGraph.triggerLiquidationAnimation()
    }
    window.phaserEvents?.on('position_liquidated', this.liquidationListener)

    // Listen for position close events for close animation
    this.closeListener = (data: PositionClosedEvent) => {
      // Calculate final price percentage from realizedPnl
      // realizedPnl is in dollars, we need to convert to percentage
      // PnL% = (realizedPnl / collateral) * 100 / leverage
      // For simplicity, just trigger based on profit/loss direction
      const finalPct = data.realizedPnl >= 0 ? 5 : -5 // Simplified percentage for animation
      this.snakeGraph.triggerCloseAnimation(finalPct)
    }
    window.phaserEvents?.on('position_closed', this.closeListener)
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

  shutdown(): void {
    // Remove event listeners
    if (this.liquidationListener) {
      window.phaserEvents?.off('position_liquidated', this.liquidationListener)
      this.liquidationListener = null
    }
    if (this.closeListener) {
      window.phaserEvents?.off('position_closed', this.closeListener)
      this.closeListener = null
    }
    this.snakeGraph?.destroy()
    this.snakeGraphics?.destroy()
  }
}
