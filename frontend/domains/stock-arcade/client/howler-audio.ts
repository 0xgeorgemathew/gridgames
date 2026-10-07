import { Howl, Howler } from 'howler'
import { StockMusic } from './music'
import { CONTACT_SPRITES, ContactSound } from './contact-sound'
import type { ContactKind } from './contact-feedback'
/** One lifecycle owns both backends: retain the proven streaming music element,
 * use Howler's decoded short sprites for low-latency contact, never global mute. */
export class StockAudio {
  private disposed = false
  private gesture = false
  private muted = false
  private track: HTMLAudioElement
  private effects: Howl
  private music: StockMusic
  private contacts: ContactSound
  constructor(private visible: () => boolean) {
    this.track = new Audio('/audio/digital_dividend.mp3')
    this.track.preload = 'none'
    this.music = new StockMusic(this.track, visible)
    this.effects = new Howl({
      src: ['/audio/stock-contact.wav'],
      preload: true,
      autoplay: false,
      volume: 0.2,
      sprite: CONTACT_SPRITES,
      pool: 3,
      onend: (id) => this.contacts?.ended(id),
      onplayerror: (id) => {
        this.effects.stop(id)
        this.contacts?.ended(id)
      },
    })
    this.contacts = new ContactSound(
      {
        loaded: () => this.effects.state() === 'loaded',
        ready: () => this.gesture && (!Howler.usingWebAudio || Howler.ctx?.state === 'running'),
        play: (name) => this.effects.play(name),
        volume: (value, id) => {
          this.effects.volume(value, id)
        },
        stop: (id) => {
          this.effects.stop(id)
        },
      },
      visible
    )
  }
  setActive(active: boolean) {
    this.music.setActive(active)
    this.contacts.setActive(active)
  }
  setMuted(muted: boolean) {
    this.muted = muted
    this.music.setMuted(muted)
    this.contacts.setMuted(muted)
  }
  sync() {
    this.music.sync()
    this.contacts.sync()
  }
  unlock(prime = false) {
    if (this.disposed || this.muted || !this.visible()) return
    this.gesture = true
    // Ordinary gestures unlock future cues silently, never replay a past contact.
    if (Howler.ctx?.state === 'suspended') void Howler.ctx.resume().catch(() => {})
    this.music.unlock(prime)
  }
  feedback(kind: ContactKind) {
    return this.contacts.play(kind, performance.now())
  }
  dispose() {
    this.disposed = true
    this.contacts.dispose()
    this.music.dispose()
    this.effects.unload()
    this.track.removeAttribute('src')
    this.track.load()
  }
}
