/** Reuses the original game's loop without booting Phaser or owning an animation loop. */
export class StockMusic {
  private active = false
  private muted = false
  private disposed = false

  constructor(
    private audio: Pick<HTMLAudioElement, 'play' | 'pause' | 'volume' | 'loop' | 'muted'>,
    private visible: () => boolean
  ) {
    audio.loop = true
    audio.volume = 0.3
  }

  setActive(active: boolean) {
    this.active = active
    this.sync()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.audio.muted = muted
    this.sync()
  }

  sync() {
    if (this.disposed) return
    if (this.active && !this.muted && this.visible()) {
      this.audio.volume = 0.3
      // A browser may require the next ordinary pointer/keyboard gesture to unlock.
      void this.audio.play().catch(() => {})
    } else this.audio.pause()
  }

  unlock(prime = false) {
    if (this.disposed || this.muted || !this.visible()) return
    if (this.active) this.sync()
    else if (prime) {
      // Prime silently from the matchmaking gesture; never leave music running in a lobby.
      this.audio.volume = 0
      void this.audio
        .play()
        .then(() => this.sync())
        .catch(() => {})
    }
  }

  dispose() {
    this.disposed = true
    this.audio.pause()
  }
}
