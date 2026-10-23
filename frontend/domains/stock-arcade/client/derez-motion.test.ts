import { expect, test } from 'bun:test'
import { DEREZ_CELLS, deRezMotion, deRezLogoRect, DEREZ_MS, FRACTURE_MS } from './derez-motion'

test('subdivision reuses one nested footprint and tiles each moving parent', () => {
  const medium = DEREZ_CELLS.flatMap((cell) => cell.children)
  const fine = medium.flatMap((cell) => cell.children)
  expect(DEREZ_CELLS).toHaveLength(8)
  expect(medium).toHaveLength(32)
  expect(fine).toHaveLength(108)
  for (const parent of [...DEREZ_CELLS, ...medium]) {
    expect(parent.children.length).toBeGreaterThan(0)
    expect(parent.children.length).toBeLessThanOrEqual(4)
    for (const child of parent.children) {
      expect(child.width).toBe(parent.width / 2)
      expect(child.height).toBe(parent.height / 2)
      expect(child.x).toBeGreaterThanOrEqual(parent.x)
      expect(child.y).toBeGreaterThanOrEqual(parent.y)
      expect(child.x + child.width).toBeLessThanOrEqual(parent.x + parent.width)
      expect(child.y + child.height).toBeLessThanOrEqual(parent.y + parent.height)
    }
  }
  expect(fine.every((cell) => cell.width === 4 && cell.height === 8)).toBe(true)
})
test('phase boundaries are continuous and each subdivision keeps moving', () => {
  for (const boundary of [FRACTURE_MS, 210, 340]) {
    const before = deRezMotion(boundary - 0.01),
      after = deRezMotion(boundary + 0.01)
    for (const phase of ['fracture', 'coarse', 'medium', 'fine', 'energy'] as const) {
      expect(Math.abs(after[phase] - before[phase])).toBeLessThan(0.001)
    }
  }
  for (const [phase, start, end] of [
    ['fracture', 0, FRACTURE_MS],
    ['coarse', FRACTURE_MS, 210],
    ['medium', 210, 340],
    ['fine', 340, DEREZ_MS],
  ] as const) {
    for (let t = start; t < end; t += 8) {
      expect(deRezMotion(Math.min(end, t + 8))[phase]).toBeGreaterThan(deRezMotion(t)[phase])
    }
  }
})
test('every fine cell starts shrinking immediately, never waits, and reaches zero together', () => {
  for (const cell of DEREZ_CELLS.flatMap((c) => c.children.flatMap((c) => c.children))) {
    let previous = 1
    for (let t = 341; t <= DEREZ_MS; t++) {
      const motion = deRezMotion(t)
      const scale = 1 - motion.fine - cell.hash * 0.1 * motion.fineCurve
      expect(scale).toBeLessThan(previous)
      expect(scale).toBeGreaterThanOrEqual(0)
      previous = scale
    }
    expect(previous).toBe(0)
  }
  expect(deRezMotion(450).energy).toBe(1)
  expect(deRezMotion(DEREZ_MS).fine).toBe(1)
  expect(deRezMotion(DEREZ_MS + 1000).fine).toBe(1)
})

test('contact texture preserves wide, square and portrait brand proportions in its logo chamber', () => {
  for (const [width, height] of [
    [220, 86],
    [800, 190.803],
    [395.4, 155.9],
    [180, 120],
    [24, 24],
    [278.672, 360.438],
  ]) {
    const rect = deRezLogoRect(width, height)
    expect(rect.width / rect.height).toBeCloseTo(width / height, 8)
    expect(Math.max(rect.width, rect.height)).toBeCloseTo(22.6, 8)
    expect(rect.x + rect.width / 2).toBeCloseTo(0, 8)
    expect(rect.y + rect.height / 2).toBeCloseTo(-4.3, 8)
  }
})
