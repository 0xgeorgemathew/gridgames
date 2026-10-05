import { Geom, Scene } from 'phaser'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import type { CoinType } from '@/domains/hyper-swiper/shared/trading.types'
import { Token } from '@/domains/hyper-swiper/client/phaser/objects/Token'
import { ParticleSystem } from './ParticleSystem'
import { VisualEffects } from './VisualEffects'
import { BladeRenderer } from './BladeRenderer'
import { AudioManager } from './AudioManager'
import { CoinLifecycleSystem } from './CoinLifecycleSystem'
import { getPositionOpeningCapacity } from '@/domains/match/position-opening'
import { CLIENT_GAME_CONFIG as CFG } from '../../game.config'
import { COIN_CONFIG } from './CoinRenderer'

export class CollisionSystem {
  private scene: Scene
  private isMobile = false
  private particles!: ParticleSystem
  private visualEffects!: VisualEffects
  private coinLifecycle!: CoinLifecycleSystem
  private bladeRenderer!: BladeRenderer
  private audio!: AudioManager
  private collisionLine = new Geom.Line(0, 0, 0, 0)
  private collisionCircle = new Geom.Circle(0, 0, 0)

  constructor(scene: Scene) {
    this.scene = scene
  }

  create(isMobile: boolean): void {
    this.isMobile = isMobile
    this.particles = new ParticleSystem(this.scene)
    this.visualEffects = new VisualEffects(this.scene, isMobile)
  }

  setShutdown(shutdown: boolean): void {
    this.visualEffects?.setShutdown(shutdown)
  }

  setDependencies(
    coinLifecycle: CoinLifecycleSystem,
    bladeRenderer: BladeRenderer,
    audio: AudioManager
  ): void {
    this.coinLifecycle = coinLifecycle
    this.bladeRenderer = bladeRenderer
    this.audio = audio
  }

  update(delta: number): void {
    this.particles.update(delta)
    this.checkCollisions()
    this.visualEffects.update()
  }

  shutdown(): void {
    this.particles?.destroy()
    this.setShutdown(true)
    this.visualEffects?.destroy()
  }

  handleOpponentSlice(data: { playerName: string; coinType: CoinType; coinId: string }): void {
    if (!this.scene.add || !this.scene.cameras || !this.coinLifecycle) return

    const tokenPool = this.coinLifecycle.getTokenPool()
    const tokens = tokenPool.getChildren() as Token[]
    const targetCoin = tokens.find((t) => t.active && t.getData('id') === data.coinId)

    if (targetCoin) this.coinLifecycle.removeCoin(data.coinId)
  }

  private checkCollisions(): void {
    const segments = this.bladeRenderer.getCollisionSegments()
    if (segments.length === 0) return

    const tokenPool = this.coinLifecycle.getTokenPool()
    if (!tokenPool) return

    const slicedThisFrame = new Set<string>()

    for (const token of tokenPool.getChildren()) {
      const tokenObj = token as Token
      if (!tokenObj.active || tokenObj.getData('claimPending')) continue

      const coinId = tokenObj.getData('id')
      if (slicedThisFrame.has(coinId)) continue

      const type = tokenObj.getData('type') as CoinType
      const config = COIN_CONFIG[type]

      const mobileScale = this.isMobile ? 0.5 : 0.65
      const RENDER_SCALE = 4
      const hitboxRadius =
        config.radius * RENDER_SCALE * 0.85 * mobileScale * (config.hitboxMultiplier ?? 1.0)
      this.collisionCircle.setTo(tokenObj.x, tokenObj.y, hitboxRadius)

      for (const seg of segments) {
        this.collisionLine.setTo(seg.x1, seg.y1, seg.x2, seg.y2)

        if (Geom.Intersects.LineToCircle(this.collisionLine, this.collisionCircle)) {
          this.sliceCoin(coinId, tokenObj)
          slicedThisFrame.add(coinId)
          break
        }
      }
    }
  }

  handleLocalSliceConfirmed(data: { coinId: string; coinType: CoinType }): void {
    const coin = (this.coinLifecycle.getTokenPool().getChildren() as Token[]).find(
      (token) => token.active && token.getData('id') === data.coinId
    )
    if (!coin) return
    const config = COIN_CONFIG[data.coinType]
    if (!config) return
    this.audio.playSliceAt(coin.x, this.scene.cameras.main.width)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.particles.emitSlice(coin.x, coin.y, config.color, 10)
      this.visualEffects.createSplitEffect(
        coin.x,
        coin.y,
        config.color,
        config.radius,
        data.coinType
      )
    }
    this.coinLifecycle.removeCoin(data.coinId)
  }

  handleLocalSliceRejected(data: { coinId: string }): void {
    const coin = (this.coinLifecycle.getTokenPool().getChildren() as Token[]).find(
      (token) => token.active && token.getData('id') === data.coinId
    )
    coin?.setData('claimPending', false)
    coin?.setAlpha(1)
  }

  private sliceCoin(coinId: string, coin: Token): void {
    const store = useTradingStore.getState()
    const player = store.players.find((entry) => entry.id === store.localPlayerId)
    const opponent = store.players.find((entry) => entry.id !== store.localPlayerId)
    if (!store.socket?.connected || !player || !opponent) return
    const positions = Array.from(store.openPositions.values()).filter(
      (position) => position.status === 'open'
    )
    if (
      !getPositionOpeningCapacity({
        playerBalance: player.dollars,
        opponentBalance: opponent.dollars,
        playerOpenPositions: positions.filter(
          (position) => position.playerId === store.localPlayerId
        ).length,
        opponentOpenPositions: positions.filter(
          (position) => position.playerId !== store.localPlayerId
        ).length,
        stakeAmount: CFG.STAKE_AMOUNT,
      }).canOpen
    )
      return
    coin.setData('claimPending', true)
    coin.setAlpha(0.65)
    store.sliceCoin(coinId, coin.getData('type') as CoinType)
  }
}
