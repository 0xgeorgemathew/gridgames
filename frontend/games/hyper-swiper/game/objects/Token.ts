import { Scene, GameObjects, Physics, Tweens } from 'phaser'
import type { CoinType } from '../types/trading'

interface CoinConfig {
  color: number
  glowColor: number
  coreColor: number
  radius: number
  hitboxMultiplier?: number // Hitbox size multiplier (default 1.0)
  symbol: string
}

export class Token extends GameObjects.Container {
  public body: Physics.Arcade.Body | null = null
  private image: GameObjects.Image
  private config: CoinConfig
  private glowRing?: GameObjects.Graphics
  private spawnScaleTween?: Tweens.Tween
  private spawnRotationTween?: Tweens.Tween
  private yoyoScaleTween?: Tweens.Tween // Track nested tween for cleanup

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
      symbol: '₿',
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
    this.setDepth(10) // Render above grid (depth -1) and below blade (depth 1000)
    this.image.setDepth(10) // Ensure image inherits depth

    // Update texture with validation
    const textureKey = `texture_${type}`
    if (!this.scene.textures.exists(textureKey)) {
      console.error(`Missing texture: ${textureKey}, falling back to texture_long`)
      this.image.setTexture('texture_long')
    } else {
      this.image.setTexture(textureKey)
    }

    // Apply mobile scale (0.5x on mobile for optimized iPhone 14 Pro Max tap/slice targets)
    const targetScale = isMobile ? 0.5 : 0.65
    const scale = targetScale

    // Store metadata
    this.setData('id', id)
    this.setData('type', type)

    // Determine rotation behavior based on coin type
    let rotationSpeed = 0.5 // Default clockwise for LONG

    switch (type) {
      case 'long':
        rotationSpeed = 0.5 // Clockwise
        break
      case 'short':
        rotationSpeed = -0.5 // Counter-clockwise
        break
    }

    this.setData('rotationSpeed', rotationSpeed)
    this.setData('spawnTime', this.scene.time.now)
    this.setData('baseScale', scale)

    // Store initial position for incremental spatial grid updates
    this.setData('oldX', x)
    this.setData('oldY', y)

    // Ensure physics body is enabled
    if (!this.body) {
      this.scene.physics.add.existing(this)
      // Verify body was actually created (physics.add.existing can fail)
      if (!this.body) {
        throw new Error('Failed to create physics body for Token')
      }
    }

    // Reset physics state (clear accumulated forces)
    this.body.reset(x, y)
    this.body.setAcceleration(0, 0)
    this.body.setVelocity(0, 0)

    // Configure physics
    // Use actual camera height for bottom-toss detection
    const sceneHeight = this.scene.cameras?.main?.height ?? 800
    const isBottomToss = y > sceneHeight // Spawned from bottom edge

    if (isBottomToss) {
      this.body.setVelocity(velocityX, velocityY)
      this.body.setGravity(0, 120)
    } else {
      this.body.setVelocity(velocityX, velocityY)
      this.body.setGravity(0, 120)
    }
    this.body.setBounce(0) // No bounce
    this.body.setCollideWorldBounds(false) // Fall through edges

    // Hitbox: 85% of visual size (forgiving slicing), with hitbox multiplier
    // Note: We multiply by 4 because the CoinRenderer generates the texture at 4x the base radius
    const RENDER_SCALE = 4
    const hitboxRadius =
      config.radius * RENDER_SCALE * 0.85 * scale * (config.hitboxMultiplier ?? 1.0)
    this.body.setCircle(hitboxRadius)

    // Start at minimum visible scale (prevents stuck-at-0)
    this.setScale(scale * 0.1)

    // Play spawn animation (elastic scale-in + rotation burst)
    this.playSpawnAnimation(scale)

    // Set initial angular velocity
    this.body.setAngularVelocity(rotationSpeed * 60) // Convert rad/s to deg/s for Phaser
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
  }

  private playSpawnAnimation(targetScale: number): void {
    // Kill any existing spawn tweens
    this.cleanupTweens()

    // Check if this is a bottom-toss spawn (y > scene height)
    const sceneHeight = this.scene.cameras.main.height
    const isBottomToss = this.y > sceneHeight

    if (isBottomToss) {
      // Fruit Ninja-style throw emphasis: quick scale from 0.8 to 1.0
      this.spawnScaleTween = this.scene.tweens.add({
        targets: this,
        scale: targetScale,
        duration: 100,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Fallback: ensure scale reaches target
          const tolerance = 0.01
          if (Math.abs(this.scale - targetScale) > tolerance) {
            this.setScale(targetScale)
          }
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
          // Second tween: scale down to target (settle)
          this.yoyoScaleTween = this.scene.tweens.add({
            targets: this,
            scale: targetScale,
            duration: 100,
            ease: 'Power2',
            onComplete: () => {
              // Fallback: ensure scale reaches target
              const tolerance = 0.01
              if (Math.abs(this.scale - targetScale) > tolerance) {
                this.setScale(targetScale)
              }
            },
          })
        },
      })
    }

    // Initial rotation burst (±90 degrees)
    const rotationBurst = Phaser.Math.FloatBetween(-Math.PI / 2, Math.PI / 2)
    this.spawnRotationTween = this.scene.tweens.add({
      targets: this,
      angle: rotationBurst * (180 / Math.PI), // Convert to degrees
      duration: 200,
      ease: 'Power2.easeOut',
    })
  }

  /**
   * Handle slice event - play death animation then return to pool.
   */
  onSlice(): void {
    // Kill all tweens to prevent memory leaks
    this.cleanupTweens()

    // Return to pool (deactivate)
    this.setActive(false)
    this.setVisible(false)

    // Reset physics
    if (this.body) {
      this.body.stop()
      this.body.setVelocity(0, 0)
      this.body.setAngularVelocity(0)
    }
  }

  /**
   * Cleanup when token is destroyed (scene shutdown).
   * Ensures all tweens are properly destroyed.
   */
  destroy(): void {
    // Destroy all tweens to prevent memory leaks
    this.cleanupTweens()

    // Destroy graphics objects
    if (this.glowRing) {
      this.glowRing.destroy()
      this.glowRing = undefined
    }

    // Clear image reference (will be destroyed by Container's destroy)
    this.image = null as any

    super.destroy()
  }
}
