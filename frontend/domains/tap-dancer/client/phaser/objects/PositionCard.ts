import { Scene, GameObjects, Tweens } from 'phaser'
import {
  CARD_COLORS,
  getCardDimensions,
  type CardVisualState,
} from '../systems/PositionCardRenderer'
import type { Position } from '@/domains/tap-dancer/shared/trading.types'

interface PositionCardConfig {
  position: Position
  x: number
  y: number
  onClose: (positionId: string) => void
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Format PnL percentage for display
 */
function formatPnlPercent(value: number): string {
  const formatted = (value / 100).toLocaleString('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value >= 0 ? `+${formatted}` : formatted
}

/**
 * Format PnL currency for display
 */
function formatPnlCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'exceptZero',
  })
}

export class PositionCard extends GameObjects.Container {
  private cardScene: Scene
  private positionData: Position
  private onClose: (positionId: string) => void

  private background!: GameObjects.Image | GameObjects.Graphics
  private directionIcon!: GameObjects.Image
  private entryPriceText!: GameObjects.Text
  private leverageBadge?: GameObjects.Text
  private directionBadge!: GameObjects.Text
  private pnlText!: GameObjects.Text
  private closeButton!: GameObjects.Text
  private closeZone!: GameObjects.Zone

  private currentVisualState: CardVisualState = 'near_zero'
  private isClosing: boolean = false
  private closingReason?: 'manual' | 'liquidated'
  private realizedPnl?: number

  private enterTween?: Tweens.Tween
  private pulseTween?: Tweens.Tween
  private targetY: number

  /**
   * Get leverage badge colors based on leverage level
   */
  private getLeverageColors(leverage: number): { bg: string; text: string; border: string } {
    if (leverage === 2) {
      return { bg: '#166534', text: '#86efac', border: '#22c55e' } // Green
    } else if (leverage === 5) {
      return { bg: '#713f12', text: '#fde047', border: '#eab308' } // Yellow
    } else if (leverage === 10) {
      return { bg: '#7f1d1d', text: '#fca5a5', border: '#ef4444' } // Red
    }
    return { bg: '#164e63', text: '#67e8f9', border: '#06b6d4' } // Cyan (default)
  }

  /**
   * Draw fallback background using Graphics when texture doesn't exist
   */
  private drawFallbackBackground(): void {
    const dims = getCardDimensions()
    const { width, height, borderRadius } = dims
    const colors = CARD_COLORS[this.currentVisualState]

    const bg = this.cardScene.add.graphics()

    // Background fill
    bg.fillStyle(colors.background, colors.backgroundAlpha)
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius)

