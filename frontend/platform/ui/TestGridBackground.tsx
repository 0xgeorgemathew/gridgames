'use client'

import React, { useEffect, useRef } from 'react'

interface Props {
  lineColor?: string
  bgColor?: string
}

type Segment = {
  ax: number
  ay: number
  bx: number
  by: number
  alpha: number
  depth: number
}

type TunnelConfig = {
  halfWidth: number
  halfHeight: number
  nearZ: number
  farZ: number
  xStep: number
  yStep: number
  zStep: number
  vanishingY: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildAxisValues(limit: number, step: number) {
  const values: number[] = []
  const start = -Math.floor(limit / step) * step

  for (let value = start; value <= limit + step * 0.5; value += step) {
    const snapped = Math.abs(value) > limit ? Math.sign(value) * limit : value
    const rounded = Number(snapped.toFixed(4))

    if (values.length === 0 || Math.abs(values[values.length - 1] - rounded) > 0.0001) {
      values.push(rounded)
    }
  }

  if (values.length === 0 || values[values.length - 1] < limit - 0.0001) {
    values.push(Number(limit.toFixed(4)))
  }

  if (values[0] > -limit + 0.0001) {
    values.unshift(Number((-limit).toFixed(4)))
  }

  return values
}

export function TestGridBackground({ lineColor = '#00d3ff', bgColor = '#020205' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const parent = canvas.parentElement
      if (!parent) return

      const width = Math.max(1, Math.round(parent.clientWidth))
      const height = Math.max(1, Math.round(parent.clientHeight))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const isPortrait = height >= width
      const aspectRatio = height / width
      const config: TunnelConfig = isPortrait
        ? {
            halfWidth: 1.5,
            halfHeight: 2.85,
            nearZ: 4.15,
            farZ: 32,
            xStep: 0.375,
            yStep: 0.52,
            zStep: 1.65,
            vanishingY: clamp(0.45 - (aspectRatio - 1.8) * 0.03, 0.42, 0.45),
          }
        : {
            halfWidth: 3.6,
            halfHeight: 1.65,
            nearZ: 5.4,
            farZ: 30,
            xStep: 0.48,
            yStep: 0.4,
            zStep: 1.55,
            vanishingY: 0.47,
          }

      const cx = width * 0.5
      const cy = height * config.vanishingY
      const overscanX = width * 0.05
      const overscanTop = height * 0.04
      const overscanBottom = height * 0.08
      const focal = Math.max(
        ((width * 0.5 + overscanX) * config.nearZ) / config.halfWidth,
        ((cy + overscanTop) * config.nearZ) / config.halfHeight,
        ((height - cy + overscanBottom) * config.nearZ) / config.halfHeight
      )

      const project = (x: number, y: number, z: number): [number, number] => {
        const scale = focal / z
        return [cx + x * scale, cy - y * scale]
      }

      const makeQuad = (
        a: [number, number],
        b: [number, number],
        c: [number, number],
        d: [number, number]
      ) => [a, b, c, d]

      const fillQuad = (points: Array<[number, number]>, color: string) => {
        ctx.beginPath()
        ctx.moveTo(points[0][0], points[0][1])
        for (let index = 1; index < points.length; index += 1) {
          ctx.lineTo(points[index][0], points[index][1])
        }
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
      }

      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)

      const floorNearLeft = project(-config.halfWidth, -config.halfHeight, config.nearZ)
      const floorNearRight = project(config.halfWidth, -config.halfHeight, config.nearZ)
      const floorFarLeft = project(-config.halfWidth, -config.halfHeight, config.farZ)
      const floorFarRight = project(config.halfWidth, -config.halfHeight, config.farZ)

      const ceilingNearLeft = project(-config.halfWidth, config.halfHeight, config.nearZ)
      const ceilingNearRight = project(config.halfWidth, config.halfHeight, config.nearZ)
      const ceilingFarLeft = project(-config.halfWidth, config.halfHeight, config.farZ)
      const ceilingFarRight = project(config.halfWidth, config.halfHeight, config.farZ)

      const leftNearBottom = project(-config.halfWidth, -config.halfHeight, config.nearZ)
      const leftNearTop = project(-config.halfWidth, config.halfHeight, config.nearZ)
      const leftFarBottom = project(-config.halfWidth, -config.halfHeight, config.farZ)
      const leftFarTop = project(-config.halfWidth, config.halfHeight, config.farZ)

      const rightNearBottom = project(config.halfWidth, -config.halfHeight, config.nearZ)
      const rightNearTop = project(config.halfWidth, config.halfHeight, config.nearZ)
      const rightFarBottom = project(config.halfWidth, -config.halfHeight, config.farZ)
      const rightFarTop = project(config.halfWidth, config.halfHeight, config.farZ)

      fillQuad(makeQuad(floorNearLeft, floorNearRight, floorFarRight, floorFarLeft), '#01040a')
      fillQuad(makeQuad(leftNearBottom, leftNearTop, leftFarTop, leftFarBottom), '#01050b')
      fillQuad(makeQuad(rightNearBottom, rightNearTop, rightFarTop, rightFarBottom), '#01050b')
      fillQuad(
        makeQuad(ceilingNearLeft, ceilingNearRight, ceilingFarRight, ceilingFarLeft),
        '#000308'
      )

      const segments: Segment[] = []
      const depthSpan = config.farZ - config.nearZ

      const addSegment = (
        x0: number,
        y0: number,
        z0: number,
        x1: number,
        y1: number,
        z1: number,
        alphaBoost = 1
      ) => {
        const [ax, ay] = project(x0, y0, z0)
        const [bx, by] = project(x1, y1, z1)
        const averageDepth = (z0 + z1) * 0.5
        const depthRatio = clamp((averageDepth - config.nearZ) / depthSpan, 0, 1)
        const alpha = clamp((0.8 - depthRatio * 0.45) * alphaBoost, 0.12, 0.95)

        segments.push({ ax, ay, bx, by, alpha, depth: averageDepth })
      }

      const xValues = buildAxisValues(config.halfWidth, config.xStep)
      const yValues = buildAxisValues(config.halfHeight, config.yStep)
      const innerXValues = xValues.filter(
        (value) => Math.abs(Math.abs(value) - config.halfWidth) > 0.0001
      )
      const innerYValues = yValues.filter(
        (value) => Math.abs(Math.abs(value) - config.halfHeight) > 0.0001
      )

      for (const x of innerXValues) {
        addSegment(x, -config.halfHeight, config.nearZ, x, -config.halfHeight, config.farZ)
        addSegment(x, config.halfHeight, config.nearZ, x, config.halfHeight, config.farZ)
      }

      for (const y of innerYValues) {
        addSegment(-config.halfWidth, y, config.nearZ, -config.halfWidth, y, config.farZ)
        addSegment(config.halfWidth, y, config.nearZ, config.halfWidth, y, config.farZ)
      }

      for (let z = config.nearZ; z <= config.farZ + config.zStep * 0.5; z += config.zStep) {
        const depth = Math.min(z, config.farZ)
        addSegment(
          -config.halfWidth,
          -config.halfHeight,
          depth,
          config.halfWidth,
          -config.halfHeight,
          depth
        )
        addSegment(
          -config.halfWidth,
          config.halfHeight,
          depth,
          config.halfWidth,
          config.halfHeight,
          depth
        )
        addSegment(
          -config.halfWidth,
          -config.halfHeight,
          depth,
          -config.halfWidth,
          config.halfHeight,
          depth
        )
        addSegment(
          config.halfWidth,
          -config.halfHeight,
          depth,
          config.halfWidth,
          config.halfHeight,
          depth
        )
      }

      addSegment(
        -config.halfWidth,
        -config.halfHeight,
        config.nearZ,
        -config.halfWidth,
        -config.halfHeight,
        config.farZ
      )
      addSegment(
        config.halfWidth,
        -config.halfHeight,
        config.nearZ,
        config.halfWidth,
        -config.halfHeight,
        config.farZ
      )
      addSegment(
        -config.halfWidth,
        config.halfHeight,
        config.nearZ,
        -config.halfWidth,
        config.halfHeight,
        config.farZ
      )
      addSegment(
        config.halfWidth,
        config.halfHeight,
        config.nearZ,
        config.halfWidth,
        config.halfHeight,
        config.farZ
      )

      segments.sort((left, right) => right.depth - left.depth)

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (const segment of segments) {
        ctx.globalAlpha = segment.alpha * 0.16
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 2.6
        ctx.beginPath()
        ctx.moveTo(segment.ax, segment.ay)
        ctx.lineTo(segment.bx, segment.by)
        ctx.stroke()
      }

      for (const segment of segments) {
        ctx.globalAlpha = segment.alpha
        ctx.strokeStyle = lineColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(segment.ax, segment.ay)
        ctx.lineTo(segment.bx, segment.by)
        ctx.stroke()
      }

      const vignette = ctx.createLinearGradient(0, 0, 0, height)
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0.14)')
      vignette.addColorStop(0.3, 'rgba(0, 0, 0, 0.02)')
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.18)')
      ctx.globalAlpha = 1
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)
    }

    draw()

    const resizeObserver = new ResizeObserver(() => {
      draw()
    })

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
    }

    window.addEventListener('resize', draw)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', draw)
    }
  }, [bgColor, lineColor])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
