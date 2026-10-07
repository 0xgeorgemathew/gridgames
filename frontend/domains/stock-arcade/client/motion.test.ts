import { expect, test } from 'bun:test'
import { dropPoint, segmentHitsDisc, discDiameter } from './motion'
import { DROP_WINDOW_MS } from '../shared/types'
const drop = {
  id: 'd',
  symbol: 'NVDA',
  spawnedAt: 0,
  expiresAt: DROP_WINDOW_MS,
  lane: 0.145,
  drift: 0.11,
  rotation: 2.8,
  launchVelocity: 3.7,
}
test('toss carries horizontal and angular momentum while gravity reverses vertical velocity', () => {
  expect(dropPoint(drop, 0).y).toBeGreaterThan(1)
  expect(dropPoint(drop, 1200).y).toBeLessThan(0.4)
  expect(dropPoint(drop, DROP_WINDOW_MS).y).toBeGreaterThan(1.5)
  const points = [0, 700, 1400, 2100, 2800].map((t) => dropPoint(drop, t))
  for (let i = 1; i < points.length; i++) {
    expect(points[i].x).toBeGreaterThan(points[i - 1].x)
    expect(points[i].rotation).toBeGreaterThan(points[i - 1].rotation)
    expect(points[i].x - points[i - 1].x).toBeCloseTo(0.0275, 8)
  }
  expect(points[1].y - points[0].y).toBeLessThan(0)
  expect(points[4].y - points[3].y).toBeGreaterThan(0)
  // A late-round shortened catch window must not compress the physical flight.
  expect(dropPoint({ ...drop, expiresAt: 1000 }, 700)).toEqual(dropPoint(drop, 700))
})
test('swipe collision uses the enlarged responsive disc diameter between samples', () => {
  for (const width of [320, 390, 900]) {
    const radius = discDiameter(width) / 2
    expect(segmentHitsDisc(0, 0, 200, 0, 100, radius - 1, radius)).toBe(true)
    expect(segmentHitsDisc(0, 0, 200, 0, 100, radius + 1, radius)).toBe(false)
  }
  expect(discDiameter(320)).toBe(88)
  expect(discDiameter(900)).toBe(112)
})
