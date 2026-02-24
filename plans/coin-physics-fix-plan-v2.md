# Coin Physics Fix Plan v2

## Problem Analysis

After initial implementation, the following issues remain:

1. **Coins slow down when clicking outside browser/canvas** - The visibility change handler only catches tab-level changes, not window blur
2. **Physics timing inconsistency** - The physics world may have accumulated time that causes speed fluctuations on resume

## Root Cause

The current implementation only handles `document.visibilitychange` which fires when:
- User switches browser tabs
- User minimizes the browser window

It does NOT fire when:
- User clicks on another window (browser loses focus but isn't minimized)
- User clicks outside the canvas but within the same browser window

## Solution

### 1. Add Window Blur/Focus Handlers

In addition to `visibilitychange`, we need to handle `window.blur` and `window.focus` events to catch all cases where the game loses focus.

### 2. Reset Physics Time Accumulator on Resume

When resuming physics, we need to ensure the physics engine doesn't try to "catch up" on lost time. This can be done by:
- Accessing the physics world's internal time accumulator
- Resetting it to 0 on resume

### 3. Implementation

Modify [`TradingScene.ts`](frontend/domains/hyper-swiper/client/phaser/scenes/TradingScene.ts):

```typescript
export class TradingScene extends Scene {
  private services: TradingSceneServices
  private eventEmitter: Phaser.Events.EventEmitter
  private visibilityChangeHandler: () => void
  private windowBlurHandler: () => void
  private windowFocusHandler: () => void
  private isPhysicsPausedByVisibility: boolean = false

  constructor() {
    super({ key: 'TradingScene' })
    this.eventEmitter = new Phaser.Events.EventEmitter()
    this.services = new TradingSceneServices(this)
    this.visibilityChangeHandler = this.handleVisibilityChange.bind(this)
    this.windowBlurHandler = this.handleWindowBlur.bind(this)
    this.windowFocusHandler = this.handleWindowFocus.bind(this)
  }

  create(): void {
    // ... existing code ...

    // Add visibility and focus listeners
    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
    window.addEventListener('blur', this.windowBlurHandler)
    window.addEventListener('focus', this.windowFocusHandler)
  }

  shutdown(): void {
    // Remove all listeners
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
    window.removeEventListener('blur', this.windowBlurHandler)
    window.removeEventListener('focus', this.windowFocusHandler)
    
    // ... existing shutdown code ...
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.pausePhysics()
    } else {
      this.resumePhysics()
    }
  }

  private handleWindowBlur(): void {
    this.pausePhysics()
  }

  private handleWindowFocus(): void {
    this.resumePhysics()
  }

  private pausePhysics(): void {
    if (this.isPhysicsPausedByVisibility) return
    this.isPhysicsPausedByVisibility = true
    this.physics.world.pause()
  }

  private resumePhysics(): void {
    if (!this.isPhysicsPausedByVisibility) return
    
    // Check if we should actually resume (tab visible AND window focused)
    if (!document.hidden && document.hasFocus()) {
      this.isPhysicsPausedByVisibility = false
      
      // Reset the physics time accumulator to prevent catch-up
      const arcadePhysics = this.physics.world
      if (arcadePhysics && 'frame' in arcadePhysics) {
        // Access internal physics time and reset it
        const physicsBody = (arcadePhysics as any)
        if (physicsBody.time) {
          physicsBody.time.now = 0
          physicsBody.time.delta = 0
          physicsBody.time.deltaTime = 0
        }
      }
      
      this.physics.world.resume()
    }
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| [`frontend/domains/hyper-swiper/client/phaser/scenes/TradingScene.ts`](frontend/domains/hyper-swiper/client/phaser/scenes/TradingScene.ts) | Add blur/focus handlers, reset physics time on resume |

## Testing Checklist

- [ ] Click outside browser window - coins should pause
- [ ] Click back to browser - coins should resume at normal speed
- [ ] Switch browser tabs - coins should pause
- [ ] Switch back - coins should resume at normal speed
- [ ] Minimize browser - coins should pause
- [ ] Restore browser - coins should resume at normal speed
- [ ] Coins should always move at consistent speed after any focus change
