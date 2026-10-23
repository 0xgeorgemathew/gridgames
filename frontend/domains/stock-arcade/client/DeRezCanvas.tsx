import { useLayoutEffect, useRef } from 'react'
import { stockAsset } from '../shared/assets'
import { COIN_CONFIG } from '@/platform/game-engine/visuals/tron-disc'
import {
  DEREZ_CELLS,
  deRezMotion,
  deRezLogoRect,
  FRACTURE_MS,
  type DeRezCell,
} from './derez-motion'
const hex = (value: number) => '#' + value.toString(16).padStart(6, '0')
const energy = hex(COIN_CONFIG.long.color)
type Context = CanvasRenderingContext2D

/** Rasterize the original rim/logo/ticker once at the displayed device resolution.
 * This is a contact-local texture, released with its 520ms owner. */
function texture(
  size: number,
  logo: HTMLImageElement,
  symbol: string,
  rotation: number,
  angle: number,
  font: string
) {
  const image = document.createElement('canvas')
  image.width = image.height = size
  const ctx = image.getContext('2d')!
  ctx.setTransform(size / 72, 0, 0, size / 72, size / 2, size / 2)
  ctx.rotate(-angle)
  ctx.save()
  ctx.scale(0.9083, 0.9083)
  ctx.rotate(rotation)
  const circle = (radius: number) => {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
  }
  ctx.strokeStyle = energy
  ctx.globalAlpha = 0.018
  for (let i = 6; i > 0; i--) {
    circle(30)
    ctx.lineWidth = i
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  circle(30)
  ctx.fillStyle = '#0a0a0a'
  ctx.fill()
  ctx.globalAlpha = 0.8
  ctx.strokeStyle = hex(COIN_CONFIG.long.edgeColor)
  ctx.lineWidth = 0.65
  ctx.stroke()
  ctx.globalAlpha = 1
  circle(27)
  ctx.fillStyle = hex(COIN_CONFIG.long.darkCore)
  ctx.fill()
  ctx.strokeStyle = energy
  ctx.lineWidth = 2.2
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.07
    ctx.beginPath()
    ctx.arc(0, 0, 28, a, a + Math.PI / 4 - 0.14)
    ctx.stroke()
  }
  circle(22)
  ctx.lineWidth = 0.55
  ctx.globalAlpha = 0.45
  ctx.stroke()
  ctx.restore()
  const chamber = ctx.createRadialGradient(-4.35, -11.55, 0, -4.35, -11.55, 14.5)
  chamber.addColorStop(0, '#ffffff')
  chamber.addColorStop(1, '#e7edf0')
  ctx.beginPath()
  ctx.arc(0, -4.3, 14.5, 0, Math.PI * 2)
  ctx.fillStyle = chamber
  ctx.fill()
  if (logo.complete && logo.naturalWidth) {
    const rect = deRezLogoRect(logo.naturalWidth, logo.naturalHeight)
    ctx.drawImage(logo, rect.x, rect.y, rect.width, rect.height)
  }
  ctx.font = `800 5.8px ${font}`
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(symbol, 0, 16.5)
  return image
}
function draw(ctx: Context, image: HTMLCanvasElement, elapsed: number, angle: number) {
  const size = ctx.canvas.width
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, size, size)
  if (elapsed < FRACTURE_MS) return
  const motion = deRezMotion(elapsed),
    ratio = image.width / 72
  ctx.setTransform(size / 72, 0, 0, size / 72, size / 2, size / 2)
  ctx.rotate(angle)
  const render = (cell: DeRezCell, parent: DeRezCell | null, level: number) => {
    const phase = level === 0 ? motion.coarse : level === 1 ? motion.medium : motion.fine
    const side = cell.cy < 0 ? -1 : 1
    const dx = parent ? (cell.cx - parent.cx) * 0.075 * phase : cell.cx * 0.04 * phase
    const dy = parent ? (cell.cy - parent.cy) * 0.075 * phase : cell.cy * 0.04 * phase
    const rotation = ((cell.hash - 0.5) * (level === 2 ? 8 : 2) * phase * Math.PI) / 180
    const scale =
      level === 2
        ? 1 - motion.fine - cell.hash * 0.1 * motion.fineCurve
        : 1 - (level === 0 ? 0.1 : 0.16) * phase
    ctx.save()
    // Continue the two DOM halves around the same cut origin at 90ms.
    if (level === 0) {
      ctx.translate(side * 0.72 * motion.fracture, side * 3.6 * motion.fracture)
      ctx.rotate(side * 0.03 * motion.fracture)
    }
    ctx.translate(cell.cx + dx, cell.cy + dy)
    ctx.rotate(rotation)
    ctx.scale(scale, scale)
    ctx.translate(-cell.cx, -cell.cy)
    if (cell.children.length && elapsed >= (level === 0 ? 210 : 340)) {
      for (const child of cell.children) render(child, cell, level + 1)
    } else {
      // A tiny overlap prevents antialias seams before the next subdivision.
      const x = cell.x - 0.15,
        y = cell.y - 0.15,
        width = cell.width + 0.3,
        height = cell.height + 0.3
      ctx.globalAlpha = 1 - motion.energy
      if (motion.energy < 1)
        ctx.drawImage(
          image,
          (x + 36) * ratio,
          (y + 36) * ratio,
          width * ratio,
          height * ratio,
          x,
          y,
          width,
          height
        )
      if (motion.energy > 0) {
        ctx.globalAlpha = motion.energy
        ctx.fillStyle = energy
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height)
        ctx.strokeStyle = energy
        ctx.lineWidth = 0.3
        ctx.strokeRect(cell.x, cell.y, cell.width, cell.height)
      }
    }
    if (cell.children.length) {
      ctx.globalAlpha =
        level === 0
          ? 0.8 * motion.coarse * (1 - motion.medium)
          : 0.8 * motion.medium * (1 - motion.energy)
      ctx.strokeStyle = energy
      ctx.lineWidth = 0.55
      ctx.strokeRect(cell.x, cell.y, cell.width, cell.height)
    }
    ctx.restore()
  }
  for (const cell of DEREZ_CELLS) render(cell, null, 0)
}
export function DeRezCanvas({
  elapsed,
  symbol,
  rotation,
  angle,
}: {
  elapsed: number
  symbol: string
  rotation: number
  angle: number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const raster = useRef<HTMLCanvasElement | null>(null)
  const latest = useRef(elapsed)
  latest.current = elapsed
  useLayoutEffect(() => {
    const target = canvas.current!,
      ctx = target.getContext('2d')!
    const logo = new Image()
    let disposed = false,
      rasterSize = 0,
      rasterLogo = false
    const font =
      getComputedStyle(target).getPropertyValue('--font-orbitron').trim() || 'Orbitron, sans-serif'
    const paint = () => {
      if (!disposed && !document.hidden && raster.current)
        draw(ctx, raster.current, latest.current, angle)
    }
    const prepare = () => {
      if (disposed) return
      const size = Math.max(1, Math.round(target.getBoundingClientRect().width * devicePixelRatio))
      const ready = logo.complete && logo.naturalWidth > 0
      if (size !== rasterSize || ready !== rasterLogo || !raster.current) {
        if (target.width !== size) target.width = target.height = size
        raster.current = texture(size, logo, symbol, rotation, angle, font)
        rasterSize = size
        rasterLogo = ready
      }
      paint()
    }
    logo.onload = prepare
    logo.src = stockAsset(symbol)!.logo
    const observer = new ResizeObserver(prepare)
    observer.observe(target)
    prepare()
    return () => {
      disposed = true
      logo.onload = null
      observer.disconnect()
      raster.current = null
      target.width = target.height = 0
    }
  }, [symbol, rotation, angle])
  useLayoutEffect(() => {
    if (raster.current && canvas.current && !document.hidden)
      draw(canvas.current.getContext('2d')!, raster.current, elapsed, angle)
  }, [elapsed, angle])
  return (
    <canvas
      ref={canvas}
      className="ninja-contact-mark"
      aria-hidden="true"
      style={{ visibility: elapsed < FRACTURE_MS ? 'hidden' : 'visible' }}
    />
  )
}
