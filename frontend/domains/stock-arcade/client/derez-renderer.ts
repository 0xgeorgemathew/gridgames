import { COIN_CONFIG } from '@/platform/game-engine/visuals/tron-disc'
import { stockAsset } from '../shared/assets'
import { discDiameter } from './motion'
import {
  createDerezScene,
  chunkMotion,
  voxelPose,
  cellPath,
  type DerezScene,
  type DerezVoxel,
  type VoxelPose,
} from './derez-geometry'
const hex = (color: number) => '#' + color.toString(16).padStart(6, '0')
const energy = hex(COIN_CONFIG.long.color)
export interface DiscSnapshot {
  symbol: string
  diameter: number
  rotation: number
  image: HTMLImageElement
  logoX: number
  logoY: number
  logoDiameter: number
  logoPadding: number
  labelX: number
  labelY: number
  font: string
  velocityX: number
  velocityY: number
}
const logos = new Map<string, HTMLImageElement>()
export function captureDisc(
  symbol: string,
  element?: HTMLElement | null,
  rotation = 0,
  velocityX = 0,
  velocityY = 0
): DiscSnapshot {
  const diameter = element?.offsetWidth ?? discDiameter(window.innerWidth),
    scale = diameter / 66
  const rect = element?.getBoundingClientRect(),
    cx = rect ? rect.x + rect.width / 2 : 0,
    cy = rect ? rect.y + rect.height / 2 : 0
  const logo = element?.querySelector<HTMLElement>('.ninja-disc-logo'),
    label = element?.querySelector<HTMLElement>('.ninja-disc-symbol')
  let image = element?.querySelector<HTMLImageElement>('img') ?? logos.get(symbol)
  if (!image) {
    image = new Image()
    image.src = stockAsset(symbol)!.logo
    logos.set(symbol, image)
  }
  const l = logo?.getBoundingClientRect(),
    t = label?.getBoundingClientRect(),
    css = label ? getComputedStyle(label) : null
  const logoDiameter = logo?.offsetWidth ?? Math.max(42, Math.min(54, window.innerWidth * 0.11))
  const totalFaceHeight = logoDiameter + 3 + 15
  const speed = Math.hypot(velocityX, velocityY),
    factor = speed > 440 ? 440 / speed : 1
  return {
    symbol,
    diameter,
    rotation,
    image,
    logoX: l ? (l.x + l.width / 2 - cx) / scale : 0,
    logoY: l
      ? (l.y + l.height / 2 - cy) / scale
      : (-totalFaceHeight / 2 + logoDiameter / 2) / scale,
    logoDiameter: logoDiameter / scale,
    logoPadding: (logo ? parseFloat(getComputedStyle(logo).paddingLeft) : 6) / scale,
    labelX: t ? (t.x + t.width / 2 - cx) / scale : 0,
    labelY: t ? (t.y + t.height / 2 - cy) / scale : (totalFaceHeight / 2 - 7.5) / scale,
    font: css
      ? `${css.fontWeight} ${parseFloat(css.fontSize) / scale}px ${css.fontFamily}`
      : `800 ${10 / scale}px Orbitron, sans-serif`,
    velocityX: velocityX * factor,
    velocityY: velocityY * factor,
  }
}
function paintDisc(context: CanvasRenderingContext2D, source: DiscSnapshot) {
  context.save()
  context.rotate(source.rotation)
  context.strokeStyle = energy
  for (let i = 6; i > 0; i--) {
    context.globalAlpha = 0.018
    context.lineWidth = i
    context.beginPath()
    context.arc(0, 0, 30, 0, Math.PI * 2)
    context.stroke()
  }
  context.globalAlpha = 1
  context.fillStyle = '#0a0a0a'
  context.beginPath()
  context.arc(0, 0, 30, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = hex(COIN_CONFIG.long.edgeColor)
  context.globalAlpha = 0.8
  context.lineWidth = 0.65
  context.stroke()
  context.globalAlpha = 1
  context.fillStyle = hex(COIN_CONFIG.long.darkCore)
  context.beginPath()
  context.arc(0, 0, 27, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = energy
  context.lineWidth = 2.2
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.07
    context.beginPath()
    context.arc(0, 0, 28, a, a + Math.PI / 4 - 0.14)
    context.stroke()
  }
  context.lineWidth = 0.55
  context.globalAlpha = 0.45
  context.beginPath()
  context.arc(0, 0, 22, 0, Math.PI * 2)
  context.stroke()
  context.restore()
  const radius = source.logoDiameter / 2
  const gradient = context.createRadialGradient(
    source.logoX - radius * 0.3,
    source.logoY - radius * 0.5,
    0,
    source.logoX,
    source.logoY,
    radius * 1.5
  )
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(1, '#e7edf0')
  context.fillStyle = gradient
  context.beginPath()
  context.arc(source.logoX, source.logoY, radius, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#00d3ff25'
  context.lineWidth = 0.6
  context.stroke()
  if (source.image.complete && source.image.naturalWidth) {
    const max = source.logoDiameter - source.logoPadding * 2,
      ratio = Math.min(max / source.image.naturalWidth, max / source.image.naturalHeight),
      w = source.image.naturalWidth * ratio,
      h = source.image.naturalHeight * ratio
    context.drawImage(source.image, source.logoX - w / 2, source.logoY - h / 2, w, h)
  }
  context.fillStyle = '#ffffff'
  context.font = source.font
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(source.symbol, source.labelX, source.labelY)
}
/** One bounded 2D surface and precomputed fragment pool per catch. No own RAF,
 * image readback, WebGL context, per-fragment blur or generated DOM particles. */
export class DerezRenderer {
  private context: CanvasRenderingContext2D
  private front = document.createElement('canvas')
  private scene: DerezScene
  private clip = new Path2D()
  private cellRects = new Map<number, Path2D>()
  private releases = new Map<number, number>()
  private paintPaths: Array<{ mask: bigint; path: Path2D }>
  private scratch: VoxelPose = { x: 0, y: 0, rotation: 0, opacity: 1, skin: 1, size: 0, age: 0 }
  private glass: CanvasGradient
  private extent: number
  private ratio: number
  constructor(
    private canvas: HTMLCanvasElement,
    private source: DiscSnapshot,
    angle: number
  ) {
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('2D effect surface unavailable')
    this.context = context
    this.scene = createDerezScene(angle)
    for (const voxel of this.scene.medium) this.releases.set(voxel.id, voxel.release)
    this.clip.arc(0, 0, 30, 0, Math.PI * 2)
    this.paintPaths = this.scene.chunks.map(() => ({ mask: -1n, path: new Path2D() }))
    for (const c of this.scene.chunks.flatMap((c) => c.cells))
      this.cellRects.set(c.id, new Path2D(cellPath(c)))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.extent = source.diameter * 1.8
    this.ratio = source.diameter / 66
    canvas.width = Math.ceil(this.extent * dpr)
    canvas.height = Math.ceil(this.extent * dpr)
    context.setTransform(
      dpr * this.ratio,
      0,
      0,
      dpr * this.ratio,
      canvas.width / 2,
      canvas.height / 2
    )
    this.front.width = this.front.height = Math.ceil(source.diameter * dpr)
    this.repaintFront()
    this.glass = context.createLinearGradient(-4, -4, 4, 4)
    this.glass.addColorStop(0, 'rgba(204,225,232,0.48)')
    this.glass.addColorStop(0.24, 'rgba(57,86,101,0.6)')
    this.glass.addColorStop(0.7, 'rgba(11,26,39,0.8)')
    this.glass.addColorStop(1, 'rgba(164,192,204,0.3)')
  }
  repaintFront() {
    const c = this.front.getContext('2d')!
    c.setTransform(
      this.front.width / 66,
      0,
      0,
      this.front.height / 66,
      this.front.width / 2,
      this.front.height / 2
    )
    c.clearRect(-33, -33, 66, 66)
    paintDisc(c, this.source)
  }
  draw(progress: number) {
    const c = this.context,
      time = Math.max(0, progress) * 0.75
    c.clearRect(-60, -60, 120, 120)
    if (progress >= 1 || document.hidden) return
    c.save()
    // Initial toss momentum damps quickly; no debris continues across the arena.
    const inherited = 0.024 * (1 - Math.exp(-time / 0.024))
    c.translate(this.source.velocityX * inherited, this.source.velocityY * inherited)
    // Ambient rim halo has fixed radius and dies at contact; no expanding ring.
    if (time < 0.045) {
      c.save()
      c.globalAlpha = 0.08 * (1 - time / 0.045)
      c.strokeStyle = energy
      c.lineWidth = 4
      c.beginPath()
      c.arc(0, 0, 30, 0, Math.PI * 2)
      c.stroke()
      c.restore()
    }
    const movement = this.scratch
    for (const chunk of this.scene.chunks) {
      const remaining = chunk.cells.filter((cell) => time < this.releases.get(cell.id)!)
      if (!remaining.length) continue
      const mask = remaining.reduce((bits, cell) => bits | (1n << BigInt(cell.id)), 0n),
        cached = this.paintPaths[chunk.id]
      if (cached.mask !== mask) {
        cached.path = new Path2D()
        for (const cell of remaining) cached.path.addPath(this.cellRects.get(cell.id)!)
        cached.mask = mask
      }
      chunkMotion(this.scene, chunk, time, movement)
      c.save()
      c.translate(movement.x, movement.y)
      c.translate(chunk.x, chunk.y)
      c.rotate(movement.rotation)
      c.translate(-chunk.x, -chunk.y)
      c.clip(cached.path)
      c.clip(this.clip)
      c.drawImage(this.front, -33, -33, 66, 66)
      c.restore()
    }
    for (let i = 0; i < this.scene.medium.length; i++) {
      const medium = this.scene.medium[i]
      if (time >= medium.release && time < medium.end) this.drawCube(medium, time, false)
      else if (time >= medium.end)
        for (const fine of this.scene.fine[i]) if (time < fine.end) this.drawCube(fine, time, true)
    }
    if (time < 0.045) {
      c.save()
      c.rotate(this.scene.angle)
      c.beginPath()
      c.moveTo(-30, 0)
      c.lineTo(30, 0)
      c.globalAlpha = 1 - time / 0.045
      c.strokeStyle = '#ffffff'
      c.lineWidth = 0.65
      c.stroke()
      c.restore()
    }
    c.restore()
  }
  private drawCube(voxel: DerezVoxel, time: number, fine: boolean) {
    const c = this.context,
      p = voxelPose(this.scene, voxel, time, fine, this.scratch)
    if (p.opacity <= 0.01) return
    const half = p.size / 2,
      depth = (fine ? 0.75 : 1.65) * (0.8 + Math.cos(p.age * 5 + voxel.id) * 0.15)
    c.save()
    c.translate(p.x, p.y)
    c.rotate(p.rotation)
    c.globalAlpha = p.opacity
    c.fillStyle = 'rgba(95,132,150,0.5)'
    c.strokeStyle = 'rgba(205,232,241,0.55)'
    c.lineWidth = fine ? 0.24 : 0.35
    c.beginPath()
    c.moveTo(-half, -half)
    c.lineTo(-half + depth, -half - depth)
    c.lineTo(half + depth, -half - depth)
    c.lineTo(half, -half)
    c.closePath()
    c.fill()
    c.stroke()
    c.fillStyle = 'rgba(12,35,50,0.65)'
    c.beginPath()
    c.moveTo(half, -half)
    c.lineTo(half + depth, -half - depth)
    c.lineTo(half + depth, half - depth)
    c.lineTo(half, half)
    c.closePath()
    c.fill()
    c.stroke()
    c.fillStyle = this.glass
    c.fillRect(-half, -half, p.size, p.size)
    if (p.skin > 0) {
      c.save()
      c.beginPath()
      c.rect(-half, -half, p.size, p.size)
      c.clip()
      c.globalAlpha *= p.skin
      const scale = p.size / voxel.size
      c.scale(scale, scale)
      c.drawImage(this.front, -33 - voxel.sourceX, -33 - voxel.sourceY, 66, 66)
      c.restore()
    }
    // Pale glass edges, restrained rim-derived cyan: never a uniform neon fill.
    c.strokeStyle =
      Math.hypot(voxel.sourceX, voxel.sourceY) > 26
        ? 'rgba(65,215,234,0.7)'
        : 'rgba(205,229,239,0.42)'
    c.strokeRect(-half, -half, p.size, p.size)
    if (voxel.id % 7 === 0 && p.age < 0.11) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'
      c.beginPath()
      c.moveTo(-half, -half)
      c.lineTo(half * 0.1, -half)
      c.stroke()
    }
    c.restore()
  }
  dispose() {
    this.front.width = this.front.height = 0
    this.canvas.width = this.canvas.height = 0
  }
}
