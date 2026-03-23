import { Scene } from 'phaser'
import type { CoinSpawnEvent, CoinType } from '@/domains/hyper-swiper/shared/trading.types'
import { GridBackgroundSystem } from './GridBackgroundSystem'
import { PriceGraphSystem } from './PriceGraphSystem'
import { CoinLifecycleSystem } from './CoinLifecycleSystem'
import { InputAudioSystem } from './InputAudioSystem'
import { CollisionSystem } from './CollisionSystem'
import { PositionCardSystem } from './PositionCardSystem'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'

export class TradingSceneServices {
  private scene: Scene
  private isShutdown = false
  private isMobile = false

  private gridBackground!: GridBackgroundSystem
  private priceGraph!: PriceGraphSystem
  private coinLifecycle!: CoinLifecycleSystem
  private inputAudio!: InputAudioSystem
  private collision!: CollisionSystem
  private positionCardSystem!: PositionCardSystem

  private closePositionHandler?: ({ positionId }: { positionId: string }) => void

  constructor(scene: Scene) {
    this.scene = scene
  }

  preload(): void {
    this.inputAudio = new InputAudioSystem(this.scene)
    this.inputAudio.preload()
  }

  create(eventEmitter: Phaser.Events.EventEmitter): void {
    this.isMobile = this.scene.sys.game.device.os.android || this.scene.sys.game.device.os.iOS
    this.scene.physics.world.setBounds(
      0,
      0,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height
    )

    // Initialize all systems (inputAudio already created in preload)
    this.gridBackground = new GridBackgroundSystem(this.scene)
    this.priceGraph = new PriceGraphSystem(this.scene, this.gridBackground.getScrollSpeed())
    this.coinLifecycle = new CoinLifecycleSystem(this.scene)
    this.collision = new CollisionSystem(this.scene)
    this.positionCardSystem = new PositionCardSystem(this.scene)

    // Create systems in order
    this.gridBackground.create()
    this.priceGraph.create()
    this.coinLifecycle.create(this.isMobile)
    this.inputAudio.create(eventEmitter, this.isMobile)
    this.collision.create(this.isMobile)
    this.positionCardSystem.create(eventEmitter)

    // Wire up cross-system dependencies
    this.collision.setDependencies(
      this.coinLifecycle,
      this.inputAudio.getBladeRenderer(),
      this.inputAudio.getAudio()
    )

    // Set up event handlers
    eventEmitter.on('coin_spawn', this.handleCoinSpawn.bind(this))
    eventEmitter.on('opponent_slice', this.handleOpponentSlice.bind(this))
    eventEmitter.on('clear_coins', this.cleanupCoins.bind(this))

    // Bridge Phaser close_position event to store action
    this.closePositionHandler = ({ positionId }) => {
      useTradingStore.getState().closePosition(positionId)
    }
    window.phaserEvents?.on('close_position', this.closePositionHandler)
  }

  update(delta: number): void {
    if (this.isShutdown) return

    this.gridBackground.update(delta)
    this.priceGraph.update(delta)
    this.coinLifecycle.update(delta)
    this.collision.update(delta)
    this.inputAudio.update()
    this.positionCardSystem.update(delta)
  }

  handleResize(): void {
    this.gridBackground.handleResize()
    this.positionCardSystem.handleResize()
  }

  shutdown(): void {
    this.isShutdown = true

    // Remove close_position event listener
    if (this.closePositionHandler) {
      window.phaserEvents?.off('close_position', this.closePositionHandler)
    }

    this.scene.tweens.killAll()

    this.gridBackground?.shutdown()
    this.priceGraph?.shutdown()
    this.coinLifecycle?.shutdown()
    this.inputAudio?.shutdown()
    this.collision?.shutdown()
    this.positionCardSystem?.shutdown()
  }

  private handleCoinSpawn(data: CoinSpawnEvent): void {
    if (this.isShutdown) return
    this.coinLifecycle.handleCoinSpawn(data)
  }

  private handleOpponentSlice(data: {
    playerName: string
    coinType: CoinType
    coinId: string
  }): void {
    if (this.isShutdown) return
    this.collision.handleOpponentSlice(data)
  }

  private cleanupCoins(): void {
    if (this.isShutdown) return
    if (!this.coinLifecycle) return
    this.coinLifecycle.cleanupCoins()
  }
}
