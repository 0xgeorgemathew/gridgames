# Zero-Sum Regression Investigation and Fix Plan

## Objective

Investigate and fix the current regression where both Hyper Swiper and Tap Dancer still behave like Pep Dex instead of the intended temporary zero-sum game flow.

Current expected temporary rules:
- Opening a position does not deduct player balance
- Player balance changes only when money is actually won or lost
- A position can only be closed when the prediction is currently correct
- A correct close transfers money from the opponent to the closer
- Position indicators in both games must reflect the new closeability/correctness state

This plan is backend + frontend only.

## Confirmed Findings

### 1. The live backend still runs the old Pep Dex flow

- Hyper Swiper still deducts on open inside `handleSlice()` in [frontend/app/api/socket/multiplayer/index.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/index.ts#L84).
- Tap Dancer still deducts on open inside `open_position` in [frontend/app/api/socket/multiplayer/index.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/index.ts#L640).
- Both games still settle manual close with leveraged PnL and credit `collateral + pnl` in [frontend/app/api/socket/multiplayer/index.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/index.ts#L462).
- Legacy end-of-game settlement still computes `totalPnl`, `finalBalance`, and nullable winner in [frontend/app/api/socket/multiplayer/settlement.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/settlement.server.ts).
- Player win/lose state in the room is still based on `dollars` depletion in [frontend/app/api/socket/multiplayer/room.manager.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/room.manager.ts#L198).

### 2. The clients are still wired to legacy trading events and legacy balance semantics

- Hyper store still listens to `balance_updated` and mutates `players[].dollars` on every open/close in [frontend/domains/hyper-swiper/client/state/slices/index.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/state/slices/index.ts#L183).
- Tap store does the same in [frontend/domains/tap-dancer/client/state/slices/index.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/state/slices/index.ts#L181).
- Both stores still emit legacy close events directly:
- [frontend/domains/hyper-swiper/client/state/slices/index.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/state/slices/index.ts#L328)
- [frontend/domains/tap-dancer/client/state/slices/index.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/state/slices/index.ts#L287)

### 3. Position indicator UI still models live PnL, not “correct / cannot close yet”

- Hyper Position Indicator computes live leveraged PnL and uses that as the interaction state in [frontend/domains/hyper-swiper/client/components/effects/PositionIndicator.tsx](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/components/effects/PositionIndicator.tsx#L244).
- Tap Position Cards compute live PnL percent, show profit/loss coloring, and show close settlement text from realized PnL in [frontend/domains/tap-dancer/client/phaser/objects/PositionCard.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/phaser/objects/PositionCard.ts#L333).

### 4. The new match-domain path exists but is not the live source of truth

- New match lifecycle files exist:
- [frontend/app/api/socket/multiplayer/game-rules.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/game-rules.server.ts)
- [frontend/app/api/socket/multiplayer/result-artifact.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/result-artifact.server.ts)
- [frontend/domains/hyper-swiper/shared/match-rules.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/shared/match-rules.ts)
- [frontend/domains/tap-dancer/shared/match-rules.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/shared/match-rules.ts)
- But the live clients do not consume `match_created`, `match_started`, `match_action_applied`, or `match_result_ready`.
- The new reducer logic is also not aligned with the requested temporary gameplay. It awards points immediately for any action and still allows `winnerId: null` draws in:
- [frontend/domains/hyper-swiper/shared/match-rules.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/shared/match-rules.ts#L217)
- [frontend/domains/tap-dancer/shared/match-rules.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/shared/match-rules.ts#L217)

## Investigation Conclusion

This is a split-brain state:

- The live product path is still the old Pep Dex trading/event model.
- The new match-domain path is only partially added and not wired end-to-end.
- Finishing the unused match-domain path is larger scope than fixing the current regression.

## Recommended Fix Strategy

For this fix, do **not** try to finish the full match-domain migration.

Instead:

1. Patch the currently live socket/event path so it obeys the temporary zero-sum rules.
2. Update both game clients and both position indicators to reflect closeability/correctness instead of live PnL.
3. Quarantine or clearly mark the new match-domain files as non-live for now.
4. After the live behavior is correct, schedule a separate follow-up to either fully adopt the new match-domain path or delete the dead path.

This is the fastest path to correct gameplay with the lowest risk.

## Rules To Freeze Before Implementation

These need to be frozen before coding starts:

### Rule A: Transfer amount on successful close

Not defined in the current request. Recommended temporary rule:
- A successful close transfers a fixed `$10` from opponent to closer
- Transfer is capped by opponent remaining balance so balances never go below zero

If product wants a different amount, freeze it before implementation.

### Rule B: Incorrect or neutral predictions cannot close

Recommended rule:
- LONG can close only if `currentPrice > openPrice`
- SHORT can close only if `currentPrice < openPrice`
- Equal price means not closable

### Rule C: End-of-timer behavior for still-open positions

Not explicitly defined. Recommended temporary rule:
- Open positions that were never correctly closed simply expire with no transfer
- Timer-end winner is the player with higher actual balance
- If balances are equal at timer end, use stable room seat `player1` as hard fallback

If product wants a different timer-end rule, freeze it before implementation.

## Phased Plan

### Phase 0: Freeze temporary gameplay rules

Goal:
- Lock the exact temporary zero-sum behavior for this bug fix.

Files/systems:
- No code changes yet

Dependencies:
- None

Acceptance criteria:
- Fixed transfer amount is agreed
- Closeability rule is agreed
- Timer-end rule is agreed
- Tie fallback is agreed

### Phase 1: Patch the live backend path

Goal:
- Make the currently live socket handlers obey the temporary zero-sum rules.

Files/systems touched:
- [frontend/app/api/socket/multiplayer/index.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/index.ts)
- [frontend/app/api/socket/multiplayer/events.types.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/events.types.ts)
- [frontend/app/api/socket/multiplayer/room.manager.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/room.manager.ts)
- [frontend/app/api/socket/multiplayer/liquidation.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/liquidation.server.ts)
- [frontend/app/api/socket/multiplayer/settlement.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/settlement.server.ts)

Backend changes in this phase:
- Remove all balance deduction on open for both `slice_coin` and `open_position`
- Remove “insufficient balance to open position” gating tied to collateral deduction
- Change `close_position` so the server authoritatively rejects close if the prediction is not currently correct
- Replace realized leveraged PnL settlement with fixed transfer-on-correct-close
- Debit loser balance and credit winner balance in one server-authoritative operation
- Emit new close payload fields needed by UI, for example:
- whether close was allowed
- whether prediction was correct
- amount transferred
- winner/loser player ids for that close
- Ensure open-time `balance_updated` is no longer emitted
- Keep `balance_updated` only for actual money transfer events
- Disable or bypass legacy liquidation logic if it conflicts with the temporary rules
- Stop using legacy end-of-game `totalPnl/finalBalance` as the deciding outcome

Dependencies:
- Phase 0

What can run in parallel:
- Frontend type/store preparation can start once payload shape is frozen

Acceptance criteria:
- Opening a position never changes balance
- Incorrect close attempts are rejected by the server
- Correct close attempts transfer money from opponent to closer
- No close path uses leveraged PnL

### Phase 2: Update shared client contract and stores

Goal:
- Make both clients consume the new live backend behavior instead of legacy Pep Dex assumptions.

Files/systems touched:
- [frontend/domains/hyper-swiper/shared/trading.types.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/shared/trading.types.ts)
- [frontend/domains/tap-dancer/shared/trading.types.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/shared/trading.types.ts)
- [frontend/domains/hyper-swiper/client/state/trading.types.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/state/trading.types.ts)
- [frontend/domains/tap-dancer/client/state/trading.types.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/state/trading.types.ts)
- [frontend/domains/hyper-swiper/client/state/slices/index.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/state/slices/index.ts)
- [frontend/domains/tap-dancer/client/state/slices/index.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/state/slices/index.ts)

Client/store changes in this phase:
- Remove store assumptions that balance changes on open
- Replace `realizedPnl`-driven close handling with transfer-result handling
- Add position-level derived state for:
- `isCurrentlyCorrect`
- `canClose`
- `closeBlockedReason`
- Keep price feed for correctness calculations and presentation
- Ensure optimistic UI does not show a successful close unless server confirms it
- Stop treating deprecated settlement payloads as the primary result source

Dependencies:
- Phase 1 payload freeze

What can run in parallel:
- Hyper store work
- Tap store work

Acceptance criteria:
- Both stores keep balance unchanged on open
- Both stores expose correctness/closeability state for indicators
- Both stores apply balance changes only on actual transfer events

### Phase 3: Fix Hyper Swiper position indicator and result UI

Goal:
- Make Hyper Swiper show correctness-based closeability instead of live PnL profitability.

Files/systems touched:
- [frontend/domains/hyper-swiper/client/components/effects/PositionIndicator.tsx](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/components/effects/PositionIndicator.tsx)
- [frontend/domains/hyper-swiper/client/components/hud/GameHUD.tsx](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/components/hud/GameHUD.tsx)
- [frontend/domains/hyper-swiper/client/components/hud/CompactPriceRow.tsx](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/components/hud/CompactPriceRow.tsx)
- [frontend/domains/hyper-swiper/client/components/screens/GameOverModal.tsx](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/components/screens/GameOverModal.tsx)
- [frontend/domains/hyper-swiper/client/components/modals/HowToPlayModal.tsx](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/client/components/modals/HowToPlayModal.tsx)

Hyper changes in this phase:
- Replace live PnL text with correctness/close-ready text
- Only make the close affordance interactive when the position is currently correct
- Show “waiting”, “correct”, and “closed won/lost transfer” states instead of profit/loss PnL states
- Remove tie handling from result UI if the frozen rules forbid ties
- Update tutorial copy to match the temporary simplified rules

Dependencies:
- Phase 2

What can run in parallel:
- Fully parallel with Phase 4

Acceptance criteria:
- Hyper position cards do not imply live leveraged profit
- Close is visibly unavailable when prediction is wrong
- Result UI matches transfer-based balance changes, not PnL settlement

### Phase 4: Fix Tap Dancer position indicator and result UI

Goal:
- Make Tap Dancer show correctness-based closeability instead of live PnL profitability.

Files/systems touched:
- [frontend/domains/tap-dancer/client/phaser/objects/PositionCard.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/phaser/objects/PositionCard.ts)
- [frontend/domains/tap-dancer/client/phaser/systems/PositionCardSystem.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/phaser/systems/PositionCardSystem.ts)
- [frontend/domains/tap-dancer/client/phaser/systems/TradingSceneServices.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/phaser/systems/TradingSceneServices.ts)
- [frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/phaser/systems/ButtonSystem.ts)
- [frontend/domains/tap-dancer/client/phaser/systems/PriceGraphSystem.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/phaser/systems/PriceGraphSystem.ts)
- [frontend/domains/tap-dancer/client/components/hud/GameHUD.tsx](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/components/hud/GameHUD.tsx)
- [frontend/domains/tap-dancer/client/components/hud/CompactPriceRow.tsx](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/components/hud/CompactPriceRow.tsx)
- [frontend/domains/tap-dancer/client/components/screens/GameOverModal.tsx](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/components/screens/GameOverModal.tsx)
- [frontend/domains/tap-dancer/client/components/modals/OnboardingModal.tsx](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/client/components/modals/OnboardingModal.tsx)

Tap changes in this phase:
- Replace live PnL percent rendering with correctness/close-ready state
- Only enable position close interaction when the prediction is correct
- Remove button-state assumptions tied to collateral deduction on open
- Update graph/card effects so “success” and “failure” are tied to transfer outcome, not realized PnL
- Update onboarding and result UI to match the simplified rule set

Dependencies:
- Phase 2

What can run in parallel:
- Fully parallel with Phase 3

Acceptance criteria:
- Tap position cards do not imply live leveraged profit
- Close is visibly unavailable when prediction is wrong
- Balance only changes on successful transfer events

### Phase 5: Quarantine dead or misleading zero-sum match path code

Goal:
- Reduce future confusion by marking the partially integrated match-domain path as non-live or removing risky overlap.

Files/systems touched:
- [frontend/app/api/socket/multiplayer/game-rules.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/game-rules.server.ts)
- [frontend/app/api/socket/multiplayer/result-artifact.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/result-artifact.server.ts)
- [frontend/app/api/socket/multiplayer/settlement-handoff.server.ts](/Users/george/Workspace/grid-games/frontend/app/api/socket/multiplayer/settlement-handoff.server.ts)
- [frontend/domains/hyper-swiper/shared/match-rules.ts](/Users/george/Workspace/grid-games/frontend/domains/hyper-swiper/shared/match-rules.ts)
- [frontend/domains/tap-dancer/shared/match-rules.ts](/Users/george/Workspace/grid-games/frontend/domains/tap-dancer/shared/match-rules.ts)
- [frontend/domains/match/types.ts](/Users/george/Workspace/grid-games/frontend/domains/match/types.ts)

Work in this phase:
- Mark unused match-domain code as non-authoritative for the current release path
- Remove misleading draw/null-winner assumptions if these files remain referenced
- Document that the live product currently uses patched legacy events until a full match-domain cutover happens

Dependencies:
- Phases 1 through 4

What can run in parallel:
- One cleanup agent can do this while verification is ongoing

Acceptance criteria:
- There is one clear live authority path in the repo
- Future implementers will not mistake unused match-domain code for the current runtime path

### Phase 6: Verification matrix

Goal:
- Verify the bug is fixed in real gameplay for both games.

Checks:
- Open position in Hyper Swiper: balance unchanged
- Open position in Tap Dancer: balance unchanged
- Wrong-direction open position cannot close
- Correct-direction open position can close
- Successful close moves money from loser to winner
- Opponent balance is capped at zero and never goes negative
- Position indicator updates between wrong and correct states as price changes
- Timer-end result uses the frozen rule set
- `bun run types` passes in `frontend/`

## Recommended Agent Split

### Agent 1: Backend live-path owner

Owns:
- Phase 1

Reason:
- All money movement and close validation must have one server authority owner.

### Agent 2: Shared client contract/store owner

Owns:
- Phase 2

Reason:
- Both games still share the same broken legacy event/state assumptions.

### Agent 3: Hyper Swiper UI owner

Owns:
- Phase 3

Reason:
- Hyper position indicator is React-driven and independent from Tap’s Phaser card path.

### Agent 4: Tap Dancer UI owner

Owns:
- Phase 4

Reason:
- Tap uses a separate Phaser rendering path and needs dedicated handling.

### Agent 5: Cleanup + verification owner

Owns:
- Phases 5 and 6

Reason:
- Keeps dead-path cleanup and regression verification off the critical path.

## Risks

- The transfer amount is not frozen yet. Implementation should not start without that rule.
- Timer-end behavior for unresolved positions is not frozen yet.
- If liquidation remains enabled, it will likely conflict with the simplified “close only when correct” temporary rule set.
- The current repo contains partially integrated match-domain code that can cause more regressions if someone tries to “finish it” inside this bug-fix scope.
- Hyper and Tap both still use deprecated settlement/result types. Those deprecated shapes can easily leak back in unless the store migration is done first.
