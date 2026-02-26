import { Scene, GameObjects, Tweens } from 'phaser'
import {
  CARD_COLORS,
  CARD_DIMENSIONS,
  GLOW_PADDING,
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
    const { width, height, borderRadius } = CARD_DIMENSIONS
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

    this.cardScene = scene
    this.positionData = config.position
    this.onClose = config.onClose

    const { width, height, borderRadius } = CARD_DIMENSIONS

    // =========================================================================
    // LAYER 1: BACKGROUND
    // =========================================================================
    const textureKey = `card_${this.currentVisualState}`
    const textureExists = this.cardScene.textures.exists(textureKey)

    if (textureExists) {
      this.background = scene.add.image(0, 0, textureKey)
      this.background.setOrigin(0.5, 0.5)

      // Fix: Set display size to account for 2x render scale
      // Texture is rendered at 2x (for crisp edges), but we display at intended size
      // Content (220x44) + glow padding (12px each side)
      const displayedWidth = CARD_DIMENSIONS.width + GLOW_PADDING * 2 // 244
      const displayedHeight = CARD_DIMENSIONS.height + GLOW_PADDING * 2 // 68
      this.background.setDisplaySize(displayedWidth, displayedHeight)

      this.add(this.background)
    } else {
      // Fallback: Draw background with Graphics if texture doesn't exist
      this.drawFallbackBackground()
    }

    // =========================================================================
    // LAYER 2: DIRECTION ICON (left side, 28x28 box)
    // =========================================================================
    // Account for glow padding when positioning icon - glow adds 12px padding around the card
    const contentLeft = -width / 2 + GLOW_PADDING
    const iconX = contentLeft + 8 + 14 // padding 8 + half of 28px icon
    const iconSize = 28
    this.directionIcon = scene.add.image(
      iconX,
      0, // y=0 for single-row layout
      this.positionData.isLong ? 'indicator_long' : 'indicator_short'
    )
    this.directionIcon.setDisplaySize(iconSize, iconSize)
    this.add(this.directionIcon)

    // =========================================================================
    // LAYER 3: ENTRY PRICE (center-left, single row)
    // =========================================================================
    const entrySectionX = iconX + 14 + 8 // after icon + gap

    // Entry price (cyan with glow) - no separate label for cleaner single-row layout
    this.entryPriceText = scene.add.text(
      entrySectionX,
      0, // y=0 for single-row layout
      `$${formatPrice(this.positionData.openPrice)}`,
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#00f3ff',
      }
    )
    this.entryPriceText.setOrigin(0, 0.5)
    this.entryPriceText.setShadow(0, 0, '#00f3ff', 6, true, true)
    this.add(this.entryPriceText)

    // =========================================================================
    // LAYER 4: LEVERAGE BADGE (after entry price, single row)
    // =========================================================================
    const leverageX = entrySectionX + this.entryPriceText.width + 8
    if (this.positionData.leverage > 1) {
      const colors = this.getLeverageColors(this.positionData.leverage)
      this.leverageBadge = scene.add.text(leverageX, 0, `${this.positionData.leverage}X`, {
        fontFamily: 'monospace',
        fontSize: '9px',
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
    let directionX = entrySectionX + this.entryPriceText.width + 8
    if (this.positionData.leverage > 1 && this.leverageBadge) {
      directionX = leverageX + this.leverageBadge.width + 6
    }
    const badgeColor = this.positionData.isLong
      ? { bg: '#14532d', text: '#4ade80', border: '#22c55e' } // Green
      : { bg: '#450a0a', text: '#f87171', border: '#ef4444' } // Red

    this.directionBadge = scene.add.text(
      directionX,
      0, // y=0 for single-row layout
      this.positionData.isLong ? 'LONG' : 'SHORT',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
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
    this.pnlText = scene.add.text(width / 2 - 56, 0, '+0.00%', {
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#00f3ff',
    })
    this.pnlText.setOrigin(1, 0.5)
    this.add(this.pnlText)

    // =========================================================================
    // LAYER 7: CLOSE BUTTON (X icon, right side, single row)
    // =========================================================================
    this.closeButton = scene.add.text(width / 2 - 16, 0, '×', {
      fontFamily: 'monospace',
      fontSize: '20px',
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
    this.closeZone = scene.add.zone(width / 2 - 16, 0, 36, 36)
    this.closeZone.setInteractive({ useHandCursor: true })
    this.closeZone.on('pointerdown', this.handleCloseTap, this)
    this.closeZone.on('pointerover', () => {
      this.closeButton.setColor('#f87171') // Red on hover
      this.closeButton.setBackgroundColor('#374151')
    })
    this.closeZone.on('pointerout', () => {
      this.closeButton.setColor('#64748b') // Back to dim
      this.closeButton.setBackgroundColor('#1e293b')
    })
    this.add(this.closeZone)

    // Set depth for layering
    this.setDepth(20)

    // Ensure container size matches displayed size for proper hit testing
    // Include glow padding in container size
    this.setSize(
      CARD_DIMENSIONS.width + GLOW_PADDING * 2,
      CARD_DIMENSIONS.height + GLOW_PADDING * 2
    )

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
   * Play enter animation
   */
  private playEnterAnimation(): void {
    this.setAlpha(0)
    this.y += 40

    this.enterTween = this.cardScene.tweens.add({
      targets: this,
      alpha: 1,
      y: this.y - 40,
      duration: 300,
      ease: 'Power2',
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
      scale: 0.95,
      duration: 300,
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
        this.pnlText.setShadow(0, 0, '#00f3ff', 6, true, true)
        break
      case 'profit':
        color = '#4ade80'
        this.pnlText.setShadow(0, 0, '#4ade80', 6, true, true)
        break
      case 'loss':
        color = '#f87171'
        this.pnlText.setShadow(0, 0, '#f87171', 6, true, true)
        break
      case 'closing':
        color = '#00f3ff'
        this.pnlText.setShadow(0, 0, '#00f3ff', 6, true, true)
        break
      case 'liquidated':
        color = '#f87171'
        this.pnlText.setShadow(0, 0, '#f87171', 6, true, true)
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
