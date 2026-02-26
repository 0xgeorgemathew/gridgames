import { Scene } from 'phaser'
import { PositionCardRenderer, CARD_DIMENSIONS } from './PositionCardRenderer'
import { PositionCard } from '../objects/PositionCard'
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'
import type { Position } from '@/domains/tap-dancer/shared/trading.types'
import type { PositionClosingState } from '@/domains/tap-dancer/client/state/trading.types'

/**
 * PositionCardSystem - Orchestration layer for position cards
 *
 * Subscribes to Zustand store for position updates.
 * Creates/destroys cards as positions open/close.
 * Handles throttled PnL updates.
 */
export class PositionCardSystem {
  private scene: Scene
  private eventEmitter?: Phaser.Events.EventEmitter

  private cards: Map<string, PositionCard> = new Map()
  private unsubscribeStore?: () => void
  private isShutdown = false

  // Track if initial resize has happened (camera dimensions are ready)
  private hasInitialResize = false

  // PnL update throttling
  private priceUpdateThrottle: number = 0
  private readonly PRICE_UPDATE_INTERVAL: number = 100 // ms

  // Layout constants (matching React PositionIndicator)
  private readonly CARD_GAP = 6
  private readonly MAX_HEIGHT = 260

  // Safe default dimensions when camera not available
  private readonly SAFE_WIDTH = 390 // Default mobile width
  private readonly SAFE_HEIGHT = 844 // Default mobile height

  constructor(scene: Scene) {
    this.scene = scene
  }

  /**
   * Create card textures and initialize
   */
  create(eventEmitter: Phaser.Events.EventEmitter): void {
    this.eventEmitter = eventEmitter

    // Generate cached textures FIRST
    const renderer = new PositionCardRenderer(this.scene)
    renderer.generateCachedTextures()

    // Verify textures exist before creating cards
    const requiredTextures = [
      'card_near_zero',
      'card_profit',
      'card_loss',
      'indicator_long',
      'indicator_short',
    ]
    const missingTextures = requiredTextures.filter((key) => !this.scene.textures.exists(key))

    if (missingTextures.length > 0) {
      console.warn('[PositionCardSystem] Missing textures:', missingTextures)
    }

    // Subscribe to store updates
    this.subscribeToStore()

    // DON'T create cards yet - wait for handleResize() to be called first
    // which happens after TradingScene registers the resize listener
    // This ensures camera dimensions are correct before positioning cards
  }

  /**
   * Subscribe to Zustand store for position updates
   */
  private subscribeToStore(): void {
    let prevPositions: Map<string, Position> = new Map()

    this.unsubscribeStore = useTradingStore.subscribe((state) => {
      if (this.isShutdown) return

      const currentPositions = state.openPositions
      const localPlayerId = state.localPlayerId

      // Check for new positions
      currentPositions.forEach((position, id) => {
        if (position.playerId !== localPlayerId) return
        if (position.status !== 'open') return

        if (!prevPositions.has(id) && !this.cards.has(id)) {
          // New position - create card
          this.createCard(position)
        }
      })

      // Check for removed positions (will be handled by closingPositions)
      prevPositions.forEach((_, id) => {
        if (!currentPositions.has(id) && this.cards.has(id)) {
          // Position removed from store - card should already be closing
          // If not, destroy it
          const card = this.cards.get(id)
          if (card && !card.getIsClosing()) {
            this.destroyCard(id)
          }
        }
      })

      // Check for closing positions
      state.closingPositions.forEach((closingState, positionId) => {
        const card = this.cards.get(positionId)
        if (card && !card.getIsClosing()) {
          card.setClosing(closingState.reason, closingState.realizedPnl)

          // Schedule card destruction
          this.scene.time.delayedCall(1200, () => {
            this.destroyCard(positionId)
          })
        }
      })

      prevPositions = new Map(currentPositions)
    })
  }

  /**
   * Sync cards with current store state (initial load)
   */
  private syncCards(): void {
    const state = useTradingStore.getState()
    const localPlayerId = state.localPlayerId

    state.openPositions.forEach((position) => {
      if (position.playerId === localPlayerId && position.status === 'open') {
        this.createCard(position)
      }
    })

    // Also check closing positions
    state.closingPositions.forEach((closingState, positionId) => {
      const position = state.openPositions.get(positionId)
      if (position) {
        const card = this.createCard(position)
        card?.setClosing(closingState.reason, closingState.realizedPnl)
      }
    })
  }

