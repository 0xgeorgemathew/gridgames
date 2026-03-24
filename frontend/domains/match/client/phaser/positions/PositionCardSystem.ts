import { Scene } from 'phaser'
import { PositionCardRenderer, CARD_DIMENSIONS } from './PositionCardRenderer'
import { PositionCard } from './PositionCard'
import type {
  PositionStoreAdapter,
  SharedPosition as Position,
  SharedPositionClosingState as PositionClosingState,
} from './types'

interface CardLayoutSizes {
  cardGap: number
  maxHeight: number
  bottomOffset: number
}

const CARD_LAYOUT_BY_HEIGHT: Record<number, CardLayoutSizes> = {
  667: { cardGap: 4, maxHeight: 200, bottomOffset: 160 },
  736: { cardGap: 5, maxHeight: 220, bottomOffset: 170 },
  780: { cardGap: 5, maxHeight: 240, bottomOffset: 180 },
  844: { cardGap: 6, maxHeight: 260, bottomOffset: 200 },
  852: { cardGap: 6, maxHeight: 260, bottomOffset: 200 },
  896: { cardGap: 6, maxHeight: 260, bottomOffset: 200 },
  926: { cardGap: 7, maxHeight: 280, bottomOffset: 210 },
  932: { cardGap: 7, maxHeight: 280, bottomOffset: 220 },
}

const BASE_LAYOUT: CardLayoutSizes = { cardGap: 6, maxHeight: 260, bottomOffset: 200 }

function getCardLayoutSizes(): CardLayoutSizes {
  if (typeof window === 'undefined') return BASE_LAYOUT
  const height = window.screen.height
  if (height < 667 || height > 932) return BASE_LAYOUT
  return CARD_LAYOUT_BY_HEIGHT[height] ?? BASE_LAYOUT
}

export class SharedPositionCardSystem {
  private cards: Map<string, PositionCard> = new Map()
  private unsubscribeStore?: () => void
  private isShutdown = false
  private hasInitialResize = false
  private priceUpdateThrottle = 0
  private readonly PRICE_UPDATE_INTERVAL = 100
  private readonly SAFE_WIDTH = 390
  private readonly SAFE_HEIGHT = 844

  constructor(
    private scene: Scene,
    private store: PositionStoreAdapter
  ) {}

  create(_eventEmitter: Phaser.Events.EventEmitter): void {
    const renderer = new PositionCardRenderer(this.scene)
    renderer.generateCachedTextures()

    const requiredTextures = [
      'card_near_zero',
      'card_profit',
      'card_loss',
      'indicator_up',
      'indicator_down',
    ]
    const missingTextures = requiredTextures.filter((key) => !this.scene.textures.exists(key))

    if (missingTextures.length > 0) {
      console.warn('[PositionCardSystem] Missing textures:', missingTextures)
    }

    this.subscribeToStore()
  }

  update(delta: number): void {
    if (this.isShutdown) return

    this.priceUpdateThrottle += delta
    if (this.priceUpdateThrottle >= this.PRICE_UPDATE_INTERVAL) {
      this.priceUpdateThrottle = 0
      this.updateCloseAvailability()
    }
  }

  handleResize(): void {
    const x = this.calculateCardX()

    if (!this.hasInitialResize) {
      this.hasInitialResize = true
      this.syncCards()
      return
    }

    this.cards.forEach((card) => {
      card.handleResize(x)
    })

    this.repositionCards()
  }

  shutdown(): void {
    this.isShutdown = true

    if (this.unsubscribeStore) {
      this.unsubscribeStore()
      this.unsubscribeStore = undefined
    }

    this.cards.forEach((card) => {
      card.destroy()
    })
    this.cards.clear()
  }

  private subscribeToStore(): void {
    let prevPositions: Map<string, Position> = new Map()

    this.unsubscribeStore = this.store.subscribe((state) => {
      if (this.isShutdown) return

      const currentPositions = state.openPositions
      const localPlayerId = state.localPlayerId

      currentPositions.forEach((position, id) => {
        if (position.playerId !== localPlayerId) return
        if (position.status !== 'open') return

        if (!prevPositions.has(id) && !this.cards.has(id)) {
          this.createCard(position)
        }
      })

      prevPositions.forEach((_, id) => {
        if (!currentPositions.has(id) && this.cards.has(id)) {
          const card = this.cards.get(id)
          if (card && !card.getIsClosing()) {
            this.destroyCard(id)
          }
        }
      })

      state.closingPositions.forEach((closingState: PositionClosingState, positionId: string) => {
        const card = this.cards.get(positionId)
        if (card && !card.getIsClosing()) {
          card.setClosing(closingState.reason, closingState.realizedPnl)
          this.scene.time.delayedCall(1200, () => {
            this.destroyCard(positionId)
          })
        }
      })

      prevPositions = new Map(currentPositions)
    })
  }

  private syncCards(): void {
    const state = this.store.getState()
    const localPlayerId = state.localPlayerId

    state.openPositions.forEach((position) => {
      if (position.playerId === localPlayerId && position.status === 'open') {
        this.createCard(position)
      }
    })

    state.closingPositions.forEach((closingState: PositionClosingState, positionId: string) => {
      const position = state.openPositions.get(positionId)
      if (position) {
        const card = this.createCard(position)
        card?.setClosing(closingState.reason, closingState.realizedPnl)
      }
    })
  }

  private createCard(position: Position): PositionCard | undefined {
    if (this.cards.has(position.id)) return undefined
    if (this.isShutdown) return undefined
    if (!this.scene.sys?.displayList) return undefined

    const cardCount = this.cards.size
    const y = this.calculateCardY(cardCount)
    const x = this.calculateCardX()

    const card = new PositionCard(this.scene, {
      position,
      x,
      y,
      onClose: (positionId) => this.store.requestClose(positionId),
    })

    this.scene.add.existing(card as Phaser.GameObjects.Container)
    this.cards.set(position.id, card)
    this.repositionCards()

    return card
  }

  private destroyCard(positionId: string): void {
    const card = this.cards.get(positionId)
    if (card) {
      card.playExitAnimation(() => {
        card.destroy()
        this.cards.delete(positionId)
        this.repositionCards()
      })
    }
  }

  private calculateCardX(): number {
    const camera = this.scene.cameras.main
    const width = camera?.width ?? this.SAFE_WIDTH

    return width / 2
  }

  private calculateCardY(index: number): number {
    const camera = this.scene.cameras.main
    const height = camera?.height ?? this.SAFE_HEIGHT
    const { cardGap, bottomOffset } = getCardLayoutSizes()

    const cardHeight = CARD_DIMENSIONS.height
    const totalHeight = (index + 1) * cardHeight + index * cardGap

    const baseY = height - bottomOffset
    return baseY - totalHeight + cardHeight / 2
  }

  private repositionCards(): void {
    const cards = Array.from(this.cards.values())
      .filter((c) => !c.getIsClosing())
      .sort((a, b) => a.getPosition().openedAt - b.getPosition().openedAt)

    cards.forEach((card, index) => {
      const targetY = this.calculateCardY(index)
      card.setTargetY(targetY)
    })
  }

  private updateCloseAvailability(): void {
    const state = this.store.getState()
    const currentPrice = state.priceData?.price

    if (currentPrice === undefined || currentPrice === null) return

    this.cards.forEach((card) => {
      if (!card.getIsClosing()) {
        card.updateCloseAvailability(currentPrice)
      }
    })
  }
}
