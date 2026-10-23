import { expect, test } from 'bun:test'
import { createGridScanClock } from './grid-scan-clock'

test('first launch starts at the cached phase, independent of page uptime', () => {
  for (const uptime of [0, 12345, 900000]) {
    const clock = createGridScanClock()
    expect(clock.sample(uptime, false)).toBe(0)
    expect(clock.sample(uptime + 5000, true)).toBe(0)
    expect(clock.sample(uptime + 5200, true)).toBeCloseTo(0.2)
    expect(clock.sample(uptime + 5500, true)).toBeCloseTo(0.5)
  }
})
test('refresh samples retain the phase and hidden time never catches up', () => {
  const clock = createGridScanClock()
  clock.sample(10000, true)
  expect(clock.sample(10200, true)).toBeCloseTo(0.2)
  expect(clock.sample(10200, true)).toBeCloseTo(0.2)
  expect(clock.sample(10250, false)).toBe(0)
  expect(clock.sample(900000, true)).toBeCloseTo(0.2)
  expect(clock.sample(900050, true)).toBeCloseTo(0.25)
  clock.pause()
  expect(clock.sample(999999, true)).toBeCloseTo(0.25)
  expect(createGridScanClock().sample(999999, true)).toBe(0)
})