  /**
   * Create a new position card
   */
  private createCard(position: Position): PositionCard | undefined {
    if (this.cards.has(position.id)) return undefined
    if (this.isShutdown) return undefined

    // Guard against scene being destroyed or not fully initialized
    // When scene is shutdown, displayList becomes null which causes
    // Container constructor to fail with "Cannot read properties of null (reading 'queueDepthSort')"
    if (!this.scene.sys?.displayList) return undefined

    const cardCount = this.cards.size
    const y = this.calculateCardY(cardCount)
    const x = this.calculateCardX()

    console.log('[PositionCard] Creating card at:', x, y, 'for position:', position.id)

    const card = new PositionCard(this.scene, {
      position,
      x,
      y,
      onClose: (positionId) => this.handleClosePosition(positionId),
    })

    this.scene.add.existing(card as Phaser.GameObjects.Container)
    this.cards.set(position.id, card)

    // Reposition all cards
    this.repositionCards()

    return card
  }

  /**
   * Destroy a position card
   */
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

  /**
   * Calculate X position (centered horizontally)
   */
  private calculateCardX(): number {
    const camera = this.scene.cameras.main
    const width = camera?.width ?? this.SAFE_WIDTH

    console.log(
      '[PositionCardSystem] calculateCardX - camera width:',
      camera?.width,
      'result:',
      width / 2
    )

    // Center horizontally on screen
    return width / 2
  }

  /**
   * Calculate Y position for a card at given index
   */
  private calculateCardY(index: number): number {
    const camera = this.scene.cameras.main
    const height = camera?.height ?? this.SAFE_HEIGHT

    const cardHeight = CARD_DIMENSIONS.height
    const totalHeight = (index + 1) * cardHeight + index * this.CARD_GAP

    // Position above buttons (buttons are at bottom-24 = 96px from bottom)
    // Buttons are 88px tall, so top of button is at 96 + 44 = 140px from bottom
    // Add 48px gap for clear separation = cards spawn well above buttons
    const BOTTOM_OFFSET = 200
    const baseY = height - BOTTOM_OFFSET
    return baseY - totalHeight + cardHeight / 2
  }

  /**
   * Reposition all cards (after add/remove)
   */
  private repositionCards(): void {
    const cards = Array.from(this.cards.values())
      .filter((c) => !c.getIsClosing())
      .sort((a, b) => a.getPosition().openedAt - b.getPosition().openedAt)

    cards.forEach((card, index) => {
      const targetY = this.calculateCardY(index)
      // Smooth transition to new position
      this.scene.tweens.add({
        targets: card,
        y: targetY,
        duration: 200,
        ease: 'Power2',
      })
    })
  }

  /**
   * Handle close position tap
   */
  private handleClosePosition(positionId: string): void {
    if (this.isShutdown) return

    // Emit event that TradingSceneServices will listen to
    window.phaserEvents?.emit('close_position', { positionId })
  }

  /**
   * Update - called each frame
   */
  update(delta: number): void {
    if (this.isShutdown) return

    // Throttled PnL updates
    this.priceUpdateThrottle += delta
    if (this.priceUpdateThrottle >= this.PRICE_UPDATE_INTERVAL) {
      this.priceUpdateThrottle = 0
      this.updatePnL()
    }
  }

  /**
   * Update PnL for all cards
   */
  private updatePnL(): void {
    const state = useTradingStore.getState()
    const currentPrice = state.priceData?.price

    if (currentPrice === undefined || currentPrice === null) return

    this.cards.forEach((card) => {
      if (!card.getIsClosing()) {
        card.updatePnL(currentPrice)
      }
    })
  }

  /**
   * Handle resize - reposition cards
   * ALSO used for initial card creation after camera dimensions are ready
   */
  handleResize(): void {
    const x = this.calculateCardX()

    // On first resize, sync cards from store (camera dimensions now ready)
    if (!this.hasInitialResize) {
      console.log('[PositionCardSystem] handleResize - initial resize, syncing cards')
      this.hasInitialResize = true
      this.syncCards()
      return
    }

    console.log('[PositionCardSystem] handleResize - repositioning cards to x:', x)

    // Subsequent resizes just reposition existing cards
    this.cards.forEach((card) => {
      card.x = x
    })

    this.repositionCards()
  }

  /**
   * Shutdown - cleanup
   */
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
}
