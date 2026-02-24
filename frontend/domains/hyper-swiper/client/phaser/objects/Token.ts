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

    // Store initial position for incremental spatial grid updates
    this.setData('oldX', x)
    this.setData('oldY', y)

    // Store velocities for manual delta-based movement
    this.velocityX = velocityX
    this.velocityY = velocityY
    this.gravity = 25
    this.angularVelocity = rotationSpeed * 120

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

  preUpdate(_time: number, delta: number): void {
    if (!this.active) return

    const clampedDelta = Math.max(4, Math.min(50, delta))
    const deltaSeconds = clampedDelta / 1000

    this.velocityY += this.gravity * deltaSeconds

    this.x += this.velocityX * deltaSeconds
    this.y += this.velocityY * deltaSeconds

    this.angle += this.angularVelocity * deltaSeconds

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

    // Tron-style glow: sharper, more digital falloff
    const glowRadius = config.radius * 4 * 1.35 // Larger glow for more presence
    const steps = 10
    for (let i = steps; i > 0; i--) {
      const t = i / steps
      const r = glowRadius * t
      // Exponential falloff for that digital Tron look
      const opacity = 0.12 * Math.pow(1 - t, 2.5)
      this.glowGraphics.fillStyle(config.glowColor ?? config.color, opacity)
      this.glowGraphics.fillCircle(0, 0, r)
    }
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
  private startBreathing(targetScale: number): void {
    if (this.breatheTween) {
      this.breatheTween.destroy()
      this.breatheTween = undefined
    }

    this.breatheTween = this.scene.tweens.add({
      targets: this,
      scale: targetScale * 1.03,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  private playSpawnAnimation(targetScale: number): void {
    this.cleanupTweens()

    const sceneHeight = this.scene.cameras.main.height
    const isBottomToss = this.y > sceneHeight

    if (isBottomToss) {
      // Fruit Ninja-style throw emphasis
      this.spawnScaleTween = this.scene.tweens.add({
        targets: this,
        scale: targetScale,
        duration: 100,
        ease: 'Back.easeOut',
        onComplete: () => {
          const tolerance = 0.01
          if (Math.abs(this.scale - targetScale) > tolerance) {
            this.setScale(targetScale)
          }
          // Start idle breathing after spawn completes
          this.startBreathing(targetScale)
        },
      })
    } else {
      // Legacy falling animation: elastic pop-in
      this.spawnScaleTween = this.scene.tweens.add({
        targets: this,
        scale: targetScale * 1.2,
        duration: 150,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.yoyoScaleTween = this.scene.tweens.add({
            targets: this,
            scale: targetScale,
            duration: 100,
            ease: 'Power2',
            onComplete: () => {
              const tolerance = 0.01
              if (Math.abs(this.scale - targetScale) > tolerance) {
                this.setScale(targetScale)
              }
              // Start idle breathing after spawn completes
              this.startBreathing(targetScale)
            },
          })
        },
      })
    }

    // Initial rotation burst (±90 degrees)
    const rotationBurst = Phaser.Math.FloatBetween(-Math.PI / 2, Math.PI / 2)
    this.spawnRotationTween = this.scene.tweens.add({
      targets: this,
      angle: rotationBurst * (180 / Math.PI),
      duration: 200,
      ease: 'Power2.easeOut',
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
