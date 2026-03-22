# Position Indicator Compact State Refactor Plan

## Problem Analysis

### Current Implementation Issues

1. **Non-uniform scaling distortion** (`PositionCard.ts:69-70`)
   - Using `scaleX: 0.55, scaleY: 1.0` squishes all child elements
   - Text and direction indicator become horizontally distorted

2. **Not anchored to right edge**
   - Card stays at `camera.width / 2` (centered)
   - When "shrunk", it doesn't move to right edge

3. **Timer is 3.5s instead of 3s** (`PositionCard.ts:330`)

4. **Separate status + button elements** instead of unified action/status element
   - `statusText` shows "Waiting"/"Can close"
   - `closeButton` shows "LOCKED"/"CLOSE"
   - These should be combined into one interactive element

5. **Layout positions don't account for compact width** (`PositionCard.ts:112-119`)
   - Pre-calculated for scaled-down expanded layout
   - Doesn't work correctly with actual compact dimensions

## Solution Design

### Core Concept: True Compact Layout (Not Scaling)

Instead of scaling down the expanded card, create a **properly-sized compact card** with:
- Smaller background width
- Elements repositioned for compact space
- Right-edge anchoring
- Unified action/status button

### Compact Layout Structure

```
┌────────────────────────────────┐
│ [DIR] │ [ACTION/STATUS BTN]   │  ← Right edge of screen
└────────────────────────────────┘
```

Where:
- `DIR`: Direction indicator (up/down arrow icon)
- `ACTION/STATUS BTN`: Single button showing closable state + CTA

## Implementation Plan

### Phase 1: Compact Dimensions & Rendering

**File: `PositionCardRenderer.ts`**

1. Add `CompactCardDimensionsConfig` interface
2. Create `COMPACT_DIMS_BY_HEIGHT` lookup table (similar to expanded)
3. Add `getCompactCardDimensions()` function
4. Add compact card color constants
5. Generate compact card background textures in `generateCachedTextures()`
6. Generate unified close button textures (enabled/disabled states)

**New Dimensions (approximate):**
- Width: 160-180px (vs 320-400px expanded)
- Height: Same as expanded (40-54px)
- Contains: Direction icon + Action button only

### Phase 2: Refactor PositionCard

**File: `PositionCard.ts`**

1. **Remove scaling approach**
   - Delete `compactScaleX`, `compactScaleY` constants
   - Delete scale tween in `setLayoutMode()`

2. **Add compact-specific elements**
   - `compactBackground`: Smaller background for compact mode
   - `actionButton`: Unified action + status element (replaces `statusText` + `closeButton`)

3. **Create compact layout positioning**
   - `compactDirectionX`: Position for direction icon in compact
   - `compactButtonX`: Position for unified button
   - Use `getCompactCardDimensions()` for layout calculations

4. **Implement unified action button**
   - Single `Phaser.GameObjects.Text` or `Container`
   - Shows status text + CTA combined
   - Styles change based on `canClose` state:
     - Enabled: Green background, "CLOSE" text, interactive
     - Disabled: Gray/dark background, "LOCKED" text, non-interactive

5. **Add right-edge anchoring**
   - New method: `getCompactX()` returns right-edge position
   - Position = `camera.width - (compactWidth/2 + margin)`
   - Animate X position during expanded→compact transition

6. **Update `setLayoutMode('compact')`**
   - Fade/slide out expanded elements
   - Swap background texture to compact version
   - Fade/slide in compact elements
   - Animate X position to right edge

7. **Fix timer: 3500ms → 3000ms**

### Phase 3: Update PositionCardSystem

**File: `PositionCardSystem.ts`**

1. **Handle compact card X positioning**
   - Cards in compact mode should ignore center positioning from `calculateCardX()`
   - Each card manages its own X position based on layout mode

2. **No changes needed to card stacking logic**
   - Y positioning remains the same
   - Cards still stack upward from bottom

### Phase 4: Generate Compact Textures

**New textures to generate:**

1. `card_compact_near_zero` - Compact background (neutral state)
2. `card_compact_profit` - Compact background (profit state)  
3. `card_compact_loss` - Compact background (loss state)
4. `card_compact_closing` - Compact background (closing state)
5. `card_compact_liquidated` - Compact background (liquidated state)
6. `btn_close_enabled` - Close button (enabled state)
7. `btn_close_disabled` - Close button (disabled state)

## File Changes Summary

| File | Changes |
|------|---------|
| `PositionCardRenderer.ts` | Add compact dimensions, generate compact textures |
| `PositionCard.ts` | Refactor layout system, implement unified button, add right-edge anchoring |
| `PositionCardSystem.ts` | Minor update for compact X positioning handling |

## Visual Behavior

### Expanded State (Initial)
```
┌─────────────────────────────────────────┐
│ [DIR] ENTRY $65,234.00           [UP]  │
└─────────────────────────────────────────┘
         ↑ Centered on screen
```

### Compact State (After 3s)
```
                    ┌──────────────────┐
                    │ [DIR] │ [CLOSE]  │
                    └──────────────────┘
                              ↑ Anchored to right edge
```

### Button States

**Enabled (Can Close):**
- Green background (#166534)
- Text: "CLOSE"
- Interactive with hand cursor
- Green glow effect

**Disabled (Cannot Close):**
- Dark gray background (#1e293b)
- Text: "LOCKED" or status like "WAITING"
- Non-interactive
- Subtle gray shadow

## User Decisions

1. **Button text**: "CLOSE" / "LOCKED" only (simple action-focused)
2. **Right edge margin**: 8px from screen edge
3. **Animation style**: Slide + scale to right (card moves right while shrinking)

## Implementation Details (Based on Decisions)

### Animation Sequence
1. After 3 seconds, start transition
2. Card slides from center to right edge (X position tween)
3. Card width scales from expanded to compact
4. Expanded elements fade out
5. Compact elements fade in
6. All animations run simultaneously for smooth effect

### Compact Card Positioning
```
compactX = camera.width - (compactWidth/2) - 8
```

### Button Design
- Simple text button with background
- Enabled: "CLOSE" with green styling
- Disabled: "LOCKED" with gray styling
