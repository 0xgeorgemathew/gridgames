# Zero-Sum Winner-Takes-All Migration Plan

## Rules

- Keep the backend as the temporary authoritative sequencer.
- Do not make game outcome depend on external market price.
- Do not add contract assumptions to core game/domain types.
- Keep funding and settlement behind bridge interfaces.
- Keep one shared match lifecycle for both games.

## Separation

### Temporary Bridge Logic

- Pre-match funding/readiness checks
- Result persistence
- Settlement handoff
- Wallet-based participation gating

### Future-Ready Architecture

- Match lifecycle state machine
- Shared socket event envelope
- Authoritative action log
- Deterministic per-game reducers
- Match result artifact

## Phase 1: Replace Shared Trading Semantics With Match Semantics

### Goal

Introduce a shared match model and event contract without changing game-specific visuals yet.

### Exact Code Changes

- Create `frontend/domains/match/types.ts`
  - Add `MatchId`, `MatchStatus`, `ReadyState`, `FundingState`, `MatchPlayer`, `AuthoritativeAction`, `MatchCheckpoint`, `ResolvedMatchOutcome`, `ResultArtifact`, `SettlementHandoffState`.
- Create `frontend/domains/match/events.ts`
  - Add shared socket payloads for `match_created`, `match_updated`, `match_started`, `match_action_applied`, `match_result_ready`, `match_aborted`, `funding_state_updated`, `settlement_state_updated`.
- Create `frontend/domains/match/config.ts`
  - Add shared match constants: `STAKE_AMOUNT = 10`, `PLAYER_COUNT = 2`, `READY_TIMEOUT_MS`, `ROOM_DELETION_DELAY_MS`.
- Modify `frontend/app/api/socket/multiplayer/events.types.ts`
  - Remove position/settlement-specific types from the shared path.
  - Keep only server-local types that are not domain contracts.
- Modify `frontend/domains/hyper-swiper/shared/trading.types.ts`
  - Remove order, position, liquidation, leverage, collateral, PnL, Avantis-aligned comments.
  - Replace with Hyper Swiper action/result payloads built on shared match types.
- Modify `frontend/domains/tap-dancer/shared/trading.types.ts`
  - Remove position, liquidation, PnL, final balance.
  - Replace with Tap Dancer action/result payloads built on shared match types.
- Modify `frontend/app/api/socket/multiplayer/game.config.ts`
  - Remove `POSITION_COLLATERAL`, `FIXED_LEVERAGE`, `MAX_POSITIONS`, `LIQUIDATION_THRESHOLD`.
  - Keep only generic match and room constants plus Hyper Swiper spawn constants.
- Modify `frontend/domains/hyper-swiper/client/game.config.ts`
  - Remove trading constants.
  - Keep only scene/UI constants and Hyper Swiper gameplay constants.
- Modify `frontend/domains/tap-dancer/client/game.config.ts`
  - Remove trading constants.
  - Keep only scene/UI constants and Tap Dancer gameplay constants.

### Deliverables

- Shared match domain types exist.
- Shared socket event contract exists.
- No shared config file uses leverage/collateral/liquidation terminology.
- Both games have game-specific shared types that no longer define `Position` as the core gameplay object.

### Exit Criteria

- `frontend/domains/match/` is the only shared source for lifecycle and result types.
- Shared domain files do not reference `pnl`, `liquidation`, `collateral`, `leverage`, `openPrice`, or `closePrice`.
- Both game config files align on `$10` stake through shared match config, not duplicated trading values.

### Feedback Loops

- Runtime: add `console.assert` guards where shared configs are loaded to verify `PLAYER_COUNT === 2` and `STAKE_AMOUNT === 10`.
- Runtime: log every outbound shared socket event name once on server startup to confirm the new contract list.
- Manual: open both game routes and verify no screen shows leverage, liquidation, or collateral text.
- Manual: inspect socket payloads in browser devtools and confirm the new shared event names are emitted.

## Phase 2: Install Shared Match Lifecycle On The Backend

### Goal

Convert the multiplayer server from a trading room manager into a match/session manager.

### Exact Code Changes

- Create `frontend/app/api/socket/multiplayer/match-state.server.ts`
  - Add match state machine with `waiting`, `funding`, `ready`, `in_progress`, `result_ready`, `settlement_pending`, `settled`, `aborted`.
- Create `frontend/app/api/socket/multiplayer/match-log.server.ts`
  - Add append-only action log with monotonically increasing `serverSequence`.
