import { expect, test } from 'bun:test'
import { deRezFragments, DEREZ_MS } from './derez-motion'

test('disc actually subdivides to progressively smaller fragments and disappears by size', () => {
  const coarse = deRezFragments(100),
    medium = deRezFragments(250),
    fine = deRezFragments(360)
  expect(coarse.cells.length).toBeLessThan(medium.cells.length)
  expect(medium.cells.length).toBeLessThan(fine.cells.length)
  expect(coarse.cells[0].width).toBeGreaterThan(medium.cells[0].width)
  expect(medium.cells[0].width).toBeGreaterThan(fine.cells[0].width)
  expect(deRezFragments(450).cells.some((c) => c.energy === 1)).toBe(true)
  expect(deRezFragments(DEREZ_MS).cells).toHaveLength(0)
})
test('all breakup phases stay within the contact footprint without downward travel', () => {
  for (let time = 90; time <= DEREZ_MS; time += 5) {
    for (const c of deRezFragments(time).cells) {
      expect(Math.abs(c.cx + c.dx) + (c.width * c.scale) / 2).toBeLessThanOrEqual(36)
      expect(Math.abs(c.cy + c.dy) + (c.height * c.scale) / 2).toBeLessThanOrEqual(36)
      expect(c.dy * c.cy).toBeGreaterThanOrEqual(0)
      expect(c.scale).toBeGreaterThan(0)
      expect(c.scale).toBeLessThanOrEqual(1)
    }
  }
})
