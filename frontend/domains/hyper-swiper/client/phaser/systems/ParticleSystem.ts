import { Scene, GameObjects } from 'phaser'

interface TrailParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

// Tron-style geometric shard particle
interface ShardParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: number
  rotation: number
  rotationSpeed: number
  size: number
  // Shard type: 0 = triangle, 1 = voxel/square, 2 = small cube
  shardType: number
  // Phase: 0 = shatter (fast), 1 = float (slow), 2 = evaporate (shrink)
  phase: number
}

// Flash ring that expands outward on slice
interface FlashRing {
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
  maxLife: number
  color: number
}

export class ParticleSystem {
  private trailParticles: TrailParticle[] = []
  private shardParticles: ShardParticle[] = []
  private flashRings: FlashRing[] = []
  private readonly MAX_TRAIL = 50
  private readonly MAX_SHARDS = 150
  private readonly MAX_FLASH_RINGS = 8
  private trailGraphics: GameObjects.Graphics
  private shardGraphics: GameObjects.Graphics
  private flashGraphics: GameObjects.Graphics

  constructor(scene: Scene) {
    this.trailGraphics = scene.add.graphics()
    this.trailGraphics.setDepth(999)
    this.shardGraphics = scene.add.graphics()
    this.shardGraphics.setDepth(1001)
    this.flashGraphics = scene.add.graphics()
    this.flashGraphics.setDepth(1000)
  }

