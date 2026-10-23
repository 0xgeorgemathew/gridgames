import { expect, test } from 'bun:test'
import { PresentationClock } from './presentation-clock'
import { dropPoint } from './motion'
import { DROP_WINDOW_MS, type StockDrop } from '../shared/types'

test('late and fast server samples slew tosses without rewinding or jumping', () => {
  const clock = new PresentationClock()
  clock.sample(10000, 0)
  const drop: StockDrop = {
    id: 'disc',
    symbol: 'NVDA',
    spawnedAt: 9000,
    expiresAt: 9000 + DROP_WINDOW_MS,
    lane: 0.5,
    drift: 0.2,
    rotation: 3,
  }
  const before = clock.now(100)
  const point = dropPoint(drop, before)
  clock.sample(9950, 100)
  expect(clock.now(100)).toBe(before)
  const next = clock.now(100 + 1000 / 60)
  expect(next - before).toBeCloseTo(15, 5)
  expect(dropPoint(drop, next).y).toBeLessThan(point.y)
  clock.sample(11000, 100 + 1000 / 60)
  expect(clock.now(100 + 1000 / 60)).toBe(next)
  expect(clock.now(100 + 2000 / 60) - next).toBeCloseTo((1000 / 60) * 1.1, 5)
})

test('clock catches elapsed hidden time and a new match resets its anchor', () => {
  const clock = new PresentationClock()
  clock.sample(10000, 0)
  clock.sample(9900, 100)
  expect(clock.now(61000)).toBe(70800)
  expect(clock.authoritativeNow(61000)).toBe(70800)
  expect(
    dropPoint(
      {
        id: 'x',
        symbol: 'NVDA',
        spawnedAt: 10000,
        expiresAt: 14000,
        lane: 0.5,
        drift: 0,
        rotation: 0,
      },
      clock.now(61000)
    ).progress
  ).toBe(1)
  clock.reset(50000, 62000)
  expect(clock.now(62000)).toBe(50000)
  expect(clock.now(63000)).toBe(51000)
})
