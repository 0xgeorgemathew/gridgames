# Changes Summary

Date: 2026-03-22

## Overview

This commit bundles the current working tree updates across multiplayer server logic, Hyper Swiper, Tap Dancer, shared match types, and supporting plans/docs.

## Major Changes

- Updated multiplayer socket and settlement flow under `frontend/app/api/socket/multiplayer/` for the current zero-sum match pipeline, including config, rules, settlement, liquidation, room state, logging, and result persistence.
- Updated shared match and trading types for both `hyper-swiper` and `tap-dancer`, plus related client store slices and match config wiring.
- Refined Hyper Swiper position handling and position indicator behavior in the client state and HUD effect layer.
- Reworked Tap Dancer position-card behavior:
  - compact and expanded position indicator layouts
  - screen-size-aware sizing
  - circular indicator/button chips
  - improved close and lock icon rendering
  - right-side compact placement
  - center-screen win flash instead of local inline win text
  - subtle close-button affordance when the position becomes closable
- Updated Tap Dancer Phaser systems around button rendering, button positioning, card rendering, card orchestration, price-graph flash feedback, and scene resize propagation.
- Adjusted Tap Dancer UI surfaces including onboarding and game-over presentation.
- Included current planning artifacts and workspace metadata changes present in the tree at commit time.

## Files Of Note

- `frontend/app/api/socket/multiplayer/`
- `frontend/domains/hyper-swiper/client/components/effects/PositionIndicator.tsx`
- `frontend/domains/hyper-swiper/client/state/`
- `frontend/domains/hyper-swiper/shared/`
- `frontend/domains/tap-dancer/client/phaser/objects/PositionCard.ts`
- `frontend/domains/tap-dancer/client/phaser/systems/PositionCardRenderer.ts`
- `frontend/domains/tap-dancer/client/phaser/systems/PositionCardSystem.ts`
- `frontend/domains/tap-dancer/client/phaser/systems/PriceGraphSystem.ts`
- `frontend/domains/tap-dancer/client/phaser/systems/TradingSceneServices.ts`
- `frontend/domains/tap-dancer/client/state/`
- `frontend/domains/tap-dancer/shared/`

## Verification

- Ran `bun run types` in `frontend/`
