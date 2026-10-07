/** Original browser adaptation of Digital Domain's SIGGRAPH2011 chunk-to-cube
 * destruction. The material remains connected until spatial activation.
 */
export const DEREZ_LIFETIME_MS = 750
export const DEREZ_RADIUS = 30
export const DEREZ_CELL_SIZE = 60 / 7
export interface DerezCell {
  id: number
  x: number
  y: number
  chunk: number
  edgeDepth: number
}
const seeds = [
  [-16, -18],
  [14, -16],
  [-21, 7],
  [0, 2],
  [22, 11],
  [-5, 23],
] as const
const cells: DerezCell[] = []
const half = DEREZ_CELL_SIZE / 2
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 7; col++) {
    const x = (col - 3) * DEREZ_CELL_SIZE,
      y = (row - 3) * DEREZ_CELL_SIZE
    if (
      Math.hypot(Math.max(Math.abs(x) - half, 0), Math.max(Math.abs(y) - half, 0)) >= DEREZ_RADIUS
    )
      continue
    const nearest = seeds.reduce(
      (best, seed, i) =>
        Math.hypot(seed[0] - x, seed[1] - y) < Math.hypot(seeds[best][0] - x, seeds[best][1] - y)
          ? i
          : best,
      0
    )
    cells.push({ id: row * 7 + col, x, y, chunk: nearest, edgeDepth: 0 })
  }
}
const neighbors = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const
function adjacent(c: DerezCell, dx: number, dy: number) {
  return cells.find(
    (n) =>
      n.chunk === c.chunk &&
      Math.abs(n.x - c.x - dx * DEREZ_CELL_SIZE) < 0.001 &&
      Math.abs(n.y - c.y - dy * DEREZ_CELL_SIZE) < 0.001
  )
}
for (const cell of cells) {
  const visited = new Set<number>([cell.id])
  let depth = 0,
    frontier = [cell]
  while (frontier.length) {
    if (frontier.some((c) => neighbors.some(([dx, dy]) => !adjacent(c, dx, dy)))) break
    frontier = frontier.flatMap((c) =>
      neighbors.flatMap(([dx, dy]) => {
        const n = adjacent(c, dx, dy)
        if (!n || visited.has(n.id)) return []
        visited.add(n.id)
        return [n]
      })
    )
    depth++
  }
  cell.edgeDepth = depth
}
export const DEREZ_CELLS: readonly DerezCell[] = cells
export const DEREZ_CHUNKS = seeds.map((_, id) => {
  const members = cells.filter((c) => c.chunk === id)
  return {
    id,
    cells: members,
    x: members.reduce((s, c) => s + c.x, 0) / members.length,
    y: members.reduce((s, c) => s + c.y, 0) / members.length,
  }
})
const noise = (id: number) => ((id * 37 + 17) % 101) / 100
export const ease = (value: number) => {
  const p = Math.max(0, Math.min(1, value))
  return p * p * (3 - 2 * p)
}
export function cellPath(cell: DerezCell) {
  return `M${cell.x - half},${cell.y - half}h${DEREZ_CELL_SIZE}v${DEREZ_CELL_SIZE}h${-DEREZ_CELL_SIZE}Z`
}
export interface ChunkMotion {
  x: number
  y: number
  rotation: number
}
export interface DerezChunk extends ChunkMotion {
  id: number
  cells: readonly DerezCell[]
  start: number
  side: number
}
export interface DerezVoxel {
  id: number
  sourceX: number
  sourceY: number
  size: number
  release: number
  end: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  spin: number
  side: number
}
export interface DerezScene {
  angle: number
  nx: number
  ny: number
  chunks: DerezChunk[]
  medium: DerezVoxel[]
  fine: DerezVoxel[][]
}
export interface VoxelPose {
  x: number
  y: number
  rotation: number
  opacity: number
  skin: number
  size: number
  age: number
}
export function chunkMotion(
  scene: Pick<DerezScene, 'nx' | 'ny'>,
  chunk: DerezChunk,
  time: number,
  out: ChunkMotion
) {
  const spread = ease((time - chunk.start) / 0.16)
  out.x = scene.nx * chunk.side * spread * 2.4
  out.y = scene.ny * chunk.side * spread * 2.4
  out.rotation = (chunk.id % 2 ? 1 : -1) * spread * 0.085
  return out
}
export function voxelPose(
  scene: DerezScene,
  voxel: DerezVoxel,
  time: number,
  fine: boolean,
  out: VoxelPose
) {
  const age = Math.max(0, time - voxel.release),
    damping = fine ? 0.075 : 0.1
  const carry = damping * (1 - Math.exp(-age / damping))
  const kick = fine ? 0 : 3.5 * (1 - Math.exp(-age / 0.13))
  out.x = voxel.x + voxel.vx * carry + scene.nx * voxel.side * kick
  out.y = voxel.y + voxel.vy * carry + scene.ny * voxel.side * kick + Math.min(1.8, age * age * 12)
  out.rotation = voxel.rotation + voxel.spin * age
  out.age = age
  out.opacity = fine ? 1 - ease((age - 0.04) / (voxel.end - voxel.release - 0.04)) : 1
  out.skin = fine ? Math.max(0, 0.38 * (1 - age / 0.15)) : Math.max(0, 1 - age / 0.275)
  out.size = voxel.size * (fine ? 1 - 0.45 * ease(age / (voxel.end - voxel.release)) : 1)
  return out
}
export function createDerezScene(angle: number): DerezScene {
  const scene: DerezScene = {
    angle,
    nx: -Math.sin(angle),
    ny: Math.cos(angle),
    chunks: [],
    medium: [],
    fine: [],
  }
  scene.chunks = DEREZ_CHUNKS.map((c) => ({
    ...c,
    start: 0.025 + (Math.abs(c.x * scene.nx + c.y * scene.ny) / 30) * 0.085 + noise(c.id) * 0.012,
    side: c.x * scene.nx + c.y * scene.ny >= 0 ? 1 : -1,
    rotation: 0,
  }))
  const movement = { x: 0, y: 0, rotation: 0 },
    future = { ...movement }
  for (const cell of cells) {
    const chunk = scene.chunks[cell.chunk]
    const release = chunk.start + 0.065 + cell.edgeDepth * 0.16 + noise(cell.id) * 0.015
    const sample = (time: number, out: ChunkMotion) => {
      chunkMotion(scene, chunk, time, out)
      const x = cell.x - chunk.x,
        y = cell.y - chunk.y,
        cos = Math.cos(out.rotation),
        sin = Math.sin(out.rotation)
      out.x += chunk.x + x * cos - y * sin
      out.y += chunk.y + x * sin + y * cos
    }
    sample(release, movement)
    sample(release + 0.001, future)
    const medium: DerezVoxel = {
      id: cell.id,
      sourceX: cell.x,
      sourceY: cell.y,
      size: DEREZ_CELL_SIZE,
      release,
      end: release + 0.17,
      x: movement.x,
      y: movement.y,
      vx: (future.x - movement.x) / 0.001,
      vy: (future.y - movement.y) / 0.001,
      rotation: movement.rotation,
      spin: (noise(cell.id + 31) - 0.5) * 1.8,
      side: chunk.side,
    }
    scene.medium.push(medium)
    const pose = voxelPose(scene, medium, medium.end, false, {
      ...movement,
      opacity: 1,
      skin: 1,
      size: 0,
      age: 0,
    })
    const next = voxelPose(scene, medium, medium.end + 0.001, false, { ...pose })
    scene.fine.push(
      Array.from({ length: 4 }, (_, i) => {
        const ox = ((i % 2 ? 1 : -1) * DEREZ_CELL_SIZE) / 4,
          oy = ((i < 2 ? -1 : 1) * DEREZ_CELL_SIZE) / 4
        const rx = ox * Math.cos(pose.rotation) - oy * Math.sin(pose.rotation),
          ry = ox * Math.sin(pose.rotation) + oy * Math.cos(pose.rotation)
        return {
          id: cell.id * 4 + i,
          sourceX: cell.x + ox,
          sourceY: cell.y + oy,
          size: DEREZ_CELL_SIZE / 2,
          release: medium.end,
          end: Math.min(0.74, medium.end + 0.18 + noise(cell.id * 4 + i) * 0.06),
          x: pose.x + rx,
          y: pose.y + ry,
          vx: (next.x - pose.x) / 0.001 - medium.spin * ry,
          vy: (next.y - pose.y) / 0.001 + medium.spin * rx,
          rotation: pose.rotation,
          spin: medium.spin + (noise(i + cell.id + 53) - 0.5) * 0.7,
          side: medium.side,
        }
      })
    )
  }
  return scene
}
export function derezCounts(scene: DerezScene, milliseconds: number) {
  const time = milliseconds / 1000
  return {
    connected: scene.chunks.filter((c) =>
      c.cells.some((cell) => time < scene.medium.find((v) => v.id === cell.id)!.release)
    ).length,
    medium: scene.medium.filter((v) => time >= v.release && time < v.end).length,
    fine: scene.fine.flat().filter((v) => time >= v.release && time < v.end).length,
  }
}
