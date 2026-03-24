# Tap Dancer Button Polish Plan

## Summary

Polish the Tap Dancer buttons by:
1. Replacing triangles with literal up/down arrows (↑/↓)
2. Simplifying the color scheme
3. Removing all beat/music system code

## Changes Overview

### Button Visual Changes

**Current:** Triangle shapes pointing up/down
**New:** Literal arrow characters (↑/↓) with simplified colors

**File:** [`frontend/domains/tap-dancer/client/phaser/systems/ButtonRenderer.ts`](../frontend/domains/tap-dancer/client/phaser/systems/ButtonRenderer.ts)

Changes:
- Replace `drawTriangle()` method with `drawArrow()` that renders ↑/↓ text
- Simplify color config:
  - UP button: Single cyan/green color
  - DOWN button: Single red/pink color
- Remove complex gradient layers, keep simple filled circle with border

### Beat System Removal

The entire beat/music system should be removed. This includes:

#### Files to Delete

| File | Purpose |
|------|---------|
| `client/systems/BeatAnalyzer.ts` | Audio beat detection using music-tempo |
| `client/systems/BeatSynchronizer.ts` | Syncs beat events with audio playback |
| `client/systems/AudioPlayer.ts` | Web Audio API background music player |
| `client/systems/useBeatAnimation.ts` | React hook for beat-reactive animations |
| `client/systems/beat.types.ts` | Type definitions for beat system |

#### Files to Modify

| File | Changes |
|------|---------|
| `client/systems/index.ts` | Remove all beat-related exports |
| `client/components/TapDancerClient.tsx` | Remove `useBeatAnimation()` hook call |
| `client/phaser/systems/ButtonSystem.ts` | Remove beat pulse subscription and `lastBeatActive` |
| `client/phaser/objects/CoinButton.ts` | Remove `playBeatPulse()` method and `beatTween` |
| `client/state/slices/index.ts` | Remove `beatActive` state and `triggerBeat` action |
| `client/state/trading.types.ts` | Remove `beatActive` and `triggerBeat` type definitions |

### Dependency Check

The `music-tempo` package in `package.json` can be removed if only used by Tap Dancer.

## Implementation Order

1. Modify ButtonRenderer.ts - new arrow design with simplified colors
2. Update CoinButton.ts - remove beat pulse method
3. Update ButtonSystem.ts - remove beat subscription
4. Update trading store - remove beat state
5. Update TapDancerClient.tsx - remove useBeatAnimation
6. Delete beat system files
7. Update systems/index.ts
8. Run `bun run types` to verify

## Arrow Design

```
UP Button:    ↓ Button:
   ↑             ↓
  (cyan)       (red)
```

Simple filled circle with:
- Border in button color
- Arrow text centered
- No complex gradients or glow layers
