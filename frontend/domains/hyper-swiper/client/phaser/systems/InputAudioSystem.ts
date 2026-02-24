import { Scene } from 'phaser'
import { BladeRenderer } from './BladeRenderer'
import { AudioManager } from './AudioManager'

export class InputAudioSystem {
  private scene: Scene
  private audio!: AudioManager
  private bladeRenderer!: BladeRenderer
  private visibilityChangeHandler?: () => void
  private windowBlurHandler?: () => void

  constructor(scene: Scene) {
    this.scene = scene
  }

  preload(): void {
    this.audio = new AudioManager(this.scene)
    this.audio.preload()
  }

  create(eventEmitter: Phaser.Events.EventEmitter, isMobile: boolean): void {
    this.bladeRenderer = new BladeRenderer(this.scene, isMobile)
    this.audio.create()

    // Notify audio manager that scene is ready
    this.audio.setSceneReady(true)

    eventEmitter.on('sound_muted', (muted: boolean) => {
      this.audio.setMuted(muted)
    })

    this.scene.sound.on('unlocked', () => {
      console.log('[Phaser] Audio unlocked successfully')
      this.audio.setUnlocked(true)
    })

    eventEmitter.on('unlock_audio', () => {
      this.audio.forceUnlock()
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.bladeRenderer.updateBladePath(pointer.x, pointer.y)

      const speed = pointer.velocity.length()
      const MIN_SPEED = 15
      if (speed < MIN_SPEED) return

      this.audio.playSwipe()
    })

    this.scene.input.on('pointerup', () => this.bladeRenderer.clearBladePath())
    this.scene.input.on('pointerout', () => this.bladeRenderer.clearBladePath())

    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        this.bladeRenderer.clearBladePath()
      }
    }
    this.windowBlurHandler = () => {
      this.bladeRenderer.clearBladePath()
    }

    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
    window.addEventListener('blur', this.windowBlurHandler)
  }

  update(): void {
    this.bladeRenderer.draw()
  }

  shutdown(): void {
    this.bladeRenderer?.destroy()
    this.audio?.destroy()

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
      this.visibilityChangeHandler = undefined
    }
    if (this.windowBlurHandler) {
      window.removeEventListener('blur', this.windowBlurHandler)
      this.windowBlurHandler = undefined
    }

    this.scene.input.off('pointermove')
    this.scene.input.off('pointerup')
    this.scene.input.off('pointerout')
  }

  getBladeRenderer(): BladeRenderer {
    return this.bladeRenderer
  }

  getAudio(): AudioManager {
    return this.audio
  }
}
