'use client'

import React, { useEffect, useRef } from 'react'

/**
 * Lightweight infinity tunnel grid using a 2D canvas with manual perspective projection.
 * Zero Three.js / postprocessing overhead. Runs at a throttled FPS.
 *
 * Geometry:
 *  - A box tunnel is defined in "world" units: W wide, H tall, DEPTH deep.
 *  - Lines run in Z (depth) direction at regular intervals on each face.
 *  - Each face also has lines running perpendicular (grid cross lines).
 *  - All points are projected to 2D using a simple perspective divide.
 *  - Floor, left wall, and right wall draw opaque background fills first, then the grid.
 *
 * Responsive:
 *  - Detects portrait/landscape orientation
 *  - Adjusts tunnel dimensions for optimal depth perception
 */

interface Props {
  lineColor?: string
  bgColor?: string
  maxFps?: number
}

export function TestGridBackground({
  lineColor = '#00d0ff',
  bgColor = '#020205',
  maxFps = 30,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // ── Tunnel geometry constants ────────────────────────────────────────────
    const DEPTH = 1 // Near Z (camera is just in front of 0)
    const FAR = 20 // Far Z (vanishing point region)
    const GRID = 1 // Grid cell size in world units

    // Base half-width and half-height of the tunnel (world units)
    // These will be adjusted based on orientation
    const BASE_HW = 3.5 // half-width  (side walls at ±HW)
    const BASE_HH = 2.5 // half-height (floor at -HH, ceiling at +HH)

    // ── How many grid lines along depth ─────────────────────────────────────
    const zSteps = Math.ceil((FAR - DEPTH) / GRID) + 1

    // ── Helper: perspective project a 3D point to canvas 2D ─────────────────
    // Camera at origin, looking down -Z.
    // fov factor: higher = narrower (more zoomed in).
    // Using 0.8 for stronger perspective effect
    const fov = 0.8

    function project(
      x: number,
      y: number,
      z: number,
      W: number,
      H: number,
      isPortrait: boolean
    ): [number, number] {
      const cx = W / 2
      const cy = H / 2
      const scale = fov / z // perspective divide

      if (isPortrait) {
        // Rotate 90° for portrait: swap and negate appropriately
        // Original: x goes right, y goes up
        // Portrait: x goes up, y goes left (rotated view)
        return [
          cy - y * scale * W, // use W for consistent FOV in portrait
          cx + x * scale * W,
        ]
      }

      return [
        cx + x * scale * H, // use H so FOV is consistent across aspect ratios
        cy - y * scale * H,
      ]
    }

    // ── Draw function (called once per frame) ────────────────────────────────
    function draw() {
      const W = canvas!.width
      const H = canvas!.height

      // Detect orientation
      const isPortrait = W < H

      // Adjust tunnel dimensions based on orientation
      // In portrait, we want a taller/narrower tunnel for better depth
      const HW = isPortrait ? BASE_HH : BASE_HW
      const HH = isPortrait ? BASE_HW : BASE_HH

      // Clear background
      ctx!.fillStyle = bgColor
      ctx!.fillRect(0, 0, W, H)

      // ─ Draw floor fill (opaque dark slab so floor is not transparent) ──────
      // Project the 4 corners of the floor at near and far Z
      const floorNearL = project(-HW, -HH, DEPTH, W, H, isPortrait)
      const floorNearR = project(HW, -HH, DEPTH, W, H, isPortrait)
      const floorFarL = project(-HW, -HH, FAR, W, H, isPortrait)
      const floorFarR = project(HW, -HH, FAR, W, H, isPortrait)

      ctx!.beginPath()
      ctx!.moveTo(floorNearL[0], floorNearL[1])
      ctx!.lineTo(floorNearR[0], floorNearR[1])
      ctx!.lineTo(floorFarR[0], floorFarR[1])
      ctx!.lineTo(floorFarL[0], floorFarL[1])
      ctx!.closePath()
      ctx!.fillStyle = '#010108'
      ctx!.fill()

      // ─ Draw left wall fill (creates visible wall surface for depth) ────────
      const leftNearB = project(-HW, -HH, DEPTH, W, H, isPortrait)
      const leftNearT = project(-HW, HH, DEPTH, W, H, isPortrait)
      const leftFarB = project(-HW, -HH, FAR, W, H, isPortrait)
      const leftFarT = project(-HW, HH, FAR, W, H, isPortrait)

      ctx!.beginPath()
      ctx!.moveTo(leftNearB[0], leftNearB[1])
      ctx!.lineTo(leftNearT[0], leftNearT[1])
      ctx!.lineTo(leftFarT[0], leftFarT[1])
      ctx!.lineTo(leftFarB[0], leftFarB[1])
      ctx!.closePath()
      ctx!.fillStyle = '#010106' // Slightly different shade for depth distinction
      ctx!.fill()

      // ─ Draw right wall fill (creates visible wall surface for depth) ───────
      const rightNearB = project(HW, -HH, DEPTH, W, H, isPortrait)
      const rightNearT = project(HW, HH, DEPTH, W, H, isPortrait)
      const rightFarB = project(HW, -HH, FAR, W, H, isPortrait)
      const rightFarT = project(HW, HH, FAR, W, H, isPortrait)

      ctx!.beginPath()
      ctx!.moveTo(rightNearB[0], rightNearB[1])
      ctx!.lineTo(rightNearT[0], rightNearT[1])
      ctx!.lineTo(rightFarT[0], rightFarT[1])
      ctx!.lineTo(rightFarB[0], rightFarB[1])
      ctx!.closePath()
      ctx!.fillStyle = '#010106'
      ctx!.fill()

      // ─ Draw ceiling fill (completes the tunnel effect) ─────────────────────
      const ceilNearL = project(-HW, HH, DEPTH, W, H, isPortrait)
      const ceilNearR = project(HW, HH, DEPTH, W, H, isPortrait)
      const ceilFarL = project(-HW, HH, FAR, W, H, isPortrait)
      const ceilFarR = project(HW, HH, FAR, W, H, isPortrait)

      ctx!.beginPath()
      ctx!.moveTo(ceilNearL[0], ceilNearL[1])
      ctx!.lineTo(ceilNearR[0], ceilNearR[1])
      ctx!.lineTo(ceilFarR[0], ceilFarR[1])
      ctx!.lineTo(ceilFarL[0], ceilFarL[1])
      ctx!.closePath()
      ctx!.fillStyle = '#010104' // Darkest for ceiling (furthest visual plane)
      ctx!.fill()

      // ─ Collect all line segments to draw with depth-based alpha ────────────
      type Segment = {
        ax: number
        ay: number
        bx: number
        by: number
        alpha: number
        color: string
      }
      const segments: Segment[] = []

      // Helper: push a segment, applying depth-based alpha gradient
      const addLine = (
        x0: number,
        y0: number,
        z0: number,
        x1: number,
        y1: number,
        z1: number,
        color: string,
        baseAlpha = 0.7
      ) => {
        const [ax, ay] = project(x0, y0, z0, W, H, isPortrait)
        const [bx, by] = project(x1, y1, z1, W, H, isPortrait)

        // Calculate depth-based alpha: fade lines as they get further away
        const avgZ = (z0 + z1) / 2
        const zNorm = (avgZ - DEPTH) / (FAR - DEPTH) // 0 at near, 1 at far
        const depthAlpha = 1 - zNorm * 0.6 // Fade to 40% at far end

        segments.push({ ax, ay, bx, by, alpha: baseAlpha * depthAlpha, color })
      }

      // ── Z-direction lines (depth "rails") on each face ──────────────────────
      const zRange: Array<[number, number]> = [[DEPTH, FAR]]

      // Floor and Ceiling: lines running along Z at regular X intervals
      for (let xi = -Math.ceil(HW / GRID); xi <= Math.ceil(HW / GRID); xi++) {
        const x = xi * GRID
        if (Math.abs(x) > HW) continue
        // Floor
        addLine(x, -HH, DEPTH, x, -HH, FAR, lineColor)
        // Ceiling
        addLine(x, HH, DEPTH, x, HH, FAR, lineColor)
      }

      // Walls: lines running along Z at regular Y intervals
      for (let yi = -Math.ceil(HH / GRID); yi <= Math.ceil(HH / GRID); yi++) {
        const y = yi * GRID
        if (Math.abs(y) > HH) continue
        // Left wall
        addLine(-HW, y, DEPTH, -HW, y, FAR, lineColor)
        // Right wall
        addLine(HW, y, DEPTH, HW, y, FAR, lineColor)
      }

      // ── Cross-lines (perpendicular to Z) on each face ────────────────────────
      for (let zi = 0; zi < zSteps; zi++) {
        const z = DEPTH + zi * GRID
        if (z > FAR) break

        // Floor cross-lines
        addLine(-HW, -HH, z, HW, -HH, z, lineColor)
        // Ceiling cross-lines
        addLine(-HW, HH, z, HW, HH, z, lineColor)
        // Left wall cross-lines
        addLine(-HW, -HH, z, -HW, HH, z, lineColor)
        // Right wall cross-lines
        addLine(HW, -HH, z, HW, HH, z, lineColor)
      }

      // ── Corner edges (the 4 long vertical/horizontal lines ) ─────────────────
      addLine(-HW, -HH, DEPTH, -HW, -HH, FAR, lineColor, 0.85)
      addLine(HW, -HH, DEPTH, HW, -HH, FAR, lineColor, 0.85)
      addLine(-HW, HH, DEPTH, -HW, HH, FAR, lineColor, 0.85)
      addLine(HW, HH, DEPTH, HW, HH, FAR, lineColor, 0.85)

      // ── Render all segments ───────────────────────────────────────────────────
      for (const s of segments) {
        ctx!.globalAlpha = s.alpha
        ctx!.strokeStyle = s.color
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.moveTo(s.ax, s.ay)
        ctx!.lineTo(s.bx, s.by)
        ctx!.stroke()
      }

      ctx!.globalAlpha = 1
    }

    // ── Resize handler ────────────────────────────────────────────────────────
    function resize() {
      if (!canvas || !canvas.parentElement) return
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
      draw() // Redraw immediately on resize for responsive feel
    }

    resize()
    window.addEventListener('resize', resize)

    // ── Throttled RAF loop ────────────────────────────────────────────────────
    let rafId: number
    let lastTime = 0
    const interval = 1000 / maxFps

    function tick(time: number) {
      rafId = requestAnimationFrame(tick)
      if (time - lastTime < interval) return
      lastTime = time
      draw()
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [lineColor, bgColor, maxFps])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