    // Border
    bg.lineStyle(2, colors.borderColor, colors.borderAlpha)
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, borderRadius)

    this.background = bg
    this.add(bg)
  }

  constructor(scene: Scene, config: PositionCardConfig) {
    super(scene, config.x, config.y)

    this.targetY = config.y
    this.cardScene = scene
    this.positionData = config.position
    this.onClose = config.onClose

    const dims = getCardDimensions()
    const { width, height, borderRadius, padding, glowPadding, iconSize, gap } = dims
    const { entryFontSize, leverageFontSize, badgeFontSize, pnlFontSize, closeFontSize } = dims

    // =========================================================================
    // LAYER 1: BACKGROUND
    // =========================================================================
    const textureKey = `card_${this.currentVisualState}`
    const textureExists = this.cardScene.textures.exists(textureKey)

    if (textureExists) {
      this.background = scene.add.image(0, 0, textureKey)
      this.background.setOrigin(0.5, 0.5)

      const displayedWidth = width + glowPadding * 2
      const displayedHeight = height + glowPadding * 2
      this.background.setDisplaySize(displayedWidth, displayedHeight)

      this.add(this.background)
    } else {
      this.drawFallbackBackground()
    }

    // =========================================================================
    // LAYER 2: DIRECTION ICON (left side)
    // =========================================================================
    const contentLeft = -width / 2 + glowPadding
    const iconX = contentLeft + padding + iconSize / 2
    this.directionIcon = scene.add.image(
      iconX,
      0,
      this.positionData.isLong ? 'indicator_long' : 'indicator_short'
    )
    this.directionIcon.setDisplaySize(iconSize, iconSize)
    this.add(this.directionIcon)

    // =========================================================================
    // LAYER 3: ENTRY PRICE (center-left, single row)
    // =========================================================================
    const entrySectionX = iconX + iconSize / 2 + gap

    this.entryPriceText = scene.add.text(
      entrySectionX,
      0,
      `$${formatPrice(this.positionData.openPrice)}`,
      {
        fontFamily: 'monospace',
        fontSize: `${entryFontSize}px`,
        fontStyle: 'bold',
        color: '#00f3ff',
      }
    )
    this.entryPriceText.setOrigin(0, 0.5)
    this.entryPriceText.setShadow(0, 0, '#00f3ff', 8, true, true)
    this.add(this.entryPriceText)

    // =========================================================================
    // LAYER 4: LEVERAGE BADGE (after entry price, single row)
    // =========================================================================
    const leverageX = entrySectionX + this.entryPriceText.width + gap
    if (this.positionData.leverage > 1) {
      const colors = this.getLeverageColors(this.positionData.leverage)
      this.leverageBadge = scene.add.text(leverageX, 0, `${this.positionData.leverage}X`, {
        fontFamily: 'monospace',
        fontSize: `${leverageFontSize}px`,
        fontStyle: 'bold',
        color: colors.text,
        backgroundColor: colors.bg,
        padding: { x: 4, y: 2 },
      })
      this.leverageBadge.setOrigin(0, 0.5)
      this.add(this.leverageBadge)
    }

    // =========================================================================
    // LAYER 5: LONG/SHORT BADGE (after leverage, single row)
    // =========================================================================
    let directionX = entrySectionX + this.entryPriceText.width + gap
    if (this.positionData.leverage > 1 && this.leverageBadge) {
      directionX = leverageX + this.leverageBadge.width + gap
    }
    const badgeColor = this.positionData.isLong
      ? { bg: '#14532d', text: '#4ade80', border: '#22c55e' }
      : { bg: '#450a0a', text: '#f87171', border: '#ef4444' }

    this.directionBadge = scene.add.text(
      directionX,
      0,
      this.positionData.isLong ? 'LONG' : 'SHORT',
      {
        fontFamily: 'monospace',
        fontSize: `${badgeFontSize}px`,
        fontStyle: 'bold',
        color: badgeColor.text,
        backgroundColor: badgeColor.bg,
        padding: { x: 6, y: 4 },
      }
    )
    this.directionBadge.setOrigin(0, 0.5)
    this.add(this.directionBadge)

    // =========================================================================
    // LAYER 6: PNL TEXT (right side, single row)
    // =========================================================================
    const pnlOffset = Math.round(width * 0.147)
    this.pnlText = scene.add.text(width / 2 - pnlOffset, 0, '+0.00%', {
      fontFamily: 'monospace',
      fontSize: `${pnlFontSize}px`,
      fontStyle: 'bold',
      color: '#00f3ff',
    })
    this.pnlText.setOrigin(1, 0.5)
    this.add(this.pnlText)

    // =========================================================================
    // LAYER 7: CLOSE BUTTON (X icon, right side, single row)
    // =========================================================================
    const closeOffset = Math.round(width * 0.042)
    this.closeButton = scene.add.text(width / 2 - closeOffset, 0, '×', {
      fontFamily: 'monospace',
      fontSize: `${closeFontSize}px`,
      fontStyle: 'bold',
      color: '#64748b',
      backgroundColor: '#1e293b',
      padding: { x: 6, y: 4 },
    })
    this.closeButton.setOrigin(0.5, 0.5)
    this.add(this.closeButton)

    // =========================================================================
    // LAYER 8: CLOSE ZONE (invisible hit area for close button)
    // =========================================================================
    const closeZoneSize = Math.round(iconSize * 1.3)
    this.closeZone = scene.add.zone(width / 2 - closeOffset, 0, closeZoneSize, closeZoneSize)
    this.closeZone.setInteractive({ useHandCursor: true })
    this.closeZone.on('pointerdown', this.handleCloseTap, this)
    this.closeZone.on('pointerover', () => {
      this.closeButton.setColor('#f87171')
      this.closeButton.setBackgroundColor('#374151')
    })
    this.closeZone.on('pointerout', () => {
      this.closeButton.setColor('#64748b')
      this.closeButton.setBackgroundColor('#1e293b')
    })
    this.add(this.closeZone)

    // Set depth for layering
    this.setDepth(20)

    // Ensure container size matches displayed size for proper hit testing
    this.setSize(width + glowPadding * 2, height + glowPadding * 2)

    // Play enter animation
    this.playEnterAnimation()
  }

  /**
   * Handle close tap
   */
  private handleCloseTap(): void {
    if (this.isClosing) return
    this.onClose(this.positionData.id)
  }

  /**
   * Set target Y position to prevent competing tweens
   */
  setTargetY(y: number): void {
    if (this.targetY === y) return
    this.targetY = y

    this.cardScene.tweens.add({
      targets: this,
      y: y,
      duration: 300,
      ease: 'Back.out(1.2)',
    })
  }

  /**
   * Play enter animation
   */
  private playEnterAnimation(): void {
    this.setAlpha(0)
    this.y += 40
    this.scale = 0.8

    this.enterTween = this.cardScene.tweens.add({
      targets: this,
      alpha: 1,
      y: this.y - 40,
      scale: 1,
      duration: 400,
      ease: 'Back.out(1.0)', // Reduced overshoot for smoother entry
    })
  }

  /**
   * Play exit animation
   */
  playExitAnimation(onComplete: () => void): void {
    if (this.enterTween) {
      this.enterTween.destroy()
    }

    this.cardScene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 20,
      scale: 0.8,
      duration: 250,
      ease: 'Power2',
      onComplete,
    })
  }

  /**
   * Update PnL based on current price
   */
  updatePnL(currentPrice: number): void {
    if (this.isClosing) return

    const priceChangePercent =
      (currentPrice - this.positionData.openPrice) / this.positionData.openPrice
    const directionMultiplier = this.positionData.isLong ? 1 : -1
    const pnlPercent = priceChangePercent * directionMultiplier * this.positionData.leverage * 100

    this.updateVisualState(pnlPercent)
    this.updatePnLText(pnlPercent)
  }

  /**
   * Update visual state based on PnL
   */
  private updateVisualState(pnlPercent: number): void {
    const isNearZero = Math.abs(pnlPercent) < 0.5
    const isInProfit = pnlPercent > 0

    let newState: CardVisualState
    if (isNearZero) {
      newState = 'near_zero'
    } else if (isInProfit) {
      newState = 'profit'
    } else {
      newState = 'loss'
    }

    if (newState !== this.currentVisualState) {
      this.currentVisualState = newState
      // Only update texture if background is an Image (not Graphics fallback)
      if ('setTexture' in this.background) {
        this.background.setTexture(`card_${newState}`)
      }
      this.updatePnLColor()
    }
  }

  /**
   * Update PnL text color
   */
  private updatePnLColor(): void {
    let color: string
    switch (this.currentVisualState) {
      case 'near_zero':
        color = '#00f3ff'
        this.pnlText.setShadow(0, 0, '#00f3ff', 8, true, true)
        break
      case 'profit':
        color = '#4ade80'
        this.pnlText.setShadow(0, 0, '#4ade80', 8, true, true)
        break
      case 'loss':
        color = '#f87171'
        this.pnlText.setShadow(0, 0, '#f87171', 8, true, true)
        break
      case 'closing':
        color = '#00f3ff'
        this.pnlText.setShadow(0, 0, '#00f3ff', 8, true, true)
        break
      case 'liquidated':
        color = '#f87171'
        this.pnlText.setShadow(0, 0, '#f87171', 8, true, true)
        break
    }
    this.pnlText.setColor(color)
  }

  /**
   * Update PnL text content
   */
  private updatePnLText(pnlPercent: number): void {
    this.pnlText.setText(formatPnlPercent(pnlPercent))
  }

  /**
   * Set card to closing state
   */
  setClosing(reason: 'manual' | 'liquidated', realizedPnl?: number): void {
    this.isClosing = true
    this.closingReason = reason
    this.realizedPnl = realizedPnl

    // Update visual state
    this.currentVisualState = reason === 'liquidated' ? 'liquidated' : 'closing'
    // Only update texture if background is an Image (not Graphics fallback)
    if ('setTexture' in this.background) {
      this.background.setTexture(`card_${this.currentVisualState}`)
    }
    this.updatePnLColor()

    // Show closing text
    const closingText = reason === 'liquidated' ? 'Liquidated' : 'Closed'
    if (realizedPnl !== undefined) {
      this.pnlText.setText(`${closingText} ${formatPnlCurrency(realizedPnl)}`)
    } else {
      this.pnlText.setText(closingText)
    }

    // Disable close zone
    this.closeZone.disableInteractive()

    // Play pulse animation
    this.playPulseAnimation()
  }

  /**
   * Play pulse animation for closing state
   */
  private playPulseAnimation(): void {
    if (this.pulseTween) {
      this.pulseTween.destroy()
    }

    const colors = CARD_COLORS[this.currentVisualState]
    this.pulseTween = this.cardScene.tweens.add({
      targets: this.background,
      alpha: { from: 1, to: 0.7 },
      duration: 500,
      yoyo: true,
      repeat: 2,
    })
  }

  /**
   * Get position ID
   */
  getPositionId(): string {
    return this.positionData.id
  }

  /**
   * Get position data
   */
  getPosition(): Position {
    return this.positionData
  }

  /**
   * Check if card is closing
   */
  getIsClosing(): boolean {
    return this.isClosing
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.enterTween) {
      this.enterTween.destroy()
      this.enterTween = undefined
    }
    if (this.pulseTween) {
      this.pulseTween.destroy()
      this.pulseTween = undefined
    }

    super.destroy()
  }
}
