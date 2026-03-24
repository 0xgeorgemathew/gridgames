import { Scene } from 'phaser'
import { ButtonRenderer, type ButtonType } from './ButtonRenderer'
import { CoinButton } from '../objects/CoinButton'
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'
import { getPositionOpeningCapacity } from '@/domains/match/position-opening'
import { CLIENT_GAME_CONFIG as CFG } from '@/domains/tap-dancer/client/game.config'

interface ButtonSizes {
  buttonSize: number
  gap: number
  bottomOffset: number
}

interface GridRipple {
  x: number
  y: number
  radius: number
  color: number
  startTime: number
  duration: number
}

const RIPPLE_CONFIG = {
  initialRadius: 44,
  maxRadiusFactor: 2.5,
  duration: 2666,
  ringCount: 2,
  ringDelay: 1333,
  lineWidth: 2,
  initialAlpha: 0.25,
} as const

const BUTTON_SIZES_BY_HEIGHT: Record<number, ButtonSizes> = {
  667: { buttonSize: 72, gap: 40, bottomOffset: 80 },
  736: { buttonSize: 76, gap: 42, bottomOffset: 84 },
  780: { buttonSize: 80, gap: 44, bottomOffset: 88 },
  844: { buttonSize: 88, gap: 48, bottomOffset: 96 },
  852: { buttonSize: 88, gap: 48, bottomOffset: 96 },
  896: { buttonSize: 84, gap: 46, bottomOffset: 92 },
  926: { buttonSize: 92, gap: 50, bottomOffset: 100 },
  932: { buttonSize: 96, gap: 52, bottomOffset: 104 },
}

const BASE_SIZES: ButtonSizes = { buttonSize: 88, gap: 48, bottomOffset: 96 }

function getButtonSizes(): ButtonSizes {
  if (typeof window === 'undefined') return BASE_SIZES
  const height = window.screen.height
  if (height < 667 || height > 932) return BASE_SIZES
  return BUTTON_SIZES_BY_HEIGHT[height] ?? BASE_SIZES
}

/**
 * ButtonSystem - Orchestration layer for trading buttons
 */
export class ButtonSystem {
  private scene: Scene
  private eventEmitter?: Phaser.Events.EventEmitter

  private upButton?: CoinButton
  private downButton?: CoinButton

  private unsubscribeStore?: () => void
  private isShutdown = false

  private lastCanOpen = true

  private gridRipples: GridRipple[] = []
  private rippleGraphics?: Phaser.GameObjects.Graphics

  constructor(scene: Scene) {
    this.scene = scene
  }

  create(eventEmitter: Phaser.Events.EventEmitter): void {
    this.eventEmitter = eventEmitter

    const renderer = new ButtonRenderer(this.scene)
    renderer.generateCachedTextures()

    this.rippleGraphics = this.scene.add.graphics()
    this.rippleGraphics.setDepth(5)

    const { buttonSize, gap, bottomOffset } = getButtonSizes()

    const camera = this.scene.cameras.main
    const centerX = camera.width / 2
    const bottomY = camera.height - bottomOffset - buttonSize / 2

    this.upButton = new CoinButton(this.scene, {
      direction: 'long',
      x: centerX - gap - buttonSize / 2,
      y: bottomY,
      onToggle: (direction) => this.handleButtonTap(direction),
      size: buttonSize,
    })
    this.scene.add.existing(this.upButton as Phaser.GameObjects.Container)

    this.downButton = new CoinButton(this.scene, {
      direction: 'short',
      x: centerX + gap + buttonSize / 2,
      y: bottomY,
      onToggle: (direction) => this.handleButtonTap(direction),
      size: buttonSize,
    })
    this.scene.add.existing(this.downButton as Phaser.GameObjects.Container)

    this.subscribeToStore()
    this.updateButtonStates()
  }

  private subscribeToStore(): void {
    this.unsubscribeStore = useTradingStore.subscribe((state) => {
      if (this.isShutdown) return

      const canOpen = this.getCanOpen(state)
      if (canOpen !== this.lastCanOpen) {
        this.lastCanOpen = canOpen ?? true
        this.upButton?.setDisabled(!canOpen)
        this.downButton?.setDisabled(!canOpen)
      }
    })
  }

