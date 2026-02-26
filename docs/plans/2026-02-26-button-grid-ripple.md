# Button Grid Ripple Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Tron-style pulse rings that emanate from LONG/SHORT buttons when tapped, expanding to 2.5x button size with fading alpha.

**Architecture:** Add ripple state and graphics to ButtonSystem. On button tap, spawn 3 staggered rings that expand and fade over 400ms. Update method animates rings each frame.

**Tech Stack:** Phaser Graphics, TypeScript

---

## Task 1: Add GridRipple Interface and State

**Files:**
- Modify: `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`

**Step 1: Add GridRipple interface after ButtonSizes interface (after line 11)**

```typescript
// Ripple effect configuration
interface GridRipple {
  x: number
  y: number
  radius: number
  color: number
  startTime: number
  duration: number
}

const RIPPLE_CONFIG = {
  initialRadius: 44,     // Start at half button size
  maxRadiusFactor: 2.5,  // Expand to 2.5x button size
  duration: 400,         // Animation duration in ms
  ringCount: 3,          // Number of rings per ripple
  ringDelay: 80,         // Delay between rings in ms
  lineWidth: 2,
  initialAlpha: 0.6,
} as const
```

**Step 2: Add ripple state properties to ButtonSystem class (after line 51)**

```typescript
  // Grid ripple effect
  private gridRipples: GridRipple[] = []
  private rippleGraphics?: Phaser.GameObjects.Graphics
```

**Step 3: Run type check**

Run: `cd frontend && bun run types`
Expected: No new errors

**Step 4: Commit**

```bash
git add frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts
git commit -m "feat(button): add GridRipple interface and state to ButtonSystem"
```

---

## Task 2: Initialize Ripple Graphics in create()

**Files:**
- Modify: `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`

**Step 1: Add ripple graphics initialization in create() method (after line 65, after generateCachedTextures)**

```typescript
    // Initialize ripple graphics (depth between grid and buttons)
    this.rippleGraphics = this.scene.add.graphics()
    this.rippleGraphics.setDepth(5)
```

**Step 2: Run type check**

Run: `cd frontend && bun run types`
Expected: No new errors

**Step 3: Commit**

```bash
git add frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts
git commit -m "feat(button): initialize ripple graphics in ButtonSystem.create()"
```

---

## Task 3: Add triggerGridRipple Method

**Files:**
- Modify: `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`

**Step 1: Add triggerGridRipple method after handleButtonTap (after line 146)**

```typescript
  /**
   * Trigger grid ripple effect from button position
   */
  private triggerGridRipple(direction: ButtonType): void {
    const button = direction === 'long' ? this.upButton : this.downButton
    if (!button) return

    const { buttonSize } = getButtonSizes()
    const color = direction === 'long' ? 0x00f3ff : 0xff6600

    // Spawn staggered rings
    for (let i = 0; i < RIPPLE_CONFIG.ringCount; i++) {
      this.gridRipples.push({
        x: button.x,
        y: button.y,
        radius: RIPPLE_CONFIG.initialRadius,
        color,
        startTime: Date.now() + i * RIPPLE_CONFIG.ringDelay,
        duration: RIPPLE_CONFIG.duration,
      })
    }
  }
```

**Step 2: Run type check**

Run: `cd frontend && bun run types`
Expected: No new errors

**Step 3: Commit**

```bash
git add frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts
git commit -m "feat(button): add triggerGridRipple method to ButtonSystem"
```

---

## Task 4: Trigger Ripple on Button Tap

**Files:**
- Modify: `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`

**Step 1: Update handleButtonTap to trigger ripple (replace lines 141-146)**

```typescript
  /**
   * Handle button tap - emit event for TradingSceneServices to handle
   */
  private handleButtonTap(direction: ButtonType): void {
    if (this.isShutdown) return

    // Trigger grid ripple effect
    this.triggerGridRipple(direction)

    // Emit event that TradingSceneServices will listen to
    window.phaserEvents?.emit('button_tap', { direction })
  }
```

**Step 2: Run type check**

Run: `cd frontend && bun run types`
Expected: No new errors

**Step 3: Commit**

```bash
git add frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts
git commit -m "feat(button): trigger grid ripple on button tap"
```

---

## Task 5: Animate Ripples in update()

**Files:**
- Modify: `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`

**Step 1: Replace update() method (lines 148-153)**

```typescript
  /**
   * Update - called each frame
   */
  update(_delta: number): void {
    this.updateGridRipples()
  }

  /**
   * Update and draw grid ripple effects
   */
  private updateGridRipples(): void {
    if (!this.rippleGraphics) return

    this.rippleGraphics.clear()

    const now = Date.now()
    const { buttonSize } = getButtonSizes()
    const maxRadius = buttonSize * RIPPLE_CONFIG.maxRadiusFactor

    // Update and draw active ripples
    for (let i = this.gridRipples.length - 1; i >= 0; i--) {
      const ripple = this.gridRipples[i]
      const elapsed = now - ripple.startTime

      // Skip rings that haven't started yet
      if (elapsed < 0) continue

      // Remove expired ripples
      if (elapsed >= ripple.duration) {
        this.gridRipples.splice(i, 1)
        continue
      }

      // Calculate animation progress (0 to 1)
      const progress = elapsed / ripple.duration

      // Ease-out for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      // Calculate current radius and alpha
      const currentRadius = ripple.radius + (maxRadius - ripple.radius) * easedProgress
      const alpha = RIPPLE_CONFIG.initialAlpha * (1 - progress)

      // Draw the ring
      this.rippleGraphics.lineStyle(RIPPLE_CONFIG.lineWidth, ripple.color, alpha)
      this.rippleGraphics.strokeCircle(ripple.x, ripple.y, currentRadius)
    }
  }
```

**Step 2: Run type check**

Run: `cd frontend && bun run types`
Expected: No new errors

**Step 3: Commit**

```bash
git add frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts
git commit -m "feat(button): animate grid ripples in update loop"
```

---

## Task 6: Clean Up Ripples in shutdown()

**Files:**
- Modify: `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`

**Step 1: Add ripple cleanup in shutdown() method (before line 175, after isShutdown = true)**

```typescript
    // Clean up ripple graphics
    this.gridRipples = []
    if (this.rippleGraphics) {
      this.rippleGraphics.destroy()
      this.rippleGraphics = undefined
    }
```

**Step 2: Run type check**

Run: `cd frontend && bun run types`
Expected: No new errors

**Step 3: Commit**

```bash
git add frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts
git commit -m "feat(button): clean up ripple graphics in shutdown"
```

---

## Task 7: Visual Verification

**Step 1: Run the dev server (if not already running)**

Run: `cd frontend && bun run dev`

**Step 2: Verify in browser**

1. Open the tap-dancer game
2. Tap the LONG (left) button
3. Verify cyan rings expand from button, fade as they grow
4. Tap the SHORT (right) button
5. Verify orange rings expand from button, fade as they grow
6. Verify 3 staggered rings per tap
7. Verify rings reach ~2.5x button size before disappearing

**Step 3: Final commit (if adjustments needed)**

```bash
git add frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts
git commit -m "feat(button): add Tron-style grid ripple effect on button tap"
```
