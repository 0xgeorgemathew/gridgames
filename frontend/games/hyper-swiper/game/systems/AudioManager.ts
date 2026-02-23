import { Scene } from 'phaser'

type AudioSpriteSound = Phaser.Sound.BaseSound & {
  play(markerName: string, config?: Phaser.Types.Sound.SoundConfig): boolean
}

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
  private isMobile: boolean = false

  constructor(scene: Scene) {
    this.scene = scene
    this.isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
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

  setUnlocked(unlocked: boolean): void {
    this.isUnlocked = unlocked
  }

  private setupDocumentUnlockListener(): void {
    if (typeof document === 'undefined') return

    this.documentUnlockHandler = () => {
      if (this.isUnlocked) return
      this.attemptUnlock()
    }

    // On mobile, keep trying to unlock until successful
    // Remove { once: true } to allow multiple attempts
    document.addEventListener('touchstart', this.documentUnlockHandler, { passive: true })
    document.addEventListener('click', this.documentUnlockHandler)
  }

  /**
   * Attempt to unlock audio context on mobile devices.
   * Uses multiple strategies to ensure audio works on both iOS and Android.
   */
  attemptUnlock(): void {
    if (this.isUnlocked) return

    const audioContext = (this.scene.sound as any).context as AudioContext | undefined
    if (!audioContext) {
      this.scene.sound.unlock()
      return
    }

    if (audioContext.state === 'suspended') {
      // Resume AudioContext - must be called from user gesture
      audioContext
        .resume()
        .then(() => {
          this.playSilentBuffer(audioContext)
          this.isUnlocked = true
          console.log('[AudioManager] AudioContext resumed successfully')
        })
        .catch((err) => {
          console.warn('[AudioManager] Failed to resume AudioContext:', err)
        })
    } else if (audioContext.state === 'running') {
      // Context already running, but may need silent buffer on Android
      this.playSilentBuffer(audioContext)
      this.isUnlocked = true
    }

    // Also call Phaser's unlock method
    this.scene.sound.unlock()
  }

  /**
   * Play a silent buffer to fully unlock audio on Android.
   * This is crucial for Android Chrome which often requires
   * actual audio playback to complete the unlock process.
   */
  private playSilentBuffer(context: AudioContext): void {
    try {
      const buffer = context.createBuffer(1, 1, 22050)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      source.start(0)
      source.onended = () => {
        source.disconnect()
      }
    } catch (e) {
      // Silent fail - this is a best-effort unlock
    }
  }

  /**
   * Force unlock attempt - called when user explicitly toggles sound on.
   * This ensures we always try to unlock when user wants sound.
   */
  forceUnlock(): void {
    this.isUnlocked = false
    this.attemptUnlock()
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
