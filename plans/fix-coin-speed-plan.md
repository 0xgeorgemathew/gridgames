# Fix Plan: Constant Coin Speed During Interactions

## Problem Statement

When clicking on the grid or swiping coins, the coins speed up during the interaction and return to normal speed after the interaction ends. The user wants the coin movement speed to remain constant regardless of touch/mouse interactions.

## Root Cause Analysis

The issue is in the Phaser physics configuration at [`frontend/domains/hyper-swiper/client/phaser/config.ts:105-112`](../../frontend/domains/hyper-swiper/client/phaser/config.ts:105):

```typescript
physics: {
  default: 'arcade',
  arcade: {
    gravity: { x: 0, y: 0 },
    fps: targetFrameRate,  // BUG: This varies (60/90/120) based on device
    fixedStep: true,
    timeScale: 1,
  },
},
```

The `fps` property is set to `targetFrameRate` which is dynamically calculated based on device capabilities:

```typescript
function getTargetFrameRate(): number {
  // ...
  if (isMobile && cores >= 8 && memory >= 6) return 120
  if (isMobile && cores >= 6 && memory >= 4) return 90
  return 60
}
```

### Why This Causes Speed-Up During Interactions

1. **Physics FPS vs Render FPS Mismatch**: When `fixedStep: true` is enabled, Phaser runs physics at the specified `fps` rate. However, when the render FPS increases (which often happens during active touch interactions due to browser optimizations), the physics engine compensates by running more physics steps per frame.

2. **Frame Timing Variations**: During touch/swipe interactions:
   - Browsers prioritize rendering performance
   - `requestAnimationFrame` may run faster
   - The physics engine tries to "catch up" by running more simulation steps
   - This results in coins appearing to move faster

3. **The `targetFrameRate` is designed for render FPS**, not physics FPS. Physics should always run at a fixed, stable rate for deterministic behavior.

## Solution

Change the physics configuration to use a **fixed 60 FPS** regardless of device capabilities:

```typescript
physics: {
  default: 'arcade',
  arcade: {
    gravity: { x: 0, y: 0 },
    fps: 60,  // FIXED: Always use 60fps for physics stability
    fixedStep: true,
    timeScale: 1,
  },
},
```

### Why 60 FPS for Physics?

1. **Deterministic Behavior**: 60 FPS is the standard for physics simulations
2. **Cross-Device Consistency**: Same behavior on 60Hz, 90Hz, and 120Hz displays
3. **Performance**: Lower CPU usage on high-refresh-rate devices
4. **Predictability**: Physics calculations remain stable regardless of render performance

## Files to Modify

### 1. `frontend/domains/hyper-swiper/client/phaser/config.ts`

**Location**: Lines 105-112

**Change**:
```diff
physics: {
  default: 'arcade',
  arcade: {
    gravity: { x: 0, y: 0 },
-   fps: targetFrameRate,
+   fps: 60, // Fixed physics timestep for consistent coin speed
    fixedStep: true,
    timeScale: 1,
  },
},
```

### 2. `frontend/games/hyper-swiper/game/config.ts` (if exists and has same issue)

Apply the same fix if this file has the same configuration pattern.

## Implementation Steps

1. **Update Physics Config**: Change `fps: targetFrameRate` to `fps: 60` in the physics configuration
2. **Verify Token Physics**: Ensure the Token class doesn't override physics settings
3. **Test on Multiple Devices**: Verify consistent behavior on:
   - 60Hz displays
   - 90Hz displays (high-end phones)
   - 120Hz displays (ProMotion displays)

## Technical Notes

### How Phaser's `fixedStep` Works

When `fixedStep: true`:
- Physics updates at a fixed rate (determined by `fps`)
- If render is slower than physics, multiple physics steps per frame
- If render is faster than physics, some frames skip physics updates
- This should theoretically prevent speed variations, but...

### The Real Problem

The issue is that when `fps` is set to a high value (like 120), and the device can't maintain that rate during heavy interactions:
1. Phaser accumulates "physics debt"
2. When the interaction ends and performance improves
3. Phaser runs multiple physics steps to catch up
4. This creates the perception of speed-up

By using a fixed 60 FPS physics rate:
- Physics is always achievable on any device
- No accumulation of physics debt
- Consistent, predictable coin movement

## Alternative Approaches Considered

### Option A: Use `delta` time in custom physics (Rejected)
- Would require rewriting Token physics
- More complex, error-prone
- Current Phaser Arcade physics works fine with proper config

### Option B: Disable `fixedStep` (Rejected)
- Would cause non-deterministic behavior
- Different speeds on different devices
- Worse for multiplayer sync

### Option C: Use physics timeScale adjustment (Rejected)
- Adds complexity
- Doesn't address root cause
- Could introduce other timing issues

## Expected Outcome

After implementing this fix:
- Coins will move at a constant speed regardless of touch/mouse interactions
- No speed-up during swiping or clicking
- Consistent behavior across all devices and refresh rates
