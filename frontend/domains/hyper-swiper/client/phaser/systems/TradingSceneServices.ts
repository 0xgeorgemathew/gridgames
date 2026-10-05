import * as Phaser from 'phaser'
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

  private eventEmitter?: Phaser.Events.EventEmitter
  private removeCoinHandler = (coinId: string) => {
    if (!this.isShutdown) this.coinLifecycle?.removeCoin(coinId)
  }
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
    this.eventEmitter = eventEmitter
    eventEmitter.on('coin_spawn', this.handleCoinSpawn, this)
    eventEmitter.on('opponent_slice', this.handleOpponentSlice, this)
    eventEmitter.on('clear_coins', this.cleanupCoins, this)
    eventEmitter.on('remove_coin', this.removeCoinHandler)
    eventEmitter.on(
      'local_slice_confirmed',
      this.collision.handleLocalSliceConfirmed,
      this.collision
    )
    eventEmitter.on('local_slice_rejected', this.collision.handleLocalSliceRejected, this.collision)

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
    this.priceGraph.handleResize()
    this.positionCardSystem.handleResize()
  }

  shutdown(): void {
    this.isShutdown = true

    this.eventEmitter?.off('coin_spawn', this.handleCoinSpawn, this)
    this.eventEmitter?.off('opponent_slice', this.handleOpponentSlice, this)
    this.eventEmitter?.off('clear_coins', this.cleanupCoins, this)
    this.eventEmitter?.off('remove_coin', this.removeCoinHandler)
    this.eventEmitter?.off(
      'local_slice_confirmed',
      this.collision.handleLocalSliceConfirmed,
      this.collision
    )
    this.eventEmitter?.off(
      'local_slice_rejected',
      this.collision.handleLocalSliceRejected,
      this.collision
    )
    this.eventEmitter = undefined

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
