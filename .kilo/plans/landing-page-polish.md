# Landing Page Polish Plan (Mobile-First) - READY FOR IMPLEMENTATION

## Goal
Polish the game selection landing page with **mobile-first** design, optimized for Base mini app users.

## Status: READY - Plan approved, ready to implement

## Target File
- `frontend/platform/ui/GameSelectionScreen.tsx`

## Key Changes (Mobile-First)

### 1. Typography & Sizing (Mobile → Desktop scaling)
- Title: `text-2xl sm:text-3xl` (down from 3xl/4xl/5xl)
- Subtitle: `text-[10px] sm:text-xs` (more compact)
- Game name: `text-sm sm:text-base` (better fit)
- Description: `text-[11px] sm:text-xs` with line-clamp
- Stats: `text-[9px] sm:text-[10px]`

### 2. Layout & Spacing (Compact for Mini App)
- Container padding: `py-6 px-4` (reduced from py-12 px-6)
- Gap between elements: `gap-4` (reduced from gap-8)
- Card gap: `gap-3` (reduced from gap-4)
- Card padding: `px-4 py-3.5 sm:px-5 sm:py-4` (touch-friendly)

### 3. Game Cards (Touch-Optimized)
- Icon container: `w-10 h-10 sm:w-11 sm:h-11` (tappable on mobile)
- Remove complex hover states (touch doesn't have hover)
- Add `whileTap` scale effect for feedback
- Animated border glow (performant CSS)
- ChevronRight indicator for navigation hint
- Staggered entrance (subtle, 0.1s delay per card)

### 4. Profile Badge (Compact)
- Smaller padding: `px-2.5 py-2`
- Maintains compact mode
- Quick fade-in entrance

### 5. Login Button (Prominent CTA)
- Full-width on mobile
- Pulsing border animation (draws attention)
- Helper text: "Connect to compete in real-time trading battles"
- Touch-friendly sizing

### 6. Background (Performant)
- Keep GridScanBackground (already optimized)
- Keep scan line (reduced opacity to 0.1)
- Remove extra glow effects
- Grid opacity: 0.15 (subtle, performant)

### 7. Page Transitions
- Enter: fade-in with slight scale
- Card entrance: staggered fade-up
- Exit: scan effect (existing, works well)
- Card tap: scale 0.98 for feedback

## Removed from Original Plan (Performance)
- ~~Mouse-following glow cursor~~
- ~~Ambient glow blobs~~
- ~~Heavy blur effects~~
- ~~Complex sheen sweep animation~~
- ~~Elaborate corner accent animations~~

## Validation
- `bun run types` from `frontend/`
- Test at 375px viewport width
- Test Base mini app viewport