- Create `frontend/app/api/socket/multiplayer/result-artifact.server.ts`
  - Add `buildResultArtifact(match, actionLog, outcome)`.
- Create `frontend/app/api/socket/multiplayer/settlement-handoff.server.ts`
  - Add temporary bridge interface returning `pending`, `noop`, `recorded`, `failed`.
- Modify `frontend/app/api/socket/multiplayer/room.manager.ts`
  - Rename room-owned concepts from trading to match lifecycle.
  - Remove `openPositions`, `closedPositions`, `playerLeverage`.
  - Add `status`, `readyStateByPlayer`, `fundingStateByPlayer`, `actionLog`, `stateVersion`, `resultArtifact`, `resolvedOutcome`.
  - Keep Hyper Swiper active coin tracking only as game-specific runtime state.
- Modify `frontend/app/api/socket/multiplayer/room-registry.server.ts`
  - Stop storing leverage in waiting-player metadata.
  - Keep matchmaking and waiting-pool responsibilities only.
  - Remove dead `lastGameMeta` methods if unused.
- Modify `frontend/app/api/socket/multiplayer/game-loop.server.ts`
  - Emit `match_started` instead of `game_start`.
  - Use shared match state transitions.
- Modify `frontend/app/api/socket/multiplayer/index.ts`
  - Replace `find_match`, `scene_ready`, `end_game`, disconnect, and room cleanup flows with explicit match-state transitions.
  - Route all gameplay actions through `match_action_applied`.
  - Emit `match_updated` whenever readiness/funding/status changes.
  - Emit `match_result_ready` when the backend has a resolved winner and artifact.
- Remove `frontend/app/api/socket/multiplayer/liquidation.server.ts`
- Remove `frontend/app/api/socket/multiplayer/settlement.server.ts`
- Remove price-settlement coupling from `frontend/app/api/socket/multiplayer/price-feed.server.ts`
  - Keep file only if Hyper Swiper still uses market motion as a visual input.
  - Do not let it affect official outcome.

### Deliverables

- Backend match state machine exists.
- Backend action log exists.
- Backend result artifact builder exists.
- Backend emits shared match lifecycle events.
- Trading settlement and liquidation pipeline is removed from the core flow.

### Exit Criteria

- A full match can move from waiting to result-ready without touching `position`, `liquidation`, or `pnl` code paths.
- Disconnect path resolves to `aborted` or `result_ready` through the shared lifecycle.
- No core backend file imports the deleted liquidation/settlement modules.

### Feedback Loops

- Runtime: log every lifecycle transition with `matchId`, `from`, `to`, `stateVersion`.
- Runtime: assert `stateVersion` increments on every applied action.
- Runtime: assert action log sequence numbers are contiguous.
- Manual: start two clients, find a match, and verify the server logs lifecycle transitions in order.
- Manual: disconnect one player mid-match and verify the other client receives `match_aborted` or the configured result path.

## Phase 3: Replace Game Outcome Logic With Deterministic Zero-Sum Reducers

### Goal

Make both games resolve through deterministic zero-sum state transitions instead of independent market positions.

### Exact Code Changes

- Create `frontend/domains/hyper-swiper/shared/match-rules.ts`
  - Add Hyper Swiper reducer input/output types.
  - Add `applyHyperSwiperAction(state, action)`.
  - Add `resolveHyperSwiperOutcome(state)`.
- Create `frontend/domains/tap-dancer/shared/match-rules.ts`
  - Add Tap Dancer reducer input/output types.
  - Add `applyTapDancerAction(state, action)`.
  - Add `resolveTapDancerOutcome(state)`.
- Create `frontend/app/api/socket/multiplayer/game-rules.server.ts`
  - Dispatch shared authoritative actions to the correct game reducer.
- Modify `frontend/app/api/socket/multiplayer/index.ts`
  - Hyper Swiper: replace `slice_coin` -> position creation with `slice_action_submitted`.
  - Tap Dancer: replace `open_position`/`close_position` with `tap_action_submitted`.
  - Apply reducer output to match state.
  - Update zero-sum match ledger after each accepted action.
- Modify `frontend/app/api/socket/multiplayer/game-loop.server.ts`
  - Hyper Swiper coin spawns remain authoritative.
  - Match end resolves through reducer state, not market close price.
