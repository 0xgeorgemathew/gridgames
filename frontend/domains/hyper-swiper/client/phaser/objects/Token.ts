import * as Phaser from 'phaser'
import { Scene, GameObjects, Physics, Tweens } from 'phaser'
import type { CoinType } from '@/domains/hyper-swiper/shared/trading.types'

interface CoinConfig {
  color: number
  glowColor: number
  coreColor?: number // Legacy - no longer used
  darkCore?: number // New Tron-style dark core
  edgeColor?: number
  rimColor?: number
  radius: number
  hitboxMultiplier?: number
  symbol: string
  label?: string
}

export class Token extends GameObjects.Container {
  public body: Physics.Arcade.Body | null = null
  private image: GameObjects.Image
  private config: CoinConfig
  private glowRing?: GameObjects.Graphics
  private spawnScaleTween?: Tweens.Tween
  private spawnRotationTween?: Tweens.Tween
  private yoyoScaleTween?: Tweens.Tween
  private breatheTween?: Tweens.Tween
  private glowGraphics?: GameObjects.Graphics

  private motionStartedAt = 0
  private motionOriginX = 0
  private motionOriginY = 0
  private velocityX: number = 0
  private velocityY: number = 0
  private gravity: number = 40
  private angularVelocity: number = 0

  constructor(scene: Scene) {
    super(scene, 0, 0)

    // Create image (texture set in spawn())
    this.image = scene.add.image(0, 0, 'texture_long')
    this.add(this.image)

    // Default config (will be overridden in spawn())
    this.config = {
      color: 0x00ffff,
      glowColor: 0x0088ff,
      coreColor: 0x0a0a10,
      radius: 28,
      symbol: '▲',
    }
  }

  /**
   * Initialize token with type and position.
   * Called by object pool when spawning.
   *
   * Fruit Ninja-style bottom toss:
   * - Spawn at y > sceneHeight for upward arc trajectory
   * - Upward velocity: -400 to -600 px/s (reaches 60-80% screen height)
   * - Horizontal drift: -50 to 50 px/s for variety
   * - Gravity: 180 pulls arc back down for satisfying parabola
   */
  spawn(
    x: number,
    y: number,
    type: CoinType,
    id: string,
    config: CoinConfig,
    isMobile: boolean,
    velocityX: number = 0,
    velocityY: number = 0
  ): void {
    this.config = config

    // Reset container state
    this.cleanupTweens()
    this.setAlpha(1)
    this.setAngle(0)
    this.setVisible(true)
    this.setActive(true)
    this.setDepth(10)
    this.image.setDepth(10)

    // Update texture with validation
    const textureKey = `texture_${type}`
    if (!this.scene.textures.exists(textureKey)) {
      console.error(`Missing texture: ${textureKey}, falling back to texture_long`)
      this.image.setTexture('texture_long')
    } else {
      this.image.setTexture(textureKey)
    }

    // Apply mobile scale
    const targetScale = isMobile ? 0.5 : 0.65
    const scale = targetScale

    // Store metadata
    this.setData('id', id)
    this.setData('claimPending', false)
    this.setData('type', type)

    // Determine rotation behavior based on coin type
    let rotationSpeed = 0.5

    switch (type) {
      case 'long':
        rotationSpeed = 0.5
        break
      case 'short':
        rotationSpeed = -0.5
        break
    }

    this.setData('rotationSpeed', rotationSpeed)
    this.setData('spawnTime', this.scene.time.now)
    this.setData('baseScale', scale)

    this.motionStartedAt = performance.now()
    this.motionOriginX = x
    this.motionOriginY = y

    // Store velocities for manual delta-based movement
    this.velocityX = velocityX
    this.velocityY = velocityY
    this.gravity = 25
    this.angularVelocity = 0 // Direction marks must stay readable while the disc travels.

    // Ensure physics body is enabled for collision detection only
    if (!this.body) {
      this.scene.physics.add.existing(this)
      if (!this.body) {
        throw new Error('Failed to create physics body for Token')
      }
    }

    this.body.reset(x, y)
    this.body.setAcceleration(0, 0)
    this.body.setVelocity(0, 0)
    this.body.setBounce(0)
    this.body.setCollideWorldBounds(false)
    this.body.setGravity(0, 0)
    this.body.setDrag(0, 0)
    this.body.setAngularVelocity(0)

    // Hitbox: 85% of visual size (forgiving slicing), with hitbox multiplier
    const RENDER_SCALE = 4
    const hitboxRadius =
      config.radius * RENDER_SCALE * 0.85 * scale * (config.hitboxMultiplier ?? 1.0)
    this.body.setCircle(hitboxRadius)

    // Start at minimum visible scale (prevents stuck-at-0)
    this.setScale(scale * 0.1)

    // Create or update ambient glow underneath
    this.createAmbientGlow(config, scale)

    // Play spawn animation (elastic scale-in + rotation burst)
    this.playSpawnAnimation(scale)
  }