  emitTrail(x: number, y: number, count: number = 2): void {
    for (let i = 0; i < count; i++) {
      if (this.trailParticles.length >= this.MAX_TRAIL) break

      const angle = Math.random() * Math.PI * 2
      const speed = 50 + Math.random() * 50

      this.trailParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300,
        maxLife: 300,
      })
    }
  }

  /**
   * Emit Tron-style geometric shards on slice + expanding flash ring
   */
  emitSlice(x: number, y: number, color: number, count: number = 20): void {
    // Emit expanding flash ring
    if (this.flashRings.length < this.MAX_FLASH_RINGS) {
      this.flashRings.push({
        x,
        y,
        radius: 8,
        maxRadius: 60,
        life: 250,
        maxLife: 250,
        color,
      })
    }

    // Emit geometric shards
    const shardCount = Math.min(count, 18)

    for (let i = 0; i < shardCount; i++) {
      if (this.shardParticles.length >= this.MAX_SHARDS) break

      const angle = Math.random() * Math.PI * 2
      const speed = 90 + Math.random() * 200

      // Mix of shard types
      const shardType = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : 2

      // Slightly larger fragments for more impact
      const baseSize = shardType === 0 ? 4 + Math.random() * 6 : 3 + Math.random() * 4

      this.shardParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 700 + Math.random() * 400,
        maxLife: 700 + Math.random() * 400,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        size: baseSize,
        shardType,
        phase: 0,
      })
    }
  }

  update(delta: number): void {
    this.updateTrail(delta)
    this.updateShards(delta)
    this.updateFlashRings(delta)
  }

  private updateTrail(delta: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i]
      p.x += p.vx * (delta / 1000)
      p.y += p.vy * (delta / 1000)
      p.life -= delta

      if (p.life <= 0) {
        this.trailParticles.splice(i, 1)
      }
    }

    this.trailGraphics.clear()
    this.trailGraphics.setBlendMode(Phaser.BlendModes.ADD)

    for (const p of this.trailParticles) {
      const alpha = (p.life / p.maxLife) * 0.5
      const size = (p.life / p.maxLife) * 6

      this.trailGraphics.fillStyle(0xffffff, alpha)
      this.trailGraphics.fillCircle(p.x, p.y, size * 0.5)

      this.trailGraphics.fillStyle(0x00f3ff, alpha * 0.6)
      this.trailGraphics.fillCircle(p.x, p.y, size)
    }
  }

  private updateShards(delta: number): void {
    const dt = delta / 1000

    for (let i = this.shardParticles.length - 1; i >= 0; i--) {
      const p = this.shardParticles[i]
      const lifeRatio = p.life / p.maxLife

      // Phase transitions based on life
      if (lifeRatio < 0.3) {
        p.phase = 2
      } else if (lifeRatio < 0.6) {
        p.phase = 1
      }

      // Physics based on phase
      if (p.phase === 0) {
        p.vy += 50 * dt
        p.vx *= 0.98
        p.vy *= 0.98
      } else if (p.phase === 1) {
        p.vx *= 0.92
        p.vy *= 0.92
        p.vy -= 20 * dt
      } else {
        p.vx *= 0.85
        p.vy *= 0.85
        p.vy -= 40 * dt
        p.size *= 0.97
      }

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.rotationSpeed * dt
      p.life -= delta

      if (p.life <= 0 || p.size < 0.5) {
        this.shardParticles.splice(i, 1)
      }
    }

    // Draw shards
    this.shardGraphics.clear()
    this.shardGraphics.setBlendMode(Phaser.BlendModes.ADD)

    for (const p of this.shardParticles) {
      const lifeRatio = p.life / p.maxLife
      const alpha = Math.min(1, lifeRatio * 1.5) * 0.9
      const size = p.size

      if (p.shardType === 0) {
        this.drawTriangle(p.x, p.y, size, p.rotation, p.color, alpha)
      } else if (p.shardType === 1) {
        this.drawVoxel(p.x, p.y, size * 0.8, p.rotation, p.color, alpha)
      } else {
        this.drawCube(p.x, p.y, size * 0.5, p.color, alpha)
      }
    }
  }

  private updateFlashRings(delta: number): void {
    this.flashGraphics.clear()
    this.flashGraphics.setBlendMode(Phaser.BlendModes.ADD)

    for (let i = this.flashRings.length - 1; i >= 0; i--) {
      const ring = this.flashRings[i]
      ring.life -= delta

      if (ring.life <= 0) {
        this.flashRings.splice(i, 1)
        continue
      }

      const t = 1 - ring.life / ring.maxLife // 0 → 1 over lifetime
      ring.radius = 8 + (ring.maxRadius - 8) * Math.pow(t, 0.5) // Fast expand, slow at end

      const alpha = (1 - t) * 0.6

      // Outer colored ring
      this.flashGraphics.lineStyle(3 * (1 - t) + 1, ring.color, alpha * 0.6)
      this.flashGraphics.strokeCircle(ring.x, ring.y, ring.radius)

      // Inner white ring (brighter, thinner)
      this.flashGraphics.lineStyle(1.5 * (1 - t) + 0.5, 0xffffff, alpha)
      this.flashGraphics.strokeCircle(ring.x, ring.y, ring.radius * 0.7)

      // Soft glow fill at center (fades quickly)
      if (t < 0.4) {
        const fillAlpha = (0.4 - t) * 0.3
        this.flashGraphics.fillStyle(ring.color, fillAlpha)
        this.flashGraphics.fillCircle(ring.x, ring.y, ring.radius * 0.4)
      }
    }
  }

  private drawTriangle(
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: number,
    alpha: number
  ): void {
    // Outer glow triangle
    this.shardGraphics.fillStyle(color, alpha * 0.4)
    this.shardGraphics.beginPath()
    for (let i = 0; i < 3; i++) {
      const angle = rotation + (i * Math.PI * 2) / 3
      const px = x + Math.cos(angle) * size * 1.3
      const py = y + Math.sin(angle) * size * 1.3
      if (i === 0) this.shardGraphics.moveTo(px, py)
      else this.shardGraphics.lineTo(px, py)
    }
    this.shardGraphics.closePath()
    this.shardGraphics.fillPath()

    // Main triangle (colored)
    this.shardGraphics.fillStyle(color, alpha * 0.8)
    this.shardGraphics.beginPath()
    for (let i = 0; i < 3; i++) {
      const angle = rotation + (i * Math.PI * 2) / 3
      const px = x + Math.cos(angle) * size
      const py = y + Math.sin(angle) * size
      if (i === 0) this.shardGraphics.moveTo(px, py)
      else this.shardGraphics.lineTo(px, py)
    }
    this.shardGraphics.closePath()
    this.shardGraphics.fillPath()

    // White core highlight
    this.shardGraphics.fillStyle(0xffffff, alpha * 0.9)
    this.shardGraphics.beginPath()
    for (let i = 0; i < 3; i++) {
      const angle = rotation + (i * Math.PI * 2) / 3
      const px = x + Math.cos(angle) * size * 0.4
      const py = y + Math.sin(angle) * size * 0.4
      if (i === 0) this.shardGraphics.moveTo(px, py)
      else this.shardGraphics.lineTo(px, py)
    }
    this.shardGraphics.closePath()
    this.shardGraphics.fillPath()
  }

  private drawVoxel(
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: number,
    alpha: number
  ): void {
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    // Outer glow
    this.shardGraphics.fillStyle(color, alpha * 0.3)
    const glowSize = size * 1.4
    this.shardGraphics.beginPath()
    this.shardGraphics.moveTo(x + cos * glowSize, y + sin * glowSize)
    this.shardGraphics.lineTo(x - sin * glowSize, y + cos * glowSize)
    this.shardGraphics.lineTo(x - cos * glowSize, y - sin * glowSize)
    this.shardGraphics.lineTo(x + sin * glowSize, y - cos * glowSize)
    this.shardGraphics.closePath()
    this.shardGraphics.fillPath()

    // Main voxel
    this.shardGraphics.fillStyle(color, alpha * 0.7)
    this.shardGraphics.beginPath()
    this.shardGraphics.moveTo(x + cos * size, y + sin * size)
    this.shardGraphics.lineTo(x - sin * size, y + cos * size)
    this.shardGraphics.lineTo(x - cos * size, y - sin * size)
    this.shardGraphics.lineTo(x + sin * size, y - cos * size)
    this.shardGraphics.closePath()
    this.shardGraphics.fillPath()

    // White core
    this.shardGraphics.fillStyle(0xffffff, alpha * 0.8)
    const coreSize = size * 0.4
    this.shardGraphics.beginPath()
    this.shardGraphics.moveTo(x + cos * coreSize, y + sin * coreSize)
    this.shardGraphics.lineTo(x - sin * coreSize, y + cos * coreSize)
    this.shardGraphics.lineTo(x - cos * coreSize, y - sin * coreSize)
    this.shardGraphics.lineTo(x + sin * coreSize, y - cos * coreSize)
    this.shardGraphics.closePath()
    this.shardGraphics.fillPath()
  }

  private drawCube(x: number, y: number, size: number, color: number, alpha: number): void {
    // Glow
    this.shardGraphics.fillStyle(color, alpha * 0.4)
    this.shardGraphics.fillRect(x - size * 1.3, y - size * 1.3, size * 2.6, size * 2.6)

    // Main
    this.shardGraphics.fillStyle(color, alpha * 0.8)
    this.shardGraphics.fillRect(x - size, y - size, size * 2, size * 2)

    // Core
    this.shardGraphics.fillStyle(0xffffff, alpha)
    this.shardGraphics.fillRect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6)
  }

  destroy(): void {
    this.trailGraphics.destroy()
    this.shardGraphics.destroy()
    this.flashGraphics.destroy()
  }
}
