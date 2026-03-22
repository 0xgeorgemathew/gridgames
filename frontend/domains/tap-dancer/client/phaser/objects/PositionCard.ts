import { Scene, GameObjects, Tweens } from 'phaser'
import {
  CARD_COLORS,
  getCardDimensions,
  getCompactCardDimensions,
  type CardVisualState,
} from '../systems/PositionCardRenderer'
import type { Position } from '@/domains/tap-dancer/shared/trading.types'

interface PositionCardConfig {
  position: Position
  x: number
  y: number
  onClose: (positionId: string) => void
}

type PositionCardLayoutMode = 'expanded' | 'compact'

interface CloseUiState {
  canClose: boolean
  statusLabel: string
  ctaLabel: string
  visualState: CardVisualState
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatCurrency(value: number): string {
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

  private expandedBackground!: GameObjects.Image | GameObjects.Graphics
  private compactBackground!: GameObjects.Image | GameObjects.Graphics
  private directionIcon!: GameObjects.Image
  private entryPriceText!: GameObjects.Text
  private directionBadge!: GameObjects.Text
  private statusText!: GameObjects.Text
  private closeButton!: GameObjects.Image
  private closeZone!: GameObjects.Zone

  private currentVisualState: CardVisualState = 'near_zero'
  private currentLayoutMode: PositionCardLayoutMode = 'expanded'
  private latestCloseUiState: CloseUiState = {
    canClose: false,
    statusLabel: 'Waiting for move',
    ctaLabel: 'LOCKED',
    visualState: 'near_zero',
  }

  private isClosing = false
  private enterTween?: Tweens.Tween
  private pulseTween?: Tweens.Tween
  private closeCueTween?: Tweens.Tween
  private compactTimer?: Phaser.Time.TimerEvent
  private targetY: number
  private expandedX: number
  private compactX: number
  private expandedCardWidth = 0
  private isCloseButtonClosable?: boolean

  private readonly layoutPositions: {
    expandedIconX: number
    expandedDirectionX: number
    expandedEntryX: number
    compactDirectionX: number
    compactStatusX: number
    compactButtonX: number
    closeZoneWidth: number
    closeZoneHeight: number
  }

  private updateExpandedLayout(): void {
    const expandedDims = getCardDimensions()
    const maxExpandedWidth = Math.max(180, (this.cardScene.cameras.main?.width ?? 390) - 32)
    const contentWidth =
      expandedDims.padding * 2 +
      expandedDims.iconSize +
      expandedDims.gap +
      this.directionBadge.width +
      expandedDims.gap +
      this.entryPriceText.width

    this.expandedCardWidth = Math.min(Math.max(contentWidth, 180), maxExpandedWidth)

    const contentLeft = -this.expandedCardWidth / 2 + expandedDims.padding
    this.layoutPositions.expandedIconX = contentLeft + expandedDims.iconSize / 2
    this.layoutPositions.expandedDirectionX =
      this.layoutPositions.expandedIconX +
      expandedDims.iconSize / 2 +
      expandedDims.gap +
      this.directionBadge.width / 2
    this.layoutPositions.expandedEntryX =
      this.layoutPositions.expandedDirectionX + this.directionBadge.width / 2 + expandedDims.gap

    this.directionIcon.setPosition(this.layoutPositions.expandedIconX, 0)
    this.directionIcon.setDisplaySize(expandedDims.iconSize, expandedDims.iconSize)
    this.directionBadge.setPosition(this.layoutPositions.expandedDirectionX, 0)
    this.entryPriceText.setPosition(this.layoutPositions.expandedEntryX, 0)

    if ('setDisplaySize' in this.expandedBackground) {
      this.expandedBackground.setDisplaySize(
        this.expandedCardWidth + expandedDims.glowPadding * 2,
        expandedDims.height + expandedDims.glowPadding * 2
      )
    }

    this.setSize(
      this.expandedCardWidth + expandedDims.glowPadding * 2,
      expandedDims.height + expandedDims.glowPadding * 2
    )
  }

  private drawFallbackBackground(
    compact: boolean = false
  ): GameObjects.Image | GameObjects.Graphics {
    const dims = compact ? getCompactCardDimensions() : getCardDimensions()
    const { width, height, borderRadius, glowPadding } = dims
    const colors = CARD_COLORS[this.currentVisualState]

    const bg = this.cardScene.add.graphics()
    bg.fillStyle(colors.background, colors.backgroundAlpha)
    bg.fillRoundedRect(
      -width / 2 - glowPadding,
      -height / 2 - glowPadding,
      width + glowPadding * 2,
      height + glowPadding * 2,
      borderRadius
    )
    bg.lineStyle(2, colors.borderColor, colors.borderAlpha)
    bg.strokeRoundedRect(
      -width / 2 - glowPadding,
      -height / 2 - glowPadding,
      width + glowPadding * 2,
      height + glowPadding * 2,
      borderRadius
    )

    return bg
  }

  constructor(scene: Scene, config: PositionCardConfig) {
    super(scene, config.x, config.y)

    this.targetY = config.y
    this.cardScene = scene
    this.positionData = config.position
    this.onClose = config.onClose
    this.expandedX = config.x

    const expandedDims = getCardDimensions()
    const compactDims = getCompactCardDimensions()
    const compactButtonSize = Math.max(20, compactDims.height - compactDims.padding * 2)
    this.compactX =
      (scene.cameras.main?.width ?? 390) - compactDims.width / 2 - compactDims.glowPadding - 8

    const { width, glowPadding, padding, iconSize, gap, badgeFontSize, pnlFontSize } = expandedDims
    const iconX = 0
    const closeZoneWidth = 70
    const closeZoneHeight = Math.max(30, compactDims.iconSize + 8)

    const compactLeft = -compactDims.width / 2
    const compactRight = compactDims.width / 2
    const compactDirectionX = compactLeft + compactDims.padding + compactDims.iconSize / 2
    const compactButtonX = compactRight - compactDims.padding - compactButtonSize / 2
    const compactStatusX = compactDirectionX + compactDims.iconSize / 2 + compactDims.gap

    this.layoutPositions = {
      expandedIconX: 0,
      expandedDirectionX: 0,
      expandedEntryX: 0,
      compactDirectionX,
      compactStatusX,
      compactButtonX,
      closeZoneWidth,
      closeZoneHeight,
    }

    const textureKey = `card_${this.currentVisualState}`
    if (this.cardScene.textures.exists(textureKey)) {
      this.expandedBackground = scene.add.image(0, 0, textureKey)
      this.expandedBackground.setOrigin(0.5, 0.5)
      this.expandedBackground.setDisplaySize(
        width + glowPadding * 2,
        expandedDims.height + glowPadding * 2
      )
      this.add(this.expandedBackground)
    } else {
      this.expandedBackground = this.drawFallbackBackground(false)
      this.add(this.expandedBackground)
      this.sendToBack(this.expandedBackground)
    }

    const compactTextureKey = `card_compact_${this.currentVisualState}`
    if (this.cardScene.textures.exists(compactTextureKey)) {
      this.compactBackground = scene.add.image(0, 0, compactTextureKey)
      this.compactBackground.setOrigin(0.5, 0.5)
      this.compactBackground.setDisplaySize(
        compactDims.width + compactDims.glowPadding * 2,
        compactDims.height + compactDims.glowPadding * 2
      )
      this.compactBackground.setVisible(false)
      this.compactBackground.setAlpha(0)
      this.add(this.compactBackground)
    } else {
      this.compactBackground = this.drawFallbackBackground(true)
      this.compactBackground.setVisible(false)
      this.compactBackground.setAlpha(0)
      this.add(this.compactBackground)
      this.sendToBack(this.compactBackground)
    }

    this.directionIcon = scene.add.image(
      iconX,
      0,
      this.positionData.isUp ? 'indicator_up' : 'indicator_down'
    )
    this.directionIcon.setDisplaySize(iconSize, iconSize)
    this.add(this.directionIcon)

    this.entryPriceText = scene.add.text(
      iconX + iconSize / 2 + gap,
      0,
      `ENTRY $${formatPrice(this.positionData.openPrice)}`,
      {
        fontFamily: 'monospace',
        fontSize: `${expandedDims.entryFontSize}px`,
        fontStyle: 'bold',
        color: '#00f3ff',
      }
    )
    this.entryPriceText.setOrigin(0, 0.5)
    this.entryPriceText.setShadow(0, 0, '#00f3ff', 8, true, true)
    this.add(this.entryPriceText)

    const badgeColor = this.positionData.isUp
      ? { text: '#4ade80', glow: '#4ade80' }
      : { text: '#f87171', glow: '#f87171' }
    this.directionBadge = scene.add.text(0, 0, this.positionData.isUp ? 'UP' : 'DOWN', {
      fontFamily: 'monospace',
      fontSize: `${badgeFontSize}px`,
      fontStyle: 'bold',
      color: badgeColor.text,
    })
    this.directionBadge.setOrigin(0.5, 0.5)
    this.directionBadge.setShadow(0, 0, badgeColor.glow, 6, true, true)
    this.add(this.directionBadge)

    this.updateExpandedLayout()

    this.statusText = scene.add.text(this.layoutPositions.compactStatusX, 0, 'Waiting', {
      fontFamily: 'monospace',
      fontSize: `${compactDims.fontSize}px`,
      fontStyle: 'bold',
      color: '#94a3b8',
    })
    this.statusText.setOrigin(0, 0.5)
    this.statusText.setAlpha(0)
    this.statusText.setVisible(false)
    this.add(this.statusText)

    const buttonSize = compactButtonSize
    this.closeButton = scene.add.image(this.layoutPositions.compactButtonX, 0, 'locked_icon')
    this.closeButton.setDisplaySize(buttonSize, buttonSize)
    this.closeButton.setOrigin(0.5, 0.5)
    this.closeButton.setAlpha(0)
    this.closeButton.setVisible(false)
    this.add(this.closeButton)

    this.closeZone = scene.add.zone(this.layoutPositions.compactButtonX, 0, buttonSize, buttonSize)
    this.closeZone.on('pointerdown', this.handleCloseTap, this)
    this.closeZone.on('pointerover', this.handlePointerOver, this)
    this.closeZone.on('pointerout', this.handlePointerOut, this)
    this.closeZone.disableInteractive()
    this.add(this.closeZone)

    this.setDepth(20)
    this.playEnterAnimation()
    this.updateCloseAvailability(this.positionData.openPrice)
  }

  private handlePointerOver(): void {
    if (!this.latestCloseUiState.canClose || this.isClosing) return
    this.stopCloseButtonCue()
    this.closeButton.setAlpha(1)
    this.closeButton.setTint(0xa7f3d0)
  }

  private handlePointerOut(): void {
    this.closeButton.clearTint()
    if (this.latestCloseUiState.canClose) {
      this.startCloseButtonCue()
    }
  }

  private handleCloseTap(): void {
    if (this.isClosing || !this.latestCloseUiState.canClose) return
    this.onClose(this.positionData.id)
  }

  private getCloseUiState(currentPrice: number): CloseUiState {
    const isPredictionCorrect = this.positionData.isUp
      ? currentPrice > this.positionData.openPrice
      : currentPrice < this.positionData.openPrice
    if (isPredictionCorrect) {
      return {
        canClose: true,
        statusLabel: 'Can close',
        ctaLabel: 'CLOSE',
        visualState: 'profit',
      }
    }
    const isAtEntry = currentPrice === this.positionData.openPrice
    return {
      canClose: false,
      statusLabel: isAtEntry ? 'Waiting' : this.positionData.isUp ? 'Need up' : 'Need down',
      ctaLabel: 'LOCKED',
      visualState: isAtEntry ? 'near_zero' : 'loss',
    }
  }

  private setVisualState(nextVisualState: CardVisualState): void {
    if (this.currentVisualState === nextVisualState) return
    this.currentVisualState = nextVisualState

    if ('setTexture' in this.expandedBackground) {
      this.expandedBackground.setTexture(`card_${nextVisualState}`)
    } else {
      this.remove(this.expandedBackground, true)
      this.expandedBackground = this.drawFallbackBackground(false)
      this.add(this.expandedBackground)
      this.sendToBack(this.expandedBackground)
    }

    if ('setTexture' in this.compactBackground) {
      this.compactBackground.setTexture(`card_compact_${nextVisualState}`)
    } else {
      this.remove(this.compactBackground, true)
      this.compactBackground = this.drawFallbackBackground(true)
      this.compactBackground.setVisible(this.currentLayoutMode === 'compact')
      this.compactBackground.setAlpha(this.currentLayoutMode === 'compact' ? 1 : 0)
      this.add(this.compactBackground)
      this.sendToBack(this.compactBackground)
    }
  }

  private applyCloseButtonState(canClose: boolean): void {
    const compactDims = getCompactCardDimensions()
    const buttonSize = Math.max(20, compactDims.height - compactDims.padding * 2)
    const nextTexture = canClose ? 'close_icon' : 'locked_icon'

    if (this.closeButton.texture.key !== nextTexture) {
      this.closeButton.setTexture(nextTexture)
    }

    if (
      this.closeButton.displayWidth !== buttonSize ||
      this.closeButton.displayHeight !== buttonSize
    ) {
      this.closeButton.setDisplaySize(buttonSize, buttonSize)
      this.closeZone.setSize(buttonSize, buttonSize)
    }

    if (this.isCloseButtonClosable === canClose) {
      if (canClose && !this.closeZone.input?.enabled) {
        this.closeZone.setInteractive({ useHandCursor: true })
      }
      if (!canClose && this.closeZone.input?.enabled) {
        this.closeZone.disableInteractive()
      }
      if (canClose && this.currentLayoutMode === 'compact') {
        this.startCloseButtonCue()
      } else {
        this.stopCloseButtonCue()
      }
      return
    }

    this.isCloseButtonClosable = canClose
    this.closeButton.clearTint()

    if (canClose) {
      this.closeZone.setInteractive({ useHandCursor: true })
      if (this.currentLayoutMode === 'compact') {
        this.startCloseButtonCue()
      }
      return
    }
    this.stopCloseButtonCue()
    this.closeZone.disableInteractive()
  }

  private startCloseButtonCue(): void {
    if (this.isClosing || this.currentLayoutMode !== 'compact' || !this.closeButton.visible) return
    if (this.closeCueTween) return

    this.closeButton.setAlpha(1)
    this.closeCueTween = this.cardScene.tweens.add({
      targets: this.closeButton,
      alpha: 0.72,
      duration: 700,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  }

  private stopCloseButtonCue(): void {
    this.closeCueTween?.destroy()
    this.closeCueTween = undefined
    this.closeButton.setAlpha(this.closeButton.visible ? 1 : this.closeButton.alpha)
  }

  private applyCompactContent(): void {
    this.statusText.setText(this.latestCloseUiState.statusLabel)
    this.statusText.setColor(this.latestCloseUiState.canClose ? '#4ade80' : '#94a3b8')
    this.statusText.setShadow(
      0,
      0,
      this.latestCloseUiState.canClose ? '#4ade80' : '#64748b',
      6,
      true,
      true
    )
    this.applyCloseButtonState(this.latestCloseUiState.canClose)
  }

  private setLayoutMode(mode: PositionCardLayoutMode): void {
    if (this.currentLayoutMode === mode || this.isClosing) return
    this.currentLayoutMode = mode

    if (mode === 'expanded') {
      this.stopCloseButtonCue()
      this.entryPriceText.setVisible(true)
      this.statusText.setVisible(false)
      this.closeButton.setVisible(false)
      this.closeZone.disableInteractive()

      this.cardScene.tweens.add({
        targets: this,
        x: this.expandedX,
        duration: 300,
        ease: 'Sine.out',
      })

      this.cardScene.tweens.add({
        targets: this.compactBackground,
        alpha: 0,
        duration: 150,
        ease: 'Sine.out',
        onComplete: () => {
          this.compactBackground.setVisible(false)
        },
      })

      this.directionBadge.setVisible(true)
      this.cardScene.tweens.add({
        targets: this.directionBadge,
        alpha: 1,
        x: this.layoutPositions.expandedDirectionX,
        duration: 180,
        ease: 'Sine.out',
      })

      this.cardScene.tweens.add({
        targets: this.directionIcon,
        x: this.layoutPositions.expandedIconX,
        duration: 180,
        ease: 'Sine.out',
      })
      return
    }

    this.applyCompactContent()
    this.statusText.setVisible(false)
    this.closeButton.setVisible(true)
    this.stopCloseButtonCue()

    this.cardScene.tweens.add({
      targets: this,
      x: this.compactX,
      duration: 300,
      ease: 'Sine.out',
    })

    this.compactBackground.setVisible(true)
    this.cardScene.tweens.add({
      targets: this.compactBackground,
      alpha: 1,
      duration: 150,
      ease: 'Sine.out',
    })

    this.cardScene.tweens.add({
      targets: this.expandedBackground,
      alpha: 0,
      duration: 150,
      ease: 'Sine.out',
      onComplete: () => {
        this.expandedBackground.setVisible(false)
        this.expandedBackground.setAlpha(1)
      },
    })

    this.cardScene.tweens.add({
      targets: [this.entryPriceText],
      alpha: 0,
      duration: 140,
      ease: 'Sine.out',
      onComplete: () => {
        this.entryPriceText.setVisible(false)
      },
    })

    this.cardScene.tweens.add({
      targets: this.directionBadge,
      alpha: 0,
      duration: 140,
      ease: 'Sine.out',
      onComplete: () => {
        this.directionBadge.setVisible(false)
      },
    })

    this.cardScene.tweens.add({
      targets: this.directionIcon,
      x: this.layoutPositions.compactDirectionX,
      duration: 180,
      ease: 'Sine.out',
    })

    this.closeButton.setAlpha(0)
    this.cardScene.tweens.add({
      targets: this.closeButton,
      alpha: 1,
      duration: 180,
      ease: 'Sine.out',
      onComplete: () => {
        if (this.latestCloseUiState.canClose) {
          this.startCloseButtonCue()
        }
      },
    })
  }

  private scheduleCompactTransition(): void {
    this.compactTimer?.remove(false)
    this.compactTimer = this.cardScene.time.delayedCall(3000, () => {
      this.setLayoutMode('compact')
    })
  }

  setTargetY(y: number): void {
    if (this.targetY === y) return
    this.targetY = y
    this.cardScene.tweens.add({
      targets: this,
      y,
      duration: 300,
      ease: 'Back.out(1.2)',
    })
  }

  handleResize(expandedX: number): void {
    this.updateExpandedLayout()

    const compactDims = getCompactCardDimensions()
    const buttonSize = Math.max(20, compactDims.height - compactDims.padding * 2)
    const compactLeft = -compactDims.width / 2
    const compactRight = compactDims.width / 2

    this.expandedX = expandedX
    this.compactX =
      (this.cardScene.cameras.main?.width ?? 390) -
      compactDims.width / 2 -
      compactDims.glowPadding -
      8

    this.layoutPositions.compactDirectionX =
      compactLeft + compactDims.padding + compactDims.iconSize / 2
    this.layoutPositions.compactStatusX =
      this.layoutPositions.compactDirectionX + compactDims.iconSize / 2 + compactDims.gap
    this.layoutPositions.compactButtonX = compactRight - compactDims.padding - buttonSize / 2

    this.statusText.setPosition(this.layoutPositions.compactStatusX, 0)
    this.closeButton.setPosition(this.layoutPositions.compactButtonX, 0)
    this.closeButton.setDisplaySize(buttonSize, buttonSize)
    this.closeZone.setPosition(this.layoutPositions.compactButtonX, 0)
    this.closeZone.setSize(buttonSize, buttonSize)

    const nextX =
      this.currentLayoutMode === 'compact' || this.isClosing ? this.compactX : this.expandedX
    this.x = nextX
    this.directionIcon.x =
      this.currentLayoutMode === 'compact' || this.isClosing
        ? this.layoutPositions.compactDirectionX
        : this.layoutPositions.expandedIconX
    this.directionBadge.x = this.layoutPositions.expandedDirectionX
    this.entryPriceText.x = this.layoutPositions.expandedEntryX
  }

  private playEnterAnimation(): void {
    this.setAlpha(0)
    this.y += 40
    this.scaleX = 0.8
    this.scaleY = 0.8
    this.enterTween = this.cardScene.tweens.add({
      targets: this,
      alpha: 1,
      y: this.y - 40,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.out(1.0)',
      onComplete: () => {
        if (!this.isClosing) {
          this.scheduleCompactTransition()
        }
      },
    })
  }

  playExitAnimation(onComplete: () => void): void {
    this.enterTween?.destroy()
    this.compactTimer?.remove(false)
    this.cardScene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 20,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 250,
      ease: 'Power2',
      onComplete,
    })
  }

  updateCloseAvailability(currentPrice: number): void {
    if (this.isClosing) return
    this.latestCloseUiState = this.getCloseUiState(currentPrice)
    this.setVisualState(this.latestCloseUiState.visualState)
    if (this.currentLayoutMode === 'compact') {
      this.applyCompactContent()
    }
  }

  setClosing(reason: 'manual' | 'liquidated', amountTransferred?: number): void {
    this.isClosing = true
    this.compactTimer?.remove(false)
    this.stopCloseButtonCue()
    this.closeZone.disableInteractive()
    this.entryPriceText.setVisible(false)
    this.directionBadge.setVisible(false)
    this.closeButton.setVisible(false)

    const isLiquidated = reason === 'liquidated'
    this.setVisualState(isLiquidated ? 'liquidated' : 'closing')

    if (isLiquidated) {
      this.statusText.setVisible(true)
      this.statusText.setText('Liquidated')
      this.statusText.setAlpha(1)
      this.statusText.setColor('#f87171')
      this.statusText.setShadow(0, 0, '#f87171', 8, true, true)
    } else {
      this.statusText.setVisible(false)
      this.statusText.setAlpha(0)
    }

    this.cardScene.tweens.add({
      targets: this,
      x: this.compactX,
      duration: 120,
      ease: 'Sine.out',
    })

    this.compactBackground.setVisible(true)
    this.compactBackground.setAlpha(1)
    this.expandedBackground.setVisible(false)

    this.cardScene.tweens.add({
      targets: this.directionIcon,
      x: this.layoutPositions.compactDirectionX,
      duration: 120,
      ease: 'Sine.out',
    })

    this.playPulseAnimation()
  }

  private playPulseAnimation(): void {
    const bgToPulse =
      this.currentLayoutMode === 'compact' ? this.compactBackground : this.expandedBackground
    this.pulseTween?.destroy()
    this.pulseTween = this.cardScene.tweens.add({
      targets: bgToPulse,
      alpha: { from: 1, to: 0.7 },
      duration: 500,
      yoyo: true,
      repeat: 2,
    })
  }

  getPositionId(): string {
    return this.positionData.id
  }

  getPosition(): Position {
    return this.positionData
  }

  getIsClosing(): boolean {
    return this.isClosing
  }

  destroy(): void {
    this.enterTween?.destroy()
    this.pulseTween?.destroy()
    this.closeCueTween?.destroy()
    this.compactTimer?.remove(false)
    super.destroy()
  }
}
