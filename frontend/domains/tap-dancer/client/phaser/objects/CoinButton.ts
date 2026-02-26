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
  size?: number // Visual size of the button core (excludes glow) - defaults to 88
}

const BASE_BUTTON_SIZE = 88
const BASE_TEXTURE_DISPLAY_SIZE = getButtonDisplaySize()

export class CoinButton extends GameObjects.Container {
  private buttonScene: Scene
  private direction: ButtonType
  private onToggle: (direction: ButtonType) => void
  private size: number // Core button size (excludes glow)

  private buttonImage: GameObjects.Image
  private ripple?: GameObjects.Graphics
  private pressTween?: Tweens.Tween
  private beatTween?: Tweens.Tween
  private rippleTween?: Tweens.Tween

  private isPressed: boolean = false
  private isDisabled: boolean = false
  private currentGlowState: ButtonGlowState = 'light'

  constructor(scene: Scene, config: CoinButtonConfig) {
    super(scene, config.x, config.y)

    this.buttonScene = scene
    this.direction = config.direction
    this.onToggle = config.onToggle
    this.size = config.size ?? 88

    // Scale display size based on actual button size vs base size
    const scale = this.size / BASE_BUTTON_SIZE
    const displaySize = BASE_TEXTURE_DISPLAY_SIZE * scale

    this.buttonImage = scene.add.image(0, 0, `button_${this.direction}_light`)
    this.buttonImage.setDisplaySize(displaySize, displaySize)
    this.buttonImage.setInteractive({ useHandCursor: true })
    this.add(this.buttonImage)

    // Set up pointer events
    this.buttonImage.on('pointerdown', this.handlePointerDown, this)
    this.buttonImage.on('pointerup', this.handlePointerUp, this)
    this.buttonImage.on('pointerout', this.handlePointerOut, this)

    // Set depth for layering
    this.setDepth(10)
  }

  /**
   * Handle pointer down - show pressed state and trigger ripple
   */
  private handlePointerDown(): void {
    if (this.isDisabled) return

    this.isPressed = true
    this.updateTexture()
    this.playPressAnimation()
    this.playRippleEffect()
  }

  /**
   * Handle pointer up - trigger callback
   */
  private handlePointerUp(): void {
    if (this.isDisabled) return

    if (this.isPressed) {
      this.onToggle(this.direction)
    }
    this.isPressed = false
    this.updateTexture()
  }

  /**
   * Handle pointer out - reset state
   */
  private handlePointerOut(): void {
    if (this.isDisabled) return

    this.isPressed = false
    this.updateTexture()
  }

  /**
   * Update button texture based on current state
   */
  private updateTexture(): void {
    if (!this.buttonImage) return

    let state: ButtonGlowState = 'light'

    if (this.isDisabled) {
      state = 'disabled'
    } else if (this.isPressed) {
      state = 'brightest'
    } else if (this.currentGlowState === 'medium') {
      state = 'medium'
    }

    this.buttonImage.setTexture(`button_${this.direction}_${state}`)
  }

  /**
   * Play press animation - scale down and back up
   */
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

  /**
   * Play ripple effect on tap
   */
  private playRippleEffect(): void {
    // Clean up existing ripple
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

    // Animate ripple expansion
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

  /**
   * Play beat pulse animation (called from ButtonSystem when beat is active)
   */
  playBeatPulse(): void {
    if (this.isDisabled || this.isPressed || !this.buttonImage) return

    // Set medium glow state
    this.currentGlowState = 'medium'
    this.updateTexture()

    // Scale pulse
    if (this.beatTween) {
      this.beatTween.destroy()
    }

    this.beatTween = this.buttonScene.tweens.add({
      targets: this,
      scale: 1.02,
      duration: 100,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.currentGlowState = 'light'
        this.updateTexture()
      },
    })
  }

  /**
   * Set disabled state
   */
  setDisabled(disabled: boolean): void {
    if (!this.buttonImage) return

    this.isDisabled = disabled
    this.buttonImage.setInteractive({ useHandCursor: !disabled })
    this.updateTexture()
  }

  /**
   * Get current disabled state
   */
  getDisabled(): boolean {
    return this.isDisabled
  }

  /**
   * Get button direction
   */
  getDirection(): ButtonType {
    return this.direction
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.pressTween) {
      this.pressTween.destroy()
      this.pressTween = undefined
    }
    if (this.beatTween) {
      this.beatTween.destroy()
      this.beatTween = undefined
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