- Modify `frontend/domains/hyper-swiper/client/phaser/systems/CollisionSystem.ts`
  - Emit game-native slice actions only.
  - Remove local assumption that slicing opens a market position.
- Modify `frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts`
  - Emit game-native tap actions only.
  - Remove balance/collateral gating based on position cost.
- Modify `frontend/domains/tap-dancer/client/phaser/systems/PositionCardSystem.ts`
  - Replace with score/status card system or remove if no longer needed.
- Modify `frontend/domains/tap-dancer/client/phaser/systems/PriceGraphSystem.ts`
  - Keep only if it is cosmetic.
  - Remove dependencies on profit/loss and liquidation events.

### Deliverables

- Hyper Swiper reducer exists.
- Tap Dancer reducer exists.
- Shared backend dispatch exists.
- Official winner is produced by reducer state and zero-sum ledger only.

### Exit Criteria

- Match winner can be resolved from `match state + action log` only.
- Backend no longer reads BTC price to decide winner.
- Hyper Swiper and Tap Dancer both use the same authoritative action envelope.

### Feedback Loops

- Runtime: print final `ResolvedMatchOutcome` and a short `ResultArtifact` summary at match end.
- Runtime: assert zero-sum ledger invariant after every action: `playerA_delta + playerB_delta === 0`.
- Runtime: assert winner resolution is deterministic by replaying the action log once on match completion and comparing the outcome in-memory.
- Manual: play full matches in both games and verify the same winner is reported after replay log validation.
- Manual: inspect emitted action payloads and confirm they are game-native, not position-based.

## Phase 4: Migrate Frontend State To Match/Result State

### Goal

Replace trading stores and UI semantics with match lifecycle, gameplay state, and result state.

### Exact Code Changes

- Create `frontend/domains/match/client/state/match.store.ts`
  - Shared Zustand store for lifecycle, readiness, funding state, result state, and action stream.
- Create `frontend/domains/match/client/state/match.types.ts`
  - Shared client state types aligned with `frontend/domains/match/types.ts`.
- Modify `frontend/domains/hyper-swiper/client/state/trading.types.ts`
  - Rename to match/gameplay types or remove if fully replaced.
- Modify `frontend/domains/hyper-swiper/client/state/slices/index.ts`
  - Remove `openPositions`, `gameSettlement`, `handlePositionLiquidated`, `closePosition`, leverage state, collateral toasts, price-driven PnL logic.
  - Subscribe to shared match lifecycle and Hyper Swiper reducer outputs.
- Modify `frontend/domains/tap-dancer/client/state/trading.types.ts`
  - Rename to match/gameplay types or remove if fully replaced.
- Modify `frontend/domains/tap-dancer/client/state/slices/index.ts`
  - Remove `openPositions`, `handlePositionOpened`, `handlePositionClosed`, `handlePositionLiquidated`, leverage state, balance/collateral assumptions.
  - Subscribe to shared match lifecycle and Tap Dancer reducer outputs.
- Modify `frontend/domains/hyper-swiper/client/components/screens/GameOverModal.tsx`
  - Replace PnL/balance display with stake resolution, winner, reason, and result summary.
- Modify `frontend/domains/tap-dancer/client/components/screens/GameOverModal.tsx`
  - Replace PnL/balance display with stake resolution, winner, reason, and result summary.
- Modify `frontend/domains/hyper-swiper/client/components/screens/MatchmakingScreen.tsx`
  - Replace wallet/trading readiness language with match readiness + stake readiness.
- Modify `frontend/domains/tap-dancer/client/components/screens/MatchmakingScreen.tsx`
  - Replace wallet/trading readiness language with match readiness + stake readiness.
- Modify `frontend/domains/hyper-swiper/client/components/modals/HowToPlayModal.tsx`
  - Remove BTC prediction, leverage, collateral, liquidation, PnL copy.
- Modify `frontend/domains/tap-dancer/client/components/modals/OnboardingModal.tsx`
  - Remove trading, long/short, liquidation, profit wording.
- Modify `frontend/platform/ui/GameSelectionScreen.tsx`
  - Replace game descriptions that say trading.
- Modify `frontend/domains/hyper-swiper/meta.config.ts`
  - Replace trading-focused description.
- Modify `frontend/domains/tap-dancer/meta.config.ts`
  - Replace trading-focused description.

### Deliverables

- Shared match store exists.
- Both game stores consume match lifecycle state instead of trading state.
- Result screens show match outcome semantics.
- Public UI no longer uses perp/trading copy.