  preUpdate(_time: number, _delta: number): void {
    if (!this.active) return

    const age = Math.max(0, performance.now() - this.motionStartedAt)
    const life = (this.getData('lifetimeMs') as number | undefined) ?? 5000
    // Hidden tabs can skip seconds. Hide elapsed art rather than running a huge
    // catch-up step; only the server expiry message consumes the coin identity.
    if (age >= life) {
      this.setVisible(false)
      return
    }
    const seconds = age / 1000
    this.x = this.motionOriginX + this.velocityX * seconds
    this.y = this.motionOriginY + this.velocityY * seconds + 0.5 * this.gravity * seconds * seconds
    this.angle = this.angularVelocity * seconds
    const fade = Math.max(0.25, 1 - Math.max(0, age / life - 0.8) * 3.75)
    this.setAlpha((this.getData('claimPending') ? 0.65 : 1) * fade)

    if (this.body) {
      this.body.position.x = this.x - this.body.width / 2
      this.body.position.y = this.y - this.body.height / 2
    }
  }

  /**
   * Create a Tron-style neon glow halo beneath the coin
   * Sharp, digital glow with exponential falloff
   */
  private createAmbientGlow(config: CoinConfig, scale: number): void {
    if (!this.glowGraphics) {
      this.glowGraphics = this.scene.add.graphics()
      this.addAt(this.glowGraphics, 0) // Add behind the image
    }

    this.glowGraphics.clear()
    this.glowGraphics.setVisible(true)
    this.glowGraphics.setAlpha(1)

    // Static local exhaust follows the parent transform. Draw only on spawn.
    this.glowGraphics.lineStyle(4, config.color, 0.12)
    this.glowGraphics.lineBetween(-12, 44, -12, 74)
    this.glowGraphics.lineBetween(12, 44, 12, 74)
  }

  private cleanupTweens(): void {
    if (this.spawnScaleTween) {
      this.spawnScaleTween.destroy()
      this.spawnScaleTween = undefined
    }
    if (this.spawnRotationTween) {
      this.spawnRotationTween.destroy()
      this.spawnRotationTween = undefined
    }
    if (this.yoyoScaleTween) {
      this.yoyoScaleTween.destroy()
      this.yoyoScaleTween = undefined
    }
    if (this.breatheTween) {
      this.breatheTween.destroy()
      this.breatheTween = undefined
    }
  }

  /**
   * Start a gentle idle breathing scale pulse.
   * ±3% scale oscillation for a living, premium feel.
   */
  private playSpawnAnimation(targetScale: number): void {
    this.cleanupTweens()
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      this.setScale(targetScale)
      return
    }
    this.spawnScaleTween = this.scene.tweens.add({
      targets: this,
      scale: targetScale,
      duration: 140,
      ease: 'Cubic.out',
    })
  }

  /**
   * Handle slice event - play death animation then return to pool.
   */
  onSlice(): void {
    this.cleanupTweens()

    this.setActive(false)
    this.setVisible(false)

    // Reset manual velocities
    this.velocityX = 0
    this.velocityY = 0
    this.angularVelocity = 0

    // Hide ambient glow
    if (this.glowGraphics) {
      this.glowGraphics.setVisible(false)
    }

    if (this.body) {
      this.body.stop()
      this.body.setVelocity(0, 0)
      this.body.setGravity(0, 0)
      this.body.setAngularVelocity(0)
    }
  }

  /**
   * Cleanup when token is destroyed (scene shutdown).
   * Ensures all tweens are properly destroyed.
   */
  destroy(): void {
    this.cleanupTweens()

    if (this.glowRing) {
      this.glowRing.destroy()
      this.glowRing = undefined
    }

    if (this.glowGraphics) {
      this.glowGraphics.destroy()
      this.glowGraphics = undefined
    }

    this.image = null as any

    super.destroy()
  }
}
