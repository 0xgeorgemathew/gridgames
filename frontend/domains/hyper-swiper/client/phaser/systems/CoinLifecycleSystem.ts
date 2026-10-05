import { GameObjects, Scene } from 'phaser'
import type { CoinType, CoinSpawnEvent } from '@/domains/hyper-swiper/shared/trading.types'
import { Token } from '@/domains/hyper-swiper/client/phaser/objects/Token'
import { CoinRenderer, COIN_CONFIG } from './CoinRenderer'
import { SpatialGrid } from './SpatialGrid'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/slices/index'

export class CoinLifecycleSystem {
  private scene: Scene
  private isMobile = false
  private tokenPool!: GameObjects.Group
  private coinRenderer!: CoinRenderer
  private spatialGrid!: SpatialGrid
  private lastSequenceIndex = -1

  constructor(scene: Scene) {
    this.scene = scene
  }

  create(isMobile: boolean): void {
    this.isMobile = isMobile
    this.coinRenderer = new CoinRenderer(this.scene)
    this.spatialGrid = new SpatialGrid()

    this.coinRenderer.generateCachedTextures()

    this.tokenPool = this.scene.add.group({
      classType: Token,
      runChildUpdate: true,
      maxSize: 50,
      active: true,
      createCallback: (token) => {
        const t = token as Token
        t.setVisible(false)
        t.setActive(false)
      },
    })
  }

  update(_delta: number): void {
    this.updateCoinPhysics()
  }

  shutdown(): void {
    this.tokenPool?.clear(true, true)
    this.spatialGrid?.clear()
  }

  getTokenPool(): GameObjects.Group {
    return this.tokenPool
  }

  getSpatialGrid(): SpatialGrid {
    return this.spatialGrid
  }

  handleCoinSpawn(data: CoinSpawnEvent): void {
    if (!this.tokenPool) return
    if (!this.scene.cameras?.main) return

    if (data.sequenceIndex !== undefined && data.sequenceIndex !== this.lastSequenceIndex + 1) {
      console.warn(
        `[CoinSync] Non-monotonic sequence index: expected ${this.lastSequenceIndex + 1}, got ${data.sequenceIndex}. ` +
          `Possible dropped event(s).`
      )
    }
    this.lastSequenceIndex = data.sequenceIndex ?? this.lastSequenceIndex + 1

    const config = COIN_CONFIG[data.coinType]
    if (!config) return

    const spawnX = Math.max(0, Math.min(1, data.xNormalized)) * this.scene.cameras.main.width
    const spawnY = this.scene.cameras.main.height + 100

    const token = this.tokenPool.get(spawnX, spawnY) as Token
    if (!token) return

    if (token.body && token.body.enable) {
      token.body.enable = true
    }

    token.spawn(
      spawnX,
      spawnY,
      data.coinType,
      data.coinId,
      config,
      this.isMobile,
      data.velocityX,
      data.velocityY
    )

    token.setData('gridX', token.x)
    token.setData('gridY', token.y)

    this.spatialGrid.addCoinToGrid(data.coinId, token.x, token.y)
  }

  cleanupCoins(): void {
    if (!this.tokenPool) return
    if (!this.scene || !this.scene.sys?.isActive()) return

    try {
      const children = this.tokenPool.getChildren()
      if (!children) return

      children.forEach((child) => {
        const token = child as Token

        if (!token.active) return

        token.setActive(false)
        token.setVisible(false)

        if (token.body) {
          this.scene.physics.world.disableBody(token.body)
        }

        const coinId = token.getData('id')
        if (coinId && this.spatialGrid) {
          const gridX = (token.getData('gridX') as number) ?? token.x
          const gridY = (token.getData('gridY') as number) ?? token.y
          this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)
        }
      })

      if (this.spatialGrid) {
        this.spatialGrid.clear()
      }
    } catch (e) {
      // Group may have been destroyed during scene shutdown - silently ignore
      console.warn('cleanupCoins: tokenPool already destroyed', e)
    }
  }

  removeCoin(coinId: string): void {
    const token = this.tokenPool.getChildren().find((t) => {
      const tokenObj = t as Token
      return tokenObj.getData('id') === coinId && tokenObj.active
    }) as Token | undefined

    if (token) {
      const gridX = (token.getData('gridX') as number) ?? token.x
      const gridY = (token.getData('gridY') as number) ?? token.y

      this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)

      if (token.body) {
        this.scene.physics.world.disableBody(token.body)
      }

      token.setActive(false)
      token.setVisible(false)
    }
  }

  private updateCoinPhysics(): void {
    if (!this.tokenPool) return

    const sceneHeight = this.scene.cameras.main.height

    this.tokenPool.getChildren().forEach((token) => {
      const t = token as Token
      if (!t.active) return

      const coinId = t.getData('id')
      const gridX = (t.getData('gridX') as number) ?? t.x
      const gridY = (t.getData('gridY') as number) ?? t.y

      if (t.y > sceneHeight + 200) {
        // Notify server that coin expired (fell below screen)
        useTradingStore.getState().expireCoin(coinId)

        this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)
        t.setActive(false)
        t.setVisible(false)
        if (t.body) {
          this.scene.physics.world.disableBody(t.body)
        }
        return
      }

      if (Math.abs(t.x - gridX) > 1 || Math.abs(t.y - gridY) > 1) {
        this.spatialGrid.removeCoinFromGrid(coinId, gridX, gridY)
        this.spatialGrid.addCoinToGrid(coinId, t.x, t.y)
        t.setData('gridX', t.x)
        t.setData('gridY', t.y)
      }
    })
  }
}
