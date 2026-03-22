# Position Indicator Animation Fix Plan

## Issues to Fix

1. **State change scale animation broken** - `playStateChangeAnimation()` scales the background element which compounds with container scale, causing wild expansion
2. **statusText overlaps content** - Positioned at X=0 with origin (0, 0.5), overlaps direction icon and close button in compact mode
3. **Close button extends beyond card bounds** - Button size (60px) too large for compact card positioning
4. **Compact layout has extra text** - User approved removing statusText from compact mode

## Changes

### File: `PositionCard.ts`

#### 1. Remove state change scale animation

Delete the `playStateChangeAnimation()` method and its call in `setVisualState()`:
- Remove lines 327-339 (method definition)
- Remove line 324 (`this.playStateChangeAnimation()`)

**Reason:** Scaling background while container may have different scale causes compound scaling issues. Texture swap provides sufficient visual feedback.

#### 2. Hide statusText in compact mode

In `setLayoutMode('compact')`:
- Remove line 426: `this.statusText.setVisible(true)`
- Remove `this.statusText` from the alpha tween at lines 482-489

In `setLayoutMode('expanded')`:
- Line 386: Keep `this.statusText.setVisible(false)`

In `setClosing()`:
- Keep statusText visible - it shows "Won $X", "Closed", or "Liquidated"

#### 3. Fix close button sizing for compact card

Change button size to match compact card proportions:
```typescript
// Line 241: Change from
this.closeButton.setDisplaySize(closeZoneWidth - 10, closeZoneHeight)
// To
const compactButtonSize = compactDims.iconSize + 4
this.closeButton.setDisplaySize(compactButtonSize, compactButtonSize)
```

Update `closeZone` to match:
```typescript
// Lines 247-251: Change to
this.closeZone = scene.add.zone(
  this.layoutPositions.compactButtonX,
  0,
  compactButtonSize,
  compactButtonSize
)
```

#### 4. Recalculate compact button position

The current calculation places button too close to center. Update to place at right edge:
```typescript
// Line 148: Change from
compactButtonX: compactDims.width / 2 - compactDims.glowPadding - compactDims.padding - 40
// To
compactButtonX: compactDims.width / 2 - compactDims.glowPadding - compactDims.padding - 18
```

#### 5. Remove statusText alpha tween in compact mode

In `setLayoutMode('compact')`, lines 482-489:
```typescript
// Change from
this.statusText.setAlpha(0)
this.closeButton.setAlpha(0)
this.cardScene.tweens.add({
  targets: [this.statusText, this.closeButton],
  alpha: 1,
  duration: 180,
  ease: 'Sine.out',
})
// To
this.closeButton.setAlpha(0)
this.cardScene.tweens.add({
  targets: this.closeButton,
  alpha: 1,
  duration: 180,
  ease: 'Sine.out',
})
```

## Summary

| Change | Purpose |
|--------|---------|
| Remove `playStateChangeAnimation()` | Fix wild scale expansion |
| Hide statusText in compact mode | Remove overlapping text |
| Use smaller button size | Fit within compact card bounds |
| Adjust compactButtonX | Position button at right edge |
| Update closeZone size | Match new button size |
