import type { ContactKind } from './contact-feedback'
export const CONTACT_SPRITES: Record<string, [number, number]> = {
  pending0: [0, 90],
  pending1: [160, 90],
  pending2: [320, 90],
  credited: [480, 160],
  failed: [720, 140],
  rejected: [940, 90],
}
export interface SoundPort {
  loaded(): boolean
  ready(): boolean
  play(sprite: string): number
  volume(value: number, id: number): void
  stop(id?: number): void
}
/** Howler's pool is an inactive-object recycler, so enforce an actual voice cap.
 * Transients are discarded when loading/locked/hidden, never queued for later. */
export class ContactSound {
  private active = false
  private muted = false
  private disposed = false
  private voices: Array<{ id: number; kind: ContactKind }> = []
  private variation = 0
  private last = { pending: -Infinity, credited: -Infinity, failed: -Infinity, rejected: -Infinity }
  constructor(
    private port: SoundPort,
    private visible: () => boolean
  ) {}
  setActive(active: boolean) {
    this.active = active
    if (!active) this.stop()
  }
  setMuted(muted: boolean) {
    this.muted = muted
    if (muted) this.stop()
  }
  sync() {
    if (!this.visible()) this.stop()
  }
  ended(id: number) {
    this.voices = this.voices.filter((v) => v.id !== id)
  }
  stop() {
    this.port.stop()
    this.voices = []
  }
  play(kind: ContactKind, now: number) {
    if (
      this.disposed ||
      !this.active ||
      this.muted ||
      !this.visible() ||
      !this.port.loaded() ||
      !this.port.ready()
    )
      return null
    const cooldown =
      kind === 'rejected' ? 350 : kind === 'failed' ? 100 : kind === 'credited' ? 45 : 25
    if (now - this.last[kind] < cooldown) return null
    this.last[kind] = now
    if (this.voices.length >= 3) {
      const index = this.voices.findIndex((v) => v.kind === 'pending')
      const [old] = this.voices.splice(index < 0 ? 0 : index, 1)
      this.port.stop(old.id)
    }
    try {
      const id = this.port.play(kind === 'pending' ? `pending${this.variation++ % 3}` : kind)
      this.port.volume(
        (kind === 'pending' ? 0.25 : kind === 'credited' ? 0.21 : 0.19) /
          Math.sqrt(this.voices.length + 1),
        id
      )
      this.voices.push({ id, kind })
      return id
    } catch {
      return null
    }
  }
  dispose() {
    this.disposed = true
    this.stop()
  }
}
