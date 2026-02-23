import { Scene } from 'phaser'
import { useTradingStore, type PhaserEventBridge } from '../stores/trading-store'
import { TradingSceneServices } from '../systems/TradingSceneServices'

export class TradingScene extends Scene {
  private services: TradingSceneServices
  private eventEmitter: Phaser.Events.EventEmitter

  constructor() {
    super({ key: 'TradingScene' })
    this.eventEmitter = new Phaser.Events.EventEmitter()
    this.services = new TradingSceneServices(this)
  }

  preload(): void {
    this.services.preload()
  }

  create(): void {
    this.services.create(this.eventEmitter)
    ;(window as { phaserEvents?: PhaserEventBridge }).phaserEvents = this
      .eventEmitter as PhaserEventBridge
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
    const clampedDelta = Math.max(4, Math.min(50, delta))
    this.services.update(clampedDelta)
  }

  shutdown(): void {
    this.scale.off('resize')

    const setReady = (window as unknown as { setSceneReady?: (ready: boolean) => void })
      .setSceneReady
    setReady?.(false)
    delete (window as unknown as { setSceneReady?: (ready: boolean) => void }).setSceneReady
    delete (window as { phaserEvents?: PhaserEventBridge }).phaserEvents

    this.services.shutdown()
    // Remove all event listeners before destroying the event emitter
    this.eventEmitter.removeAllListeners()
    this.eventEmitter.destroy()
  }

  private isCameraAvailable(): boolean {
    return this.cameras?.main !== undefined
  }
}
