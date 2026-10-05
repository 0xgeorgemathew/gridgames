import { Scene, GameObjects, Tweens } from 'phaser'
import {
  BUTTON_CONFIG,
  getButtonDisplaySize,
  type ButtonType,
  type ButtonGlowState,
} from '../systems/ButtonRenderer'

interface CoinButtonConfig {
  direction: ButtonType
  x: number
  y: number
  onToggle: (direction: ButtonType) => void
  size?: number
}

const BASE_BUTTON_SIZE = 88
const BASE_TEXTURE_DISPLAY_SIZE = getButtonDisplaySize()

export class CoinButton extends GameObjects.Container {
  private buttonScene: Scene
  private direction: ButtonType
  private onToggle: (direction: ButtonType) => void
  private size: number

  private buttonImage: GameObjects.Image
  private ripple?: GameObjects.Graphics
  private pressTween?: Tweens.Tween
  private rippleTween?: Tweens.Tween

  private isPressed: boolean = false
  private isDisabled: boolean = false

  constructor(scene: Scene, config: CoinButtonConfig) {
    super(scene, config.x, config.y)

    this.buttonScene = scene
    this.direction = config.direction
    this.onToggle = config.onToggle
    this.size = config.size ?? 88

    const scale = this.size / BASE_BUTTON_SIZE
    const displaySize = BASE_TEXTURE_DISPLAY_SIZE * scale

    this.buttonImage = scene.add.image(0, 0, `button_${this.direction}_light`)
    this.buttonImage.setDisplaySize(displaySize, displaySize)
    this.buttonImage.setInteractive({ useHandCursor: true })
    this.add(this.buttonImage)

    this.buttonImage.on('pointerdown', this.handlePointerDown, this)
    this.buttonImage.on('pointerup', this.handlePointerUp, this)
    this.buttonImage.on('pointerout', this.handlePointerOut, this)

    this.setDepth(10)
  }

  private handlePointerDown(): void {
    if (this.isDisabled) return

    this.isPressed = true
    this.updateTexture()
    this.playPressAnimation()
    this.playRippleEffect()
  }

  private handlePointerUp(): void {
    if (this.isDisabled) return

    if (this.isPressed) {
      this.onToggle(this.direction)
    }
    this.isPressed = false
    this.updateTexture()
  }

  private handlePointerOut(): void {
    if (this.isDisabled) return

    this.isPressed = false
    this.updateTexture()
  }

  private updateTexture(): void {
    if (!this.buttonImage) return

    let state: ButtonGlowState = 'light'

    if (this.isDisabled) {
      state = 'disabled'
    } else if (this.isPressed) {
      state = 'brightest'
    }

    this.buttonImage.setTexture(`button_${this.direction}_${state}`)
  }

  private playPressAnimation(): void {
    if (this.pressTween) {
      this.pressTween.destroy()
    }

    this.pressTween = this.buttonScene.tweens.add({
      targets: this,
      scale: 0.88,
      duration: 50,
      ease: 'Power2',
      yoyo: true,
    })
  }

  private playRippleEffect(): void {
    if (this.ripple) {
      this.ripple.destroy()
    }
    if (this.rippleTween) {
      this.rippleTween.destroy()
    }

    const config = BUTTON_CONFIG[this.direction]
    this.ripple = this.buttonScene.add.graphics()
    this.ripple.lineStyle(3, config.color, 0.9)
    this.ripple.strokeCircle(0, 0, this.size * 0.35)
    this.ripple.setAlpha(0.9)
    this.add(this.ripple)

    this.rippleTween = this.buttonScene.tweens.add({
      targets: this.ripple,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.ripple?.destroy()
        this.ripple = undefined
      },
    })
  }

  setDisabled(disabled: boolean): void {
    if (!this.buttonImage) return

    this.isDisabled = disabled
    this.buttonImage.setInteractive({ useHandCursor: !disabled })
    this.updateTexture()
  }

  getDisabled(): boolean {
    return this.isDisabled
  }

  getDirection(): ButtonType {
    return this.direction
  }

  destroy(): void {
    if (this.pressTween) {
      this.pressTween.destroy()
      this.pressTween = undefined
    }
    if (this.rippleTween) {
      this.rippleTween.destroy()
      this.rippleTween = undefined
    }
    if (this.ripple) {
      this.ripple.destroy()
      this.ripple = undefined
    }

    this.buttonImage = null as any
    super.destroy()
  }
}
