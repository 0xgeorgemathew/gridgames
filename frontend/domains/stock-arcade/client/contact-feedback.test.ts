import { describe, expect, test } from 'bun:test'
import { ContactFeedback, type ContactAnchor } from './contact-feedback'
import { ContactSound, CONTACT_SPRITES } from './contact-sound'
const anchor: ContactAnchor = {
  dropId: '1',
  symbol: 'NVDA',
  x: 0.5,
  y: 0.4,
  rotation: 1,
  angle: 0,
  diameter: 88,
}
describe('feedback means actual claim state', () => {
  test('one pending contact, no replayed or uninitiated confirmations, one terminal cue', () => {
    const f = new ContactFeedback()
    f.reset('round-a')
    expect(f.begin('round-a', anchor)).toBe(true)
    expect(f.begin('round-a', anchor)).toBe(false)
    expect(f.settle('round-a', 'unknown', 'credited')).toBeNull()
    expect(f.settle('round-a', '1', 'credited')).toEqual({ ...anchor, kind: 'credited' })
    expect(f.settle('round-a', '1', 'credited')).toBeNull()
    expect(f.settle('round-a', '1', 'failed')).toBeNull()
  })
  test('reject stays catchable after capacity releases, and old rounds stay silent', () => {
    const f = new ContactFeedback()
    f.reset('round-a')
    expect(f.reject('round-a', '1')).toBe(true)
    expect(f.reject('round-a', '1')).toBe(false)
    expect(f.settle('round-a', '1', 'credited')).toBeNull()
    expect(f.begin('round-a', anchor)).toBe(true)
    expect(f.settle('round-a', '1', 'failed')?.kind).toBe('failed')
    f.reset('round-b')
    expect(f.settle('round-a', '1', 'credited')).toBeNull()
    expect(f.begin('round-a', anchor)).toBe(false)
    expect(f.begin('round-b', anchor)).toBe(true)
    expect(f.settle('round-a', '1', 'failed')).toBeNull()
    f.reset()
    expect(f.settle('round-b', '1', 'credited')).toBeNull()
  })
})
function fixture() {
  let loaded = true,
    ready = true,
    visible = true,
    id = 0
  const playing = new Map<number, string>(),
    history: string[] = [],
    stopped: number[] = [],
    volumes: number[] = []
  const s = new ContactSound(
    {
      loaded: () => loaded,
      ready: () => ready,
      play: (name) => {
        const n = ++id
        playing.set(n, name)
        history.push(name)
        return n
      },
      volume: (v) => volumes.push(v),
      stop: (n) => {
        if (n !== undefined) {
          playing.delete(n)
          stopped.push(n)
        } else playing.clear()
      },
    },
    () => visible
  )
  return {
    s,
    playing,
    history,
    stopped,
    volumes,
    load: (v: boolean) => (loaded = v),
    unlock: (v: boolean) => (ready = v),
    visible: (v: boolean) => {
      visible = v
      s.sync()
    },
  }
}
describe('bounded non-replaying contact sound', () => {
  test('loading/locked/lobby/hidden/muted/disposed cues are discarded, never deferred', () => {
    const f = fixture()
    expect(f.s.play('pending', 0)).toBeNull()
    f.s.setActive(true)
    f.load(false)
    expect(f.s.play('pending', 100)).toBeNull()
    f.load(true)
    f.unlock(false)
    expect(f.s.play('pending', 200)).toBeNull()
    f.unlock(true)
    expect(f.history).toEqual([])
    expect(f.s.play('pending', 300)).not.toBeNull()
    f.visible(false)
    expect(f.playing.size).toBe(0)
    expect(f.s.play('credited', 400)).toBeNull()
    f.visible(true)
    expect(f.history.length).toBe(1)
    f.s.setMuted(true)
    expect(f.s.play('failed', 500)).toBeNull()
    f.s.setMuted(false)
    expect(f.history.length).toBe(1)
    f.s.play('failed', 600)
    f.s.setActive(false)
    expect(f.playing.size).toBe(0)
    f.s.dispose()
    f.s.setActive(true)
    expect(f.s.play('credited', 1000)).toBeNull()
  })
  test('actual three-voice limit prioritizes confirmations and attenuates overlap', () => {
    const f = fixture()
    f.s.setActive(true)
    f.s.play('pending', 0)
    f.s.play('pending', 30)
    f.s.play('pending', 60)
    expect(f.history).toEqual(['pending0', 'pending1', 'pending2'])
    f.s.play('credited', 80)
    expect(f.playing.size).toBe(3)
    expect(f.stopped).toEqual([1])
    expect([...f.playing.values()]).toContain('credited')
    expect(f.volumes[1]).toBeLessThan(f.volumes[0])
    expect(f.volumes.every((v) => v <= 0.25)).toBe(true)
    f.playing.delete(2)
    f.s.ended(2)
    expect(f.s.play('failed', 100)).not.toBeNull()
    expect(f.playing.size).toBeLessThanOrEqual(3)
    f.s.stop()
    expect(f.playing.size).toBe(0)
  })
  test('coalesces near-simultaneous acknowledgements and repeated budget sounds without a multiplier', () => {
    const f = fixture()
    f.s.setActive(true)
    expect(f.s.play('pending', 0)).not.toBeNull()
    expect(f.s.play('pending', 10)).toBeNull()
    expect(f.s.play('credited', 30)).not.toBeNull()
    expect(f.s.play('credited', 60)).toBeNull()
    expect(f.s.play('failed', 80)).not.toBeNull()
    expect(f.s.play('failed', 140)).toBeNull()
    expect(f.s.play('rejected', 170)).not.toBeNull()
    expect(f.s.play('rejected', 300)).toBeNull()
    expect(Object.keys(CONTACT_SPRITES)).toHaveLength(6)
  })
})
