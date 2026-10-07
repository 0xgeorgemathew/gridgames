import { describe, expect, test } from 'bun:test'
import {
  createDerezScene,
  derezCounts,
  voxelPose,
  DEREZ_CELLS,
  DEREZ_CHUNKS,
  DEREZ_CELL_SIZE,
  DEREZ_LIFETIME_MS,
} from './derez-geometry'
const pose = () => ({ x: 0, y: 0, rotation: 0, opacity: 1, skin: 1, size: 0, age: 0 })
describe('staged local disc de-rez', () => {
  test('the intact round surface belongs to six connected regions with interior erosion depth', () => {
    expect(new Set(DEREZ_CELLS.map((c) => c.id)).size).toBe(DEREZ_CELLS.length)
    expect(DEREZ_CHUNKS.length).toBe(6)
    for (const chunk of DEREZ_CHUNKS) {
      const reached = new Set([chunk.cells[0].id])
      let previous = 0
      while (previous !== reached.size) {
        previous = reached.size
        for (const c of chunk.cells)
          if (
            chunk.cells.some(
              (n) =>
                reached.has(n.id) &&
                Math.abs(Math.hypot(n.x - c.x, n.y - c.y) - DEREZ_CELL_SIZE) < 0.001
            )
          )
            reached.add(c.id)
      }
      expect(reached.size).toBe(chunk.cells.length)
    }
    for (const c of DEREZ_CELLS.filter((c) => c.edgeDepth > 0))
      expect(
        DEREZ_CELLS.filter(
          (n) =>
            n.chunk === c.chunk &&
            Math.abs(Math.hypot(n.x - c.x, n.y - c.y) - DEREZ_CELL_SIZE) < 0.001
        ).length
      ).toBe(4)
    for (let x = -29; x <= 29; x++)
      for (let y = -29; y <= 29; y++)
        if (Math.hypot(x, y) < 30)
          expect(
            DEREZ_CELLS.some(
              (c) =>
                Math.abs(c.x - x) <= DEREZ_CELL_SIZE / 2 && Math.abs(c.y - y) <= DEREZ_CELL_SIZE / 2
            )
          ).toBe(true)
  })
  test('connected surface becomes mixed scales, then glass cubes, then nothing', () => {
    const scene = createDerezScene(0.2)
    expect(derezCounts(scene, 0)).toEqual({ connected: 6, medium: 0, fine: 0 })
    expect(derezCounts(scene, 120).connected).toBe(6)
    const mixed = derezCounts(scene, 280)
    expect(mixed.connected).toBeGreaterThan(0)
    expect(mixed.medium).toBeGreaterThan(0)
    expect(mixed.fine).toBeGreaterThan(0)
    expect(derezCounts(scene, 450).fine).toBeGreaterThan(0)
    expect(derezCounts(scene, DEREZ_LIFETIME_MS)).toEqual({ connected: 0, medium: 0, fine: 0 })
  })
  test('fine cubes continue their parent pose and partition its original surface, without another kick', () => {
    const scene = createDerezScene(0.7)
    scene.medium.forEach((medium, i) => {
      const parent = voxelPose(scene, medium, medium.end, false, pose())
      for (const fine of scene.fine[i]) {
        const child = voxelPose(scene, fine, fine.release, true, pose())
        expect(child.x).toBeCloseTo(fine.x, 8)
        expect(child.y).toBeCloseTo(fine.y, 8)
        expect(child.rotation).toBeCloseTo(parent.rotation, 8)
        expect(Math.hypot(child.x - parent.x, child.y - parent.y)).toBeCloseTo(
          DEREZ_CELL_SIZE / Math.sqrt(8),
          8
        )
        expect(Math.abs(fine.sourceX - medium.sourceX)).toBeCloseTo(DEREZ_CELL_SIZE / 4, 8)
        expect(Math.abs(fine.sourceY - medium.sourceY)).toBeCloseTo(DEREZ_CELL_SIZE / 4, 8)
        expect(fine.end * 1000).toBeLessThan(DEREZ_LIFETIME_MS)
      }
    })
  })
  test('three concurrent cuts remain a bounded pool and stay inside the local surface', () => {
    for (const angle of [0, 0.2, 0.7, Math.PI / 2, Math.PI, 4.2]) {
      const scene = createDerezScene(angle)
      for (let ms = 0; ms <= 750; ms += 10) {
        const counts = derezCounts(scene, ms)
        expect((counts.medium + counts.fine) * 3).toBeLessThanOrEqual(540)
        for (const [fine, voxels] of [
          [false, scene.medium],
          [true, scene.fine.flat()],
        ] as const)
          for (const v of voxels)
            if (ms / 1000 >= v.release && ms / 1000 < v.end) {
              const p = voxelPose(scene, v, ms / 1000, fine, pose())
              // 59.4-unit half surface, including capped inherited toss and cube depth.
              expect(Math.abs(p.x) + p.size / 2 + 440 * 0.024 + 2).toBeLessThan(59.4)
              expect(Math.abs(p.y) + p.size / 2 + 440 * 0.024 + 2).toBeLessThan(59.4)
            }
      }
    }
  })
})
