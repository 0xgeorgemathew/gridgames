import { Scene } from 'phaser'

type AudioSpriteSound = Phaser.Sound.BaseSound & {
  play(markerName: string, config?: Phaser.Types.Sound.SoundConfig): boolean
}

// States that require resume attempt
const RESUME_STATES = ['suspended', 'interrupted'] as const

export class AudioManager {
  private scene: Scene
  private gameSfx: AudioSpriteSound | null = null
  private bgm: Phaser.Sound.BaseSound | null = null
  private isMuted = false
  private isLoaded = false
  private currentSwipeSound: Phaser.Sound.BaseSound | null = null
  private swipeDuckTween: Phaser.Tweens.Tween | null = null
  private isUnlocked = false
  private isSwipePlaying = false
  private documentUnlockHandler: (() => void) | null = null
  private visibilityHandler: (() => void) | null = null
  private stateChangeHandler: (() => void) | null = null
  private isMobile = false
  private sceneReady = false

  constructor(scene: Scene) {
    this.scene = scene
    this.isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    this.setupDocumentUnlockListener()
    this.setupVisibilityHandler()
  }

  /** Helper to get the Web Audio API context from Phaser's sound manager */
  private getAudioContext(): AudioContext | undefined {
    return (this.scene.sound as Phaser.Sound.WebAudioSoundManager).context as
      | AudioContext
      | undefined
  }

  preload(): void {
    if (this.isLoaded) return

    // Load audio sprite with MP3 and WAV fallback
    this.scene.load.audioSprite('sfx-game', 'audio/sfx-game.json', [
      'audio/sfx-game.mp3',
      'audio/sfx-game.wav',
    ])

    // Load background music
    this.scene.load.audio('bgm-game', 'audio/digital_dividend.mp3')
  }

  create(): void {
    if (this.isLoaded) return

    try {
      this.gameSfx = this.scene.sound.addAudioSprite('sfx-game')
      this.bgm = this.scene.sound.add('bgm-game', { loop: true, volume: 0.3 })
      this.isLoaded = true
    } catch (error) {
      console.warn('[AudioManager] Failed to create audio sprite:', error)
    }
  }

  playBackgroundMusic(): void {
    if (!this.bgm || this.isMuted) return
    if (!this.checkAudioContextState()) return

    try {
      this.bgm.play()
    } catch (error) {
      console.warn('[AudioManager] Failed to play background music:', error)
    }
  }

  setUnlocked(unlocked: boolean): void {
    this.isUnlocked = unlocked
  }

  private setupDocumentUnlockListener(): void {
    if (typeof document === 'undefined') return

    this.documentUnlockHandler = () => {
      const ctx = this.getAudioContext()
      if (ctx && ctx.state !== 'running') {
        console.log('[AudioManager] Document event: attempting unlock')
        this.attemptUnlock()
      }
    }

    // On mobile, keep trying to unlock until successful
    document.addEventListener('touchstart', this.documentUnlockHandler, { passive: true })
    document.addEventListener('click', this.documentUnlockHandler)
  }

  private setupVisibilityHandler(): void {
    if (typeof document === 'undefined') return

    this.visibilityHandler = () => {
      if (document.hidden) return

      const ctx = this.getAudioContext()
      if (ctx && ctx.state !== 'running') {
        console.log(`[AudioManager] Visibility change: state=${ctx.state}`)
        this.isUnlocked = false
        this.attemptUnlock()
      }
    }

    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  private setupStateChangeListener(): void {
    const ctx = this.getAudioContext()
    if (!ctx) return

    this.stateChangeHandler = () => {
      console.log(`[AudioManager] State changed: ${ctx.state}`)
      if (RESUME_STATES.includes(ctx.state as (typeof RESUME_STATES)[number])) {
        this.isUnlocked = false
      }
    }

    ctx.onstatechange = this.stateChangeHandler
  }

  setSceneReady(ready: boolean): void {
    this.sceneReady = ready
    if (ready) {
      console.log('[AudioManager] Scene ready, setting up audio')
      this.setupStateChangeListener()
      this.attemptUnlock()
      this.playBackgroundMusic()
    }
  }

  /**
   * Attempt to unlock audio context on mobile devices.
   * Uses multiple strategies to ensure audio works on both iOS and Android.
   */
  attemptUnlock(): void {
    if (this.isUnlocked) return

    const ctx = this.getAudioContext()
    if (!ctx) {
      this.scene.sound.unlock()
      return
    }

    // Handle states that require resume
    if (RESUME_STATES.includes(ctx.state as (typeof RESUME_STATES)[number])) {
      const stateLabel = ctx.state
      console.log(`[AudioManager] AudioContext ${stateLabel}, attempting resume`)

      ctx
        .resume()
        .then(() => {
          const success = this.playSilentBuffer(ctx)
          if (success) {
            this.isUnlocked = true
          }
          console.log('[AudioManager] AudioContext resumed successfully')
        })
        .catch((err) => {
          console.warn('[AudioManager] Failed to resume AudioContext:', err)
          this.isUnlocked = false
        })
    } else if (ctx.state === 'running') {
      // Context already running, but may need silent buffer on Android
      const success = this.playSilentBuffer(ctx)
      if (success) {
        this.isUnlocked = true
      }
    } else if (ctx.state === 'closed') {
      console.error('[AudioManager] AudioContext closed - cannot recover')
    }

    // Also call Phaser's unlock method
    this.scene.sound.unlock()
  }

  /**
   * Play a silent buffer to fully unlock audio on Android.
   * This is crucial for Android Chrome which often requires
   * actual audio playback to complete the unlock process.
   */
  private playSilentBuffer(ctx: AudioContext): boolean {
    try {
      // Use device's actual sample rate (was hardcoded 22050)
      const sampleRate = ctx.sampleRate
      // Create 0.5 second buffer (was 1 sample = ~0.00005s)
      const frameCount = Math.ceil(sampleRate * 0.5)

      const buffer = ctx.createBuffer(1, frameCount, sampleRate)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)

      source.onended = () => {
        source.disconnect()
      }

      console.log(`[AudioManager] Silent buffer: ${frameCount} frames at ${sampleRate}Hz`)
      return true
    } catch (e) {
      console.error('[AudioManager] Silent buffer failed:', e)
      return false
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
    const ctx = this.getAudioContext()
    if (ctx?.state === 'suspended') {
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
    if (muted && this.bgm) {
      this.bgm.stop()
    }
  }

  isAudioLoaded(): boolean {
    return this.isLoaded
  }

  destroy(): void {
    this.swipeDuckTween?.stop()
    this.swipeDuckTween = null
    this.currentSwipeSound = null
    this.bgm?.destroy()
    this.bgm = null
    this.gameSfx?.destroy()
    this.gameSfx = null
    this.isLoaded = false
    this.isUnlocked = false

    // Remove document event listeners
    if (this.documentUnlockHandler) {
      document.removeEventListener('touchstart', this.documentUnlockHandler)
      document.removeEventListener('click', this.documentUnlockHandler)
      this.documentUnlockHandler = null
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }

    // Clear AudioContext state listener
    const ctx = this.getAudioContext()
    if (ctx) {
      ctx.onstatechange = null
    }
    this.stateChangeHandler = null
  }
}
