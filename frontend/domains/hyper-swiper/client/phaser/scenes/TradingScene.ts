import * as Phaser from 'phaser'
import { Scene } from 'phaser'
import {
  useTradingStore,
  type PhaserEventBridge,
} from '@/domains/hyper-swiper/client/state/trading.store'
import { TradingSceneServices } from '@/domains/hyper-swiper/client/phaser/systems/TradingSceneServices'

export class TradingScene extends Scene {
  private services: TradingSceneServices
  private eventEmitter: Phaser.Events.EventEmitter
  private cleanupScene?: () => void

  constructor() {
    super({ key: 'TradingScene' })
    this.eventEmitter = new Phaser.Events.EventEmitter()
    this.services = new TradingSceneServices(this)
  }

  preload(): void {
    this.services = new TradingSceneServices(this)
    this.services.preload()
  }

  create(): void {
    this.eventEmitter = new Phaser.Events.EventEmitter()
    const emitter = this.eventEmitter
    const services = this.services
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup)
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup)
      this.shutdownResources(emitter, services)
      if (this.cleanupScene === cleanup) this.cleanupScene = undefined
    }
    this.cleanupScene = cleanup
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup)
    // Assign window.phaserEvents BEFORE services.create so event listeners can register
    ;(window as { phaserEvents?: PhaserEventBridge }).phaserEvents = this
      .eventEmitter as PhaserEventBridge
    this.services.create(this.eventEmitter)
    ;(window as { setSceneReady?: (ready: boolean) => void }).setSceneReady = (ready: boolean) => {
      useTradingStore.getState().isSceneReady = ready
    }
    ;(window as unknown as { setSceneReady?: (ready: boolean) => void }).setSceneReady?.(true)

    // Emit scene_ready to server after Phaser initialization completes
    // This ensures the server waits for both clients before starting the game loop
    const tradingStore = useTradingStore.getState()
    if (tradingStore.socket && tradingStore.socket.connected) {
      tradingStore.socket.emit('scene_ready')
    }

    const updateDimensions = () => {
      if (!this.isCameraAvailable()) return
      ;(window as { sceneDimensions?: { width: number; height: number } }).sceneDimensions = {
        width: this.cameras.main.width,
        height: this.cameras.main.height,
      }
    }

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (!this.isCameraAvailable()) return

      this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height)
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height)
      this.services.handleResize()
      updateDimensions()
    })

    updateDimensions()
    setTimeout(updateDimensions, 100)
    setTimeout(updateDimensions, 300)
    setTimeout(updateDimensions, 500)
  }

  update(_time: number, delta: number): void {
    // Pass actual delta - Phaser's fixedStep physics handles timing consistency
    this.services.update(delta)
  }

  shutdown(): void {
    this.cleanupScene?.()
  }

  private shutdownResources(
    emitter: Phaser.Events.EventEmitter,
    services: TradingSceneServices
  ): void {
    this.scale.off('resize')
    if (window.phaserEvents === emitter) {
      const setReady = (window as unknown as { setSceneReady?: (ready: boolean) => void })
        .setSceneReady
      setReady?.(false)
      delete (window as unknown as { setSceneReady?: (ready: boolean) => void }).setSceneReady
      delete (window as { phaserEvents?: PhaserEventBridge }).phaserEvents
    }
    services.shutdown()
    emitter.removeAllListeners()
    emitter.destroy()
  }

  private isCameraAvailable(): boolean {
    return this.cameras?.main !== undefined
  }
}
