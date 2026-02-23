import { Scene } from 'phaser'

type AudioSpriteSound = Phaser.Sound.BaseSound & {
  play(markerName: string, config?: Phaser.Types.Sound.SoundConfig): boolean
}

const AUDIO_UNLOCKED_KEY = 'hyperSwiper_audioUnlocked'

export class AudioManager {
  private scene: Scene
  private gameSfx: AudioSpriteSound | null = null
  private isMuted: boolean = false
  private isLoaded: boolean = false
  private currentSwipeSound: any = null
  private swipeDuckTween: Phaser.Tweens.Tween | null = null
  private isUnlocked: boolean = false
  private isSwipePlaying: boolean = false
  private documentUnlockHandler: (() => void) | null = null

  constructor(scene: Scene) {
    this.scene = scene
    this.setupDocumentUnlockListener()
  }

  preload(): void {
    if (this.isLoaded) return

    // Load audio sprite with MP3 and WAV fallback
    this.scene.load.audioSprite('sfx-game', 'audio/sfx-game.json', [
      'audio/sfx-game.mp3',
      'audio/sfx-game.wav',
    ])
  }

  create(): void {
    if (this.isLoaded) return

    try {
      this.gameSfx = this.scene.sound.addAudioSprite('sfx-game')
      this.isLoaded = true
    } catch (error) {
      console.warn('[AudioManager] Failed to create audio sprite:', error)
    }
  }

  /**
   * Set unlocked state from Phaser's built-in unlock mechanism.
   * Phaser handles the user gesture chain correctly for both Android and iOS.
   */
  setUnlocked(unlocked: boolean): void {
    this.isUnlocked = unlocked
    if (unlocked && typeof window !== 'undefined') {
      localStorage.setItem(AUDIO_UNLOCKED_KEY, 'true')
    }
  }

  private setupDocumentUnlockListener(): void {
    if (typeof document === 'undefined') return

    const wasUnlocked = localStorage.getItem(AUDIO_UNLOCKED_KEY) === 'true'
    if (wasUnlocked) {
      this.isUnlocked = true
    }

    this.documentUnlockHandler = () => {
      if (this.isUnlocked) return
      this.attemptUnlock()
    }

    document.addEventListener('touchstart', this.documentUnlockHandler, { once: true })
    document.addEventListener('click', this.documentUnlockHandler, { once: true })
  }

  private attemptUnlock(): void {
    if (this.isUnlocked) return

    const audioContext = (this.scene.sound as any).context as AudioContext | undefined
    if (audioContext?.state === 'suspended') {
      audioContext.resume().then(() => {
        this.setUnlocked(true)
        console.log('[AudioManager] AudioContext resumed via user gesture')
      }).catch((err) => {
        console.warn('[AudioManager] Failed to resume AudioContext:', err)
      })
    }

    this.scene.sound.unlock()
  }

  private checkAudioContextState(): boolean {
    const audioContext = (this.scene.sound as any).context as AudioContext | undefined
    if (audioContext?.state === 'suspended') {
      this.attemptUnlock()
      return false
    }
    return true
  }

  playSwipe(): void {
    if (this.isMuted || !this.isLoaded || !this.gameSfx) return
    if (!this.checkAudioContextState()) return

    // Don't start new swipe if one is already playing
    if (this.isSwipePlaying) return

    try {
      const played = this.gameSfx.play('swipe', { volume: 0.5 })
      if (played) {
        this.isSwipePlaying = true
        // Track the most recent swipe sound for ducking
        this.currentSwipeSound = this.gameSfx

        // Reset state when sound completes
        this.gameSfx.once('complete', () => {
          this.isSwipePlaying = false
          this.currentSwipeSound = null
        })
      }
    } catch (error) {
      console.warn('[AudioManager] Failed to play swipe sound:', error)
      this.isSwipePlaying = false
    }
  }

  playSlice(): void {
    if (this.isMuted || !this.isLoaded || !this.gameSfx) return
    if (!this.checkAudioContextState()) return

    try {
      this.gameSfx.play('slice', { volume: 0.5 })
    } catch (error) {
      console.warn('[AudioManager] Failed to play slice sound:', error)
    }
  }

  playSliceAt(x: number, screenWidth: number): void {
    if (this.isMuted || !this.isLoaded || !this.gameSfx) return
    if (!this.checkAudioContextState()) return

    try {
      // Duck any ongoing swipe sound
      this.duckSwipe()

      // Calculate pan: -1 (left) to +1 (right) based on screen position
      const pan = (x / screenWidth - 0.5) * 2

      this.gameSfx.play('slice', {
        volume: 0.6, // Slightly louder for impact
        pan, // -1 (left) to +1 (right)
      })
    } catch (error) {
      console.warn('[AudioManager] Failed to play positional slice sound:', error)
    }
  }

  private duckSwipe(): void {
    if (!this.currentSwipeSound) return

    // Kill any existing duck tween to prevent conflicts
    this.swipeDuckTween?.stop()

    // Fade down to 30% volume over 50ms, hold, then fade back up
    this.swipeDuckTween = this.scene.tweens.add({
      targets: this.currentSwipeSound,
      volume: 0.15, // 30% of 0.5 = 0.15
      duration: 50,
      yoyo: true,
      hold: 80, // Stay ducked for 80ms
      onComplete: () => {
        this.currentSwipeSound = null
      },
    })
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted
    this.scene.sound.mute = muted
  }

  isAudioLoaded(): boolean {
    return this.isLoaded
  }

  destroy(): void {
    this.swipeDuckTween?.stop()
    this.swipeDuckTween = null
    this.currentSwipeSound = null
    this.gameSfx?.destroy()
    this.gameSfx = null
    this.isLoaded = false

    if (this.documentUnlockHandler) {
      document.removeEventListener('touchstart', this.documentUnlockHandler)
      document.removeEventListener('click', this.documentUnlockHandler)
      this.documentUnlockHandler = null
    }
  }
}