  private updateButtonStates(): void {
    const state = useTradingStore.getState()
    const canOpen = this.getCanOpen(state)

    this.lastCanOpen = canOpen ?? true
    this.upButton?.setDisabled(!canOpen)
    this.downButton?.setDisabled(!canOpen)
  }

  private getCanOpen(state: ReturnType<typeof useTradingStore.getState>): boolean {
    const player = state.players.find((entry) => entry.id === state.localPlayerId)
    const opponent = state.players.find((entry) => entry.id !== state.localPlayerId)

    if (!player || !opponent) {
      return false
    }

    const playerOpenPositions = Array.from(state.openPositions.values()).filter(
      (position) => position.playerId === state.localPlayerId && position.status === 'open'
    ).length
    const opponentOpenPositions = Array.from(state.openPositions.values()).filter(
      (position) => position.playerId !== state.localPlayerId && position.status === 'open'
    ).length

    return getPositionOpeningCapacity({
      playerBalance: player.dollars,
      opponentBalance: opponent.dollars,
      playerOpenPositions,
      opponentOpenPositions,
      stakeAmount: CFG.STAKE_AMOUNT,
    }).canOpen
  }

  private handleButtonTap(direction: ButtonType): void {
    if (this.isShutdown) return

    this.triggerGridRipple(direction)
    window.phaserEvents?.emit('button_tap', { direction })
  }

  private triggerGridRipple(direction: ButtonType): void {
    const button = direction === 'long' ? this.upButton : this.downButton
    if (!button) return

    const color = direction === 'long' ? 0x00ffaa : 0xff4466

    for (let i = 0; i < RIPPLE_CONFIG.ringCount; i++) {
      this.gridRipples.push({
        x: button.x,
        y: button.y,
        radius: RIPPLE_CONFIG.initialRadius,
        color,
        startTime: Date.now() + i * RIPPLE_CONFIG.ringDelay,
        duration: RIPPLE_CONFIG.duration,
      })
    }
  }

  update(_delta: number): void {
    this.updateGridRipples()
  }

  private updateGridRipples(): void {
    if (!this.rippleGraphics) return

    this.rippleGraphics.clear()

    const now = Date.now()
    const { buttonSize } = getButtonSizes()
    const maxRadius = buttonSize * RIPPLE_CONFIG.maxRadiusFactor

    for (let i = this.gridRipples.length - 1; i >= 0; i--) {
      const ripple = this.gridRipples[i]
      const elapsed = now - ripple.startTime

      if (elapsed < 0) continue

      if (elapsed >= ripple.duration) {
        this.gridRipples.splice(i, 1)
        continue
      }

      const progress = elapsed / ripple.duration
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentRadius = ripple.radius + (maxRadius - ripple.radius) * easedProgress
      const alpha = RIPPLE_CONFIG.initialAlpha * (1 - progress)

      this.rippleGraphics.lineStyle(RIPPLE_CONFIG.lineWidth, ripple.color, alpha)
      this.rippleGraphics.strokeCircle(ripple.x, ripple.y, currentRadius)
    }
  }

  handleResize(): void {
    if (!this.upButton || !this.downButton) return

    const camera = this.scene.cameras.main
    const { buttonSize, gap, bottomOffset } = getButtonSizes()

    const centerX = camera.width / 2
    const bottomY = camera.height - bottomOffset - buttonSize / 2

    this.upButton.setPosition(centerX - gap - buttonSize / 2, bottomY)
    this.downButton.setPosition(centerX + gap + buttonSize / 2, bottomY)
  }

  shutdown(): void {
    this.isShutdown = true

    this.gridRipples = []
    if (this.rippleGraphics) {
      this.rippleGraphics.destroy()
      this.rippleGraphics = undefined
    }

    if (this.unsubscribeStore) {
      this.unsubscribeStore()
      this.unsubscribeStore = undefined
    }

    if (this.upButton) {
      this.upButton.destroy()
      this.upButton = undefined
    }

    if (this.downButton) {
      this.downButton.destroy()
      this.downButton = undefined
    }
  }
}
