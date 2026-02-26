# Button Grid Ripple Effect Design

## Overview

Add Tron-style pulse rings that emanate from the LONG/SHORT buttons when tapped, expanding across the grid as visual feedback.

## Requirements

- **Trigger:** Immediately on button tap (before position opens)
- **Style:** Tron-style expanding pulse rings
- **Scope:** Contained effect, expanding to ~2.5x button size
- **Colors:** Cyan (long) / Orange (short) - matching button colors

## Visual Specification

```
Button tap
    ↓
Ring 1: starts at button edge, expands to 2.5x size, fades
Ring 2: starts 100ms later, expands to 2.5x size, fades
Ring 3: starts 200ms later, expands to 2.5x size, fades
```

- **Initial radius:** Button size (e.g., 88px)
- **Final radius:** ~2.5x button size (~220px)
- **Duration:** 400-500ms per ring
- **Alpha:** 0.6 → 0 (linear fade)
- **Line width:** 2-3px

## Implementation Location

**File:** `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`

### Why ButtonSystem (not CoinButton)?

- The ripple is a screen-level effect, not contained within the button
- ButtonSystem already has access to button positions and the scene
- Keeps CoinButton focused on button-local interactions

## Data Structures

```typescript
interface GridRipple {
  x: number           // Button center X
  y: number           // Button center Y
  radius: number      // Current radius
  maxRadius: number   // Target radius (2.5x button size)
  color: number       // 0x00f3ff (cyan) or 0xff6600 (orange)
  startTime: number   // When ripple started
  duration: number    // Total duration in ms
}
```

## Implementation Steps

1. Add `gridRipples: GridRipple[]` array to ButtonSystem
2. Add `rippleGraphics: GameObjects.Graphics` for drawing
3. Create `triggerGridRipple(x, y, direction)` method
4. Update `handleButtonTap()` to call `triggerGridRipple()`
5. Add ripple update logic to `update()` method
6. Clean up ripples in `shutdown()`

## Integration Points

- Uses existing button colors from `ButtonRenderer`
- Coordinates match button positions from `getButtonSizes()`
- Depth layer: between grid (-1) and buttons (10) → suggest depth 5
