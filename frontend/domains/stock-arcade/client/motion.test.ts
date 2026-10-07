import { expect, test } from 'bun:test'
import { dropPoint, segmentHitsDisc } from './motion'
test('toss starts below arena, reaches readable arc, falls away, and swipe segment catches between samples', () => {
  const drop = {
    id: 'd',
    symbol: 'NVDA',
    spawnedAt: 0,
    expiresAt: 2800,
    lane: 0.4,
    drift: 0.1,
    rotation: 0.35,
  }
  expect(dropPoint(drop, 0).y).toBeGreaterThan(1)
  expect(dropPoint(drop, 1400).y).toBeLessThan(0.2)
  expect(dropPoint(drop, 2800).y).toBeGreaterThan(1)
  expect(segmentHitsDisc(0, 0, 100, 0, 50, 10, 20)).toBe(true)
  expect(segmentHitsDisc(0, 0, 100, 0, 50, 40, 20)).toBe(false)
})
