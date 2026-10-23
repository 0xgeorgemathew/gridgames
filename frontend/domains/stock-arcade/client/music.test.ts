import { expect, test } from 'bun:test'
import { StockMusic } from './music'
function fixture() {
  let visible = true,
    playing = false,
    blocked = false,
    attempts = 0
  const media = {
    volume: 1,
    loop: false,
    muted: false,
    play: async () => {
      attempts++
      if (blocked) throw new Error('Gesture required')
      playing = true
    },
    pause: () => {
      playing = false
    },
  }
  const music = new StockMusic(media, () => visible)
  return {
    media,
    music,
    get playing() {
      return playing
    },
    get attempts() {
      return attempts
    },
    hide: () => {
      visible = false
      music.sync()
    },
    show: () => {
      visible = true
      music.sync()
    },
    block: () => {
      blocked = true
    },
    allow: () => {
      blocked = false
    },
  }
}
test('music starts for play, respects mute/visibility, and releases on results/unmount', async () => {
  const f = fixture()
  expect(f.media.loop).toBe(true)
  expect(f.media.volume).toBe(0.3)
  f.music.unlock(true)
  await Promise.resolve()
  expect(f.playing).toBe(false)
  f.music.setActive(true)
  expect(f.playing).toBe(true)
  f.music.setMuted(true)
  expect(f.playing).toBe(false)
  f.music.setMuted(false)
  expect(f.playing).toBe(true)
  f.hide()
  expect(f.playing).toBe(false)
  f.show()
  expect(f.playing).toBe(true)
  f.music.setActive(false)
  expect(f.playing).toBe(false)
  f.music.setActive(true)
  f.music.dispose()
  expect(f.playing).toBe(false)
  const attempts = f.attempts
  f.music.unlock()
  f.music.sync()
  expect(f.attempts).toBe(attempts)
})
test('autoplay rejection recovers from an ordinary gesture without a persistent idle loop', async () => {
  const f = fixture()
  f.block()
  f.music.setActive(true)
  await Promise.resolve()
  expect(f.playing).toBe(false)
  f.allow()
  f.music.unlock()
  expect(f.playing).toBe(true)
  f.music.setActive(false)
  f.music.unlock()
  f.music.dispose()
  await Promise.resolve()
  expect(f.playing).toBe(false)
})

test('ordinary lobby/results gestures never start even a silent media loop', () => {
  const f = fixture()
  f.music.unlock()
  expect(f.attempts).toBe(0)
  f.music.setActive(true)
  f.music.setActive(false)
  const attempts = f.attempts
  f.music.unlock()
  expect(f.attempts).toBe(attempts)
  expect(f.playing).toBe(false)
})
