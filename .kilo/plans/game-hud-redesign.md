# Game HUD Redesign Plan

## Objective
Redesign the Game HUD to be beautiful, game-relevant, and properly sized for iPhones without cutoff issues.

---

## Current Issues

1. **Single-row layout** - All info crammed horizontally, causes overflow/cutoff on narrow iPhone screens
2. **No PvP context** - Doesn't show opponent balance or winning/losing status
3. **Poor visual hierarchy** - Timer, balance, price all compete equally for attention
4. **Not game-relevant** - Looks like generic trading ticker, not a competitive PvP game HUD

---

## Target Design

### Layout: Two-Row Stacked (iPhone-optimized)

```
┌─────────────────────────────────────────────────────────┐
│  TOP ROW - Game Status                                  │
│  ┌──────────┐  ┌─────────────────┐  ┌──────────┐       │
│  │  1:23    │  │ $950 vs $1,050  │  │   🔊 ✕   │       │
│  │  TIMER   │  │   YOU  OPPONENT │  │  ACTIONS │       │
│  └──────────┘  └─────────────────┘  └──────────┘       │
├─────────────────────────────────────────────────────────┤
│  BOTTOM ROW - Price Ticker                              │
│     BTC $94,123.45  ▲ +2.34%                            │
└─────────────────────────────────────────────────────────┘
```

### Visual Design Principles

1. **TRON aesthetic** maintained with cyan glow, dark backgrounds
2. **Larger touch targets** for action buttons (44px minimum)
3. **Safe area padding** for iPhone notch and home indicator
4. **Clear typography** with better contrast

---

## Implementation Steps

### Step 1: Update CompactPriceRow Layout

**File:** `frontend/domains/tap-dancer/client/components/hud/CompactPriceRow.tsx`

Changes:
- Split into two rows on mobile using flex-col
- Top row: Timer (left) + PvP Balance Comparison (center) + Actions (right)
- Bottom row: Full-width price ticker
- Add opponent balance prop

### Step 2: Add PvP Balance Comparison Display

In CompactPriceRow, add:
- Side-by-side display: Your Balance | VS | Opponent Balance
- Visual indicator of who's winning (subtle glow on higher balance)
- "YOU" and "OPP" labels for clarity

### Step 3: Update GameHUD to Pass Opponent Data

**File:** `frontend/domains/tap-dancer/client/components/hud/GameHUD.tsx`

Changes:
- Extract opponent player from `players` array
- Pass opponent balance to CompactPriceRow
- Maintain same store subscriptions

### Step 4: Mobile-First Responsive Styling

CSS considerations:
- Use `env(safe-area-inset-bottom)` for iPhone safe area
- Minimum touch target of 44x44px for buttons
- Font sizes: Timer 16-18px, Balance 13-14px, Price 15-16px
- Two-row stacked layout for screens under 400px

### Step 5: Apply Same Changes to Hyper-Swiper

**Files:**
- `frontend/domains/hyper-swiper/client/components/hud/CompactPriceRow.tsx`
- `frontend/domains/hyper-swiper/client/components/hud/GameHUD.tsx`

Synchronize both games to have identical HUD structure.

---

## Technical Details

### New Props for CompactPriceRow

```typescript
interface CompactPriceRowProps {
  // ...existing props
  opponentBalance?: number    // NEW
}
```

### Responsive Approach

- Default: Two-row stacked layout (iPhone-first)
- Larger screens: Optionally use single-row if space permits

### Color Indicators

- **Your balance when winning**: Bright cyan glow
- **Your balance when losing**: Dimmed cyan
- **Opponent balance**: Slightly dimmed regardless

---

## Files to Modify

| File | Changes |
|------|---------|
| `tap-dancer/.../CompactPriceRow.tsx` | Two-row layout, PvP comparison, opponent prop |
| `tap-dancer/.../GameHUD.tsx` | Pass opponent balance |
| `hyper-swiper/.../CompactPriceRow.tsx` | Same as tap-dancer |
| `hyper-swiper/.../GameHUD.tsx` | Same as tap-dancer |

---

## Verification

1. Test on iPhone simulator (375px, 390px, 428px widths)
2. Verify no horizontal overflow or cutoff
3. Verify safe area padding works with notch/home indicator
4. Run `bun run types` to verify TypeScript
