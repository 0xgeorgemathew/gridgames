# Profile Display & GameHUD Improvements Plan

## Overview
This plan addresses two main issues:
1. **Inconsistent Profile Display**: Profile pictures and names are scattered across MatchmakingScreen and GameSelectionScreen, with inconsistent positioning on Android vs iPhone
2. **GameHUD Design**: Needs improvements for better base mini app experience

## Current State Analysis

### Profile Display Issues
- **MatchmakingScreen**: Uses `PlayingAsPanel` component that displays "PLAYING AS" text with profile in center
- **GameSelectionScreen**: Shows profile in center with different styling
- **Inconsistencies**:
  - Different layouts between screens
  - "Playing as" text is unnecessary
  - Profile picture styling differs (square vs rounded corners)
  - Position varies between devices

### GameHUD Current State
- Bottom navigation HUD with price row, timer, health bar
- Loading overlay for price feed connection
- Game over state with play again button
- Works but could be enhanced for mini app experience

## Proposed Solution

### 1. Create Unified `UserProfileBadge` Component

**Location**: `frontend/platform/ui/UserProfileBadge.tsx`

**Design**:
```
┌─────────────────────────┐
│              [Name] (●) │  <- Right-aligned, PFP on right in circle
└─────────────────────────┘
```

**Features**:
- Consistent layout: Name on left, circular profile picture on right
- Handles users without profile pictures (Privy users) with stylized fallback avatar
- Compact mode for smaller screens
- Animated glow effects matching TRON theme
- Responsive sizing

**Props**:
```typescript
interface UserProfileBadgeProps {
  displayName: string | null
  pfpUrl?: string | null
  className?: string
  compact?: boolean
}
```

### 2. Update MatchmakingScreen

**Changes**:
- Remove `PlayingAsPanel` component entirely
- Add `UserProfileBadge` in top right corner (fixed position)
- Remove "PLAYING AS" text
- Layout:

```
┌────────────────────────────────────┐
│ [← BACK]              [Name] (●)  │ <- Top bar
│                                    │
│         ENTER THE GRID             │
│        HYPER SWIPER               │
│                                    │
│     [AUTO-MATCH] [SELECT]         │
│     [Game Settings]               │
└────────────────────────────────────┘
```

### 3. Update GameSelectionScreen

**Changes**:
- Move profile from center to top right corner
- Use `UserProfileBadge` component
- Same layout pattern as MatchmakingScreen for consistency

**Layout**:
```
┌────────────────────────────────────┐
│                     [Name] (●)     │ <- Top right
│                                    │
│          GRID GAMES               │
│     SELECT YOUR GAME              │
│                                    │
│     [Game 1 - Hyper Swiper]       │
│     [Game 2 - Coming Soon]        │
│                                    │
│          [LOGOUT]                 │
└────────────────────────────────────┘
```

### 4. GameHUD Improvements

**Enhancements**:
- Better visual hierarchy
- Improved touch targets for mobile
- Cleaner animations
- Better spacing for mini app context
- Consider adding user profile badge to HUD during gameplay

**Potential additions**:
- Show compact user profile in top-right during gameplay
- Improve loading state visuals
- Better game over state design

## Implementation Order

1. **Create `UserProfileBadge` component** - New unified component
2. **Update `MatchmakingScreen`** - Replace PlayingAsPanel, move to top right
3. **Update `GameSelectionScreen`** - Move profile to top right
4. **Improve `GameHUD`** - Design enhancements for mini app

## Technical Details

### UserProfileBadge Component

```tsx
// Key features:
- Circular profile picture with glow border
- Fallback avatar using CSS (no external assets)
- Framer Motion animations
- Responsive sizing (compact mode)
- Right-to-left flex for proper alignment
```

### Fallback Avatar Design
For users without profile pictures (Privy users):
- Circular container with TRON border
- Stylized user icon using pure CSS shapes
- Matches overall TRON aesthetic
- Animated glow effect

### Responsive Considerations
- Compact mode for smaller screens (under 380px)
- Touch-friendly sizing (minimum 44px touch targets)
- Safe area insets for notched devices
- Consistent positioning across iOS and Android

## Files to Modify

1. **NEW**: `frontend/platform/ui/UserProfileBadge.tsx`
2. **MODIFY**: `frontend/domains/hyper-swiper/client/components/screens/MatchmakingScreen.tsx`
   - Remove `PlayingAsPanel` component
   - Add `UserProfileBadge` in top right
3. **MODIFY**: `frontend/platform/ui/GameSelectionScreen.tsx`
   - Replace inline profile with `UserProfileBadge`
   - Move to top right corner
4. **MODIFY**: `frontend/domains/hyper-swiper/client/components/hud/GameHUD.tsx`
   - Design improvements
   - Consider adding compact profile badge

## Visual Mockup

### Before (MatchmakingScreen):
```
┌────────────────────────────────────┐
│ [← BACK]                          │
│                                    │
│         ENTER THE GRID             │
│        HYPER SWIPER               │
│                                    │
│        PLAYING AS                 │ <- Centered, takes space
│    (●) [Grid Runner]              │
│                                    │
│     [AUTO-MATCH] [SELECT]         │
└────────────────────────────────────┘
```

### After (MatchmakingScreen):
```
┌────────────────────────────────────┐
│ [← BACK]          [Name] (●)      │ <- Compact top bar
│                                    │
│         ENTER THE GRID             │
│        HYPER SWIPER               │
│                                    │
│     [AUTO-MATCH]                   │
│     [SELECT OPPONENT]             │
│     [Game Settings]               │
└────────────────────────────────────┘
```

## Testing Checklist

- [ ] Profile displays correctly on iOS
- [ ] Profile displays correctly on Android
- [ ] Fallback avatar shows for users without PFP
- [ ] Compact mode works on small screens
- [ ] Animations are smooth
- [ ] Touch targets are accessible
- [ ] Safe area insets respected
- [ ] TRON theme consistency maintained
