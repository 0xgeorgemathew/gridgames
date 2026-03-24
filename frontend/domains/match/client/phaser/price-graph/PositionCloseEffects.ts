import type { GameObjects, Scene } from 'phaser'

export type PositionClosedEvent = {
  positionId: string
  amountTransferred: number
  isUp: boolean
  isWinner: boolean
}

export interface PositionReactiveGraph {
  setScene?: (scene: Scene) => void
  triggerLiquidationAnimation?: () => void
  triggerCloseAnimation?: (finalPct: number) => void
}

export class PositionCloseEffectsController {
  private closeFlashText!: GameObjects.Text
  private liquidationListener: (() => void) | null = null
  private closeListener: ((data: PositionClosedEvent) => void) | null = null

  constructor(
    private scene: Scene,
    private graph: PositionReactiveGraph
  ) {}

  create(): void {
    this.graph.setScene?.(this.scene)

    this.closeFlashText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      '',
      {
        fontFamily: 'monospace',
        fontSize: `${Math.max(28, Math.round(this.scene.cameras.main.width * 0.07))}px`,
        fontStyle: 'bold',
        color: '#4ade80',
        align: 'center',
        stroke: '#052e16',
        strokeThickness: 8,
      }
    )
    this.closeFlashText.setOrigin(0.5, 0.5)
    this.closeFlashText.setDepth(15)
    this.closeFlashText.setAlpha(0)
    this.closeFlashText.setVisible(false)
    this.closeFlashText.setShadow(0, 0, '#4ade80', 28, true, true)

    this.liquidationListener = () => {
      this.graph.triggerLiquidationAnimation?.()
    }
    window.phaserEvents?.on('position_liquidated', this.liquidationListener)

    this.closeListener = (data: PositionClosedEvent) => {
      const finalPct = data.amountTransferred > 0 ? 5 : 0
      this.graph.triggerCloseAnimation?.(finalPct)
      if (data.amountTransferred > 0 && data.isWinner) {
        this.showCloseFlash(data.amountTransferred)
      }
    }
    window.phaserEvents?.on('position_closed', this.closeListener)
  }

  handleResize(): void {
    this.closeFlashText.setPosition(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2
    )
    this.closeFlashText.setFontSize(Math.max(28, Math.round(this.scene.cameras.main.width * 0.07)))
  }

  shutdown(): void {
    if (this.liquidationListener) {
      window.phaserEvents?.off('position_liquidated', this.liquidationListener)
      this.liquidationListener = null
    }

    if (this.closeListener) {
      window.phaserEvents?.off('position_closed', this.closeListener)
      this.closeListener = null
    }

    this.closeFlashText?.destroy()
  }

  private showCloseFlash(amountTransferred: number): void {
    const centerX = this.scene.cameras.main.width / 2
    const centerY = this.scene.cameras.main.height / 2
    const flashAmount = amountTransferred.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })

    this.scene.tweens.killTweensOf(this.closeFlashText)
    this.closeFlashText.setText(`WON ${flashAmount}`)
    this.closeFlashText.setPosition(centerX, centerY + 20)
    this.closeFlashText.setScale(0.92)
    this.closeFlashText.setAlpha(0)
    this.closeFlashText.setVisible(true)

    this.scene.tweens.add({
      targets: this.closeFlashText,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.92, to: 1.05 },
      scaleY: { from: 0.92, to: 1.05 },
      y: { from: centerY + 20, to: centerY },
      duration: 180,
      ease: 'Cubic.out',
      yoyo: true,
      hold: 240,
      onComplete: () => {
        this.closeFlashText.setVisible(false)
        this.closeFlashText.setAlpha(0)
        this.closeFlashText.setScale(1)
        this.closeFlashText.setPosition(centerX, centerY)
      },
    })
  }
}