### Exit Criteria

- No client component renders leverage, liquidation, PnL, collateral, or final balance.
- Both games can join, start, play, and finish through the shared match store.
- Game selection and onboarding copy align with zero-sum match semantics.

### Feedback Loops

- Runtime: add dev-only logs in the shared store for `match status`, `stateVersion`, and `last authoritative action`.
- Runtime: assert that no deprecated socket event names are handled by the client stores.
- Manual: inspect both game UIs end-to-end and verify no trading terminology remains.
- Manual: reload during matchmaking and during a live match to verify the store rehydrates to the latest lifecycle state from the server.

## Phase 5: Add Funding/Settlement Bridge Without Polluting Core Logic

### Goal

Introduce temporary readiness and settlement bridge services behind explicit boundaries.

### Exact Code Changes

- Create `frontend/app/api/socket/multiplayer/funding-readiness.server.ts`
  - Add temporary funding status resolver: `not_ready`, `checking`, `ready`, `blocked`.
- Create `frontend/app/api/socket/multiplayer/result-store.server.ts`
  - Persist `ResultArtifact` and `ResolvedMatchOutcome`.
- Modify `frontend/app/api/socket/multiplayer/settlement-handoff.server.ts`
  - Add temporary no-op or record-only handoff implementation.
- Modify `frontend/app/api/socket/multiplayer/index.ts`
  - Add pre-match funding readiness transition before `ready`.
  - Add post-result settlement handoff transition after `result_ready`.
- Modify `frontend/platform/auth/mini-app.hook.ts`
  - Expose wallet/session status only as input to readiness checks.
  - Do not embed settlement assumptions.
- Modify `frontend/platform/auth/privy.config.ts`
  - Keep auth only.
  - Do not add game-logic assumptions here.
- Modify `frontend/app/providers.tsx`
  - If needed, provide shared match/funding bridge context only.

### Deliverables

- Funding readiness bridge exists.
- Result artifact persistence exists.
- Settlement handoff bridge exists.
- Match lifecycle explicitly separates `ready`, `result_ready`, `settlement_pending`, and `settled`.

### Exit Criteria

- A match can be blocked before start without touching gameplay code.
- A match can finish and enter settlement handoff without changing resolved gameplay outcome.
- Core reducers and shared match types do not import funding or settlement bridge files.

### Feedback Loops

- Runtime: log readiness resolution per player before match start.
- Runtime: log persisted `ResultArtifact` IDs and settlement handoff state changes.
- Runtime: assert that settlement handoff is called only after `result_ready`.
- Manual: simulate a blocked readiness case and verify the UI stays in pre-match state.
- Manual: complete a match and verify a result artifact is stored before settlement handoff logs appear.

## Phase 6: Remove Deprecated Trading Paths

### Goal

Delete dead trading/perp code after the new path is live.

### Exact Code Changes

- Remove deprecated handlers from `frontend/app/api/socket/multiplayer/index.ts`
  - `close_position`
  - `open_position`
  - trading-flavored balance updates
- Remove deprecated state fields and helpers from:
  - `frontend/domains/hyper-swiper/client/state/`
  - `frontend/domains/tap-dancer/client/state/`
- Remove obsolete UI/components:
  - `frontend/domains/hyper-swiper/client/components/effects/PositionIndicator.tsx`
  - any Tap Dancer position-card components not repurposed
- Remove unused price/PnL helpers if no longer used:
  - `frontend/platform/utils/price.utils.ts` only if all official logic is detached
- Remove stale planning/notes only if they block current engineering decisions:
  - `plans/perp-style-positions.md`
  - `plans/real-money-integration-plan.md`

### Deliverables

- Deprecated trading path is deleted.
- Socket API no longer supports trading-only events.
- Client code no longer has dead trading store branches.

### Exit Criteria

- Search for `liquidation`, `collateral`, `leverage`, `open_position`, `close_position`, `realizedPnl`, and `finalBalance` only returns cosmetic leftovers explicitly kept or archived docs.
- The runtime path for both games uses only shared match lifecycle + per-game reducers + bridge services.

### Feedback Loops

- Runtime: boot server and verify no missing-import errors from deleted modules.
- Runtime: inspect client console for unknown socket event warnings.
- Manual: run through both games and confirm no deleted event name is emitted or handled.
- Manual: grep the repo for deprecated symbols and review any remaining hits before deleting the next batch.
