# Gameplay performance audit — 2026-10-10

Scope: active Stock Ninja, Hyper Swiper and Tap Dancer gameplay, including animation continuity, input, React updates and transport failure. The audit examined the working tree, including the existing uncommitted HUD changes. The audit phase changed no gameplay implementation; the follow-up implementation and validation are recorded below. Evidence line anchors describe the pre-change source.

## Evidence and limits

- Source-level reproductions imported the actual motion, Token, BladeRenderer and Zustand store implementations. Phaser display objects were stubbed; these establish logic and notification behavior, not GPU cost or browser FPS.
- An isolated execution of Stock Ninja's existing disconnect callback recorded its state writes.
- `bun run test` in `frontend/`: **57 passed, 0 failed** across 15 files. These tests do not establish animation smoothness or cover the full Stock Ninja disconnect UI.
- Live follow-up: played two Stock Ninja matches between the two existing signed-in Chrome profiles at `pivot.gridgames.space/stock-arcade`, recording the foreground profile with Chrome DevTools Performance. Both rounds reached results. No real funds were involved.
- Baseline recording: 54.287 seconds, normal CPU/network, two confirmed catches. Stress recording: 57.878 seconds, 4× CPU slowdown, seven confirmed catches, catch bursts and opening/closing the bag panel. Screenshots were disabled during capture; JavaScript sampling remained enabled. The foreground viewport was 1309×2083 CSS pixels, DPR 1. The other profile stayed connected in the background.
- Native accessibility clicks exercised catches. Continuous drag/swipe automation could not be completed, so swipe-path cost remains unmeasured. CPU slowdown is a desktop stress test, not validation on a physical phone. These were two different rounds, not a controlled before/after comparison.
- RAF measurements below are intervals between `FireAnimationFrame` callbacks, not exact presented-frame FPS. No React-specific commit profile or GPU bottleneck diagnosis was collected. Network jitter and disconnect findings remain source-level reproductions, not live fault-injection results.
- Priorities reflect failure severity and measured work, not predicted millisecond savings from unimplemented changes. Exported traces remain local at `/tmp/StockNinja-baseline.json.gz` and `/tmp/StockNinja-cpu4x.json.gz`.

## Live Stock Ninja results

**Normal CPU:** 3,255 animation-callback intervals had a median of 16.67ms, p95 of 17.63ms, p99 of 17.80ms and maximum of 22.46ms. None exceeded 25ms. No renderer task starting inside the recording exceeded 50ms; a 56ms task crossed the recording boundary. Catch click events took approximately 43–68ms according to EventTiming; DevTools reported INP 68ms. Ordinary play in this recording showed consistent callback pacing.

**4× CPU:** 3,287 intervals had a median of 16.65ms, p95 of 19.06ms, p99 of 22.71ms and maximum of **73.22ms**. Seventeen exceeded 25ms and five exceeded 50ms. One >50ms gap occurred near round startup; three occurred during catch bursts (50.38–55.52ms); the largest occurred while opening the bag. DevTools reported INP 97ms. This reproduced intermittent hitches under reduced CPU availability.

**Concrete bag-panel hitch:** at 28.17 seconds in the stress trace, opening the bag produced a **55.62ms renderer task** containing **27.05ms of synchronous layout**, followed by the 73.22ms animation-callback gap. The layout stack points to `StockArcadeClient-C4cWFmXi.js:2:10312`, which maps in the matching local built asset to the HUD's panel-focus effect: [StockGameUI.tsx](../frontend/domains/stock-arcade/client/StockGameUI.tsx#L205). The click's EventTiming duration was 96.07ms. Focus flushes the pending panel layout; the stack establishes the trigger, not that focus alone accounts for all layout work.

Optimize panel mounting/layout and isolate its rendering from the frame clock while **preserving keyboard focus behavior**. Investigate containment and focus timing with a fresh trace; do not remove accessible focus management as a shortcut. This is a measured interaction target alongside the source-reproduced continuity and disconnect bugs below.

**Repeated rendering cost:** the baseline recorded 3,358 layouts totaling 194.62ms and 3,347 style/layout-tree updates totaling 454.68ms. At 4× CPU these totals were 789.39ms and 1,670.32ms, respectively. DevTools scripting totals were approximately 2.73s baseline and 13.81s under slowdown. This supports reducing per-frame React/style/layout work, although neither total attributes all work exclusively to the game animation. Normal-speed layout events were individually small (maximum 0.60ms). The baseline's longest major GC event was 2.15ms; the stress trace's was 12.70ms, so the largest observed hitch did not come from a long GC pause.

## 1. High priority: Stock Ninja can remain stuck in an interrupted match

Evidence: [disconnect handler](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L131), [animation loop](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L115), [result/reset controls](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L556), [transport reconnect](../frontend/platform/multiplayer/client.ts#L111).

The disconnect callback clears connection flags, reservations and feedback, but does not clear or transition `game` or `stateRef`. A playing game remains `playing`. The animation effect depends only on that status, so it keeps scheduling React updates even after cutoff, when the visible arena can be empty and the timer is zero. Ready/valuing screens can also remain stranded.

Transport failure reconnects to the lobby with a fresh identity; it does not resume the old room. The result overlay and Play Again action require a terminal state, while Exit only sends `end_game` over the socket. A dropped client cannot rely on receiving the old room's cancellation event.

Reproduction: executed the callback with `game.status = 'playing'`; connection became false, **zero game-state writes occurred**, and the animation effect's condition remained true.

Recommendation: explicitly transition interrupted active matches to a local interrupted/cancelled presentation with a working local return-to-lobby action. Stop animation and input, clear transient state, and preserve already completed results and their original player identity. Keep intentional transport handoff behavior unchanged. Test disconnect during ready, playing and valuing, plus completed-result reconnection.

## 2. High priority: server clock corrections can rewind stock tosses

Evidence: [offset replacement](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L172), [frame clock](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L119), [dropPoint](../frontend/domains/stock-arcade/client/motion.ts#L4), [state publication](../frontend/domains/stock-arcade/server/match.ts#L251).

Every `arcade_state` replaces the offset with `serverTime - Date.now()`. That sample includes one-way delivery delay. A later packet with greater delay moves the estimated time backward; a faster packet jumps it forward. Both toss positions and trail aging use that clock. State publishes at launches and claim reservation/settlement, so the discontinuity can coincide with catches.

Reproduction using the actual `dropPoint`: increase delivery delay from 20ms to 170ms between two frames 16.67ms apart. At 1,000ms into the center toss, estimated time moves **133.33ms backward** and the disc moves **35.36px downward** in a 600px-tall arena instead of continuing upward.

Recommendation: anchor a continuous presentation clock to monotonic local time and gradually reconcile server-time samples. Use the same presentation position for drawing and local hit testing; keep authoritative spawn/expiry/cutoff and claim validation on the server. Preserve the already separate monotonic de-rez clock. Test jitter, cutoff and background/resume explicitly.

## 3. High-value profiling target: Stock Ninja renders its whole React screen per frame

Evidence: [setClock in RAF](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L115), [disc subtree](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L455), [HUD props](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L529), [HUD](../frontend/domains/stock-arcade/client/StockGameUI.tsx#L169), [disc artwork](../frontend/domains/stock-arcade/client/StockEffects.tsx#L17).

Each delivered animation frame sets a new root clock object. The component recalculates and reconciles its HUD, disc SVG artwork and effects. Pointer movement additionally sets trail state. Static SVG circles/arcs are recreated as React elements even when only position changes. The HUD receives changing millisecond `remaining`, although its timer displays whole seconds. Open bag/settings panels also participate in these updates.

At a display delivering 60/120 RAF callbacks per second, the code requests 60/120 root clock updates per second. The live traces confirm roughly 60 animation callbacks per second and repeated style/layout work; actual React commit counts remain unmeasured, and batching can combine updates. Normal CPU sustained regular callback pacing, while catch bursts and bag opening produced gaps under 4× slowdown.

Recommendation: isolate continuous motion/effect drawing from the page and HUD. Update disc transforms through one local frame owner; keep React responsible for drop identity, contacts, authoritative ledger events and controls. Give the timer a whole-second update boundary, memoize static artwork and stabilize callback props. Merely adding `memo` to a HUD receiving millisecond props will not solve this. Profile three simultaneous hits with both HUD panels open/closed.

## 4. High-value profiling target: stock motion changes layout properties

Evidence: [left/top writes](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L470), [pointer geometry read](../frontend/domains/stock-arcade/client/StockArcadeClient.tsx#L272), [disc CSS](../frontend/domains/stock-arcade/client/stock-game.css#L9).

Every moving disc changes `left` and `top`; rotation is already a transform. `will-change: top, left` does not make these layout properties compositor-only. Pointer moves call `getBoundingClientRect`, and swipe rendering reads `clientWidth`, which can require layout to be brought up to date after writes. This establishes a layout/read hot path. The live baseline measured frequent but small layout events; the stress trace's largest forced layout came from HUD focus, not the swipe geometry read. Continuous swiping still needs its own trace.

Recommendation: position the disc at a stable origin and combine translation and rotation into its transform. Retain inverse rotation on the logo face. Cache arena geometry and invalidate it on relevant resize/HUD/viewport changes; preserve pointer coordinates and responsive collision radii. [Chrome animation guidance](https://web.dev/articles/animations-guide) recommends transform/opacity for animations that can avoid layout and paint.

## 5. Medium priority: Phaser rendering is deliberately detached from display refresh

Evidence: [Hyper Swiper config](../frontend/domains/hyper-swiper/client/phaser/config.ts#L102), [Tap Dancer config](../frontend/domains/tap-dancer/client/phaser/config.ts#L62).

Both set `forceSetTimeOut: true`, `target: 60` and `smoothStep: false`. Installed Phaser 3.90 source confirms this schedules a recurring timer at `1000 / targetFps`, rather than RAF. Timer callbacks need not align with browser presentation, creating a frame-pacing risk even when individual frames are inexpensive. The computed `targetFrameRate` is not used by either factory.

Recommendation: compare RAF-driven rendering against the current timer path on 60Hz and high-refresh displays. Keep fixed-step physics separate from rendering. `target` is not a hard RAF frame limit; explicitly decide the refresh/limit policy. Audit frame-based effect decay before allowing higher render rates (e.g. graph particles/flash multiply by fixed factors per frame). [Phaser TimeStep documentation](https://docs.phaser.io/api-documentation/3.88.2/class/core-timestep) describes the two scheduling paths; the installed 3.90 implementation was checked directly.

## 6. Medium priority: Hyper Swiper's blade never ages out while stationary

Evidence: [blade path/draw](../frontend/domains/hyper-swiper/client/phaser/systems/BladeRenderer.ts#L98), [input lifecycle](../frontend/domains/hyper-swiper/client/phaser/systems/InputAudioSystem.ts#L42), [collision use](../frontend/domains/hyper-swiper/client/phaser/systems/CollisionSystem.ts#L72).

Blade points have no timestamp. If the pointer stops inside the arena without up/out/blur, the ribbon remains and its collision segments remain active. Desktop pointer movement adds points without requiring a pressed button. The code rebuilds the ribbon every frame and can test newly arriving coins against old movement.

Reproduction: add two points, call the actual blade draw method **600 times without new input**; two points and three active collision segments remain.

Recommendation: use short monotonic lifetimes for visual points and collision segments; consume or expire stale movement. Preserve whichever hover-versus-drag input behavior is intended. Test pointer stop, release, cancel, tab hide and resume.

## 7. Medium priority: Hyper Swiper disc motion falls behind after slow frames

Evidence: [Token.preUpdate](../frontend/domains/hyper-swiper/client/phaser/objects/Token.ts#L159).

The delta is clamped to 50ms before movement. A 100ms frame advances only 50ms of motion, permanently discarding the other half. Server expiry still follows elapsed time. Under sustained slow rendering discs therefore move slowly and can be removed before finishing the expected path.

Reproduction: actual `preUpdate`, 100px/s horizontal velocity, zero gravity for isolation, one second of simulated frames: **100px at 60 FPS, 100px at 20 FPS, 50px at 10 FPS**.

Recommendation: derive these simple ballistic visuals from a consistent elapsed-time origin, or use bounded substeps with an explicit catch-up policy. Do not simply remove the clamp without considering long hidden-tab gaps. Keep server TTL authoritative and verify motion after 100–250ms stalls.

## 8. Smaller, verified reductions in repeated work

- **Duplicate store notifications:** each accepted price packet first writes connection health, then price data. In each real store, ten messages spaced 100ms apart produced **20 synchronous subscriber notifications and ten price changes**. The server price broadcast throttle is 100ms. Merge compatible writes and use narrow selectors in HUD/root subscribers; do not equate notification count with React commit count. Sources: [Hyper store](../frontend/domains/hyper-swiper/client/state/slices/index.ts#L128), [Tap store](../frontend/domains/tap-dancer/client/state/slices/index.ts#L121), [HUD whole-store subscription](../frontend/domains/hyper-swiper/client/components/hud/GameHUD.tsx#L17).
- **Position scans on unrelated updates:** the shared card subscriber iterates positions and clones the map on every store notification. Guard by position-map, closing-map and player-identity changes. [Card subscriber](../frontend/domains/match/client/phaser/positions/PositionCardSystem.ts#L116).
- **Unused spatial-index maintenance:** Hyper updates the grid whenever a coin moves more than one pixel, but collision detection scans the token pool directly; repository search found no call to `getCoinsNearLine`. Remove the maintenance if keeping the small-pool scan, or deliberately wire a correct broad phase if density warrants it. [Maintenance](../frontend/domains/hyper-swiper/client/phaser/systems/CoinLifecycleSystem.ts#L179), [collision loop](../frontend/domains/hyper-swiper/client/phaser/systems/CollisionSystem.ts#L81).
- **Static exhaust redraw:** each active Token clears and redraws the same two local exhaust lines every frame. Draw them once per spawn/configuration and let the parent transform move them. [Exhaust](../frontend/domains/hyper-swiper/client/phaser/objects/Token.ts#L177).

## Preserve existing safeguards

Stock de-rez already uses a cached contact-local raster, precomputed cell geometry, a monotonic contact clock and no additional RAF. It cleans up its image callback and ResizeObserver. Stock audio voices and contacts are bounded; stock lobby/results stop the animation clock. Original coins and many textures are pooled/cached. These should not be rewritten or visually degraded without profiling evidence.

The audit's remaining runtime checks were physical-device play with continuous swiping, packet-delay variation, hide/resume, and disconnect/reconnect. Capture React commit cost/count and outstanding animation work after termination. Resolve the disconnect and clock-continuity bugs first; isolate Stock Ninja's frame updates and address the measured bag-panel layout hitch next. Measure each change independently. The Hyper Swiper and Tap Dancer findings above are source-audited only; they were not part of these two live traces.

## Implementation follow-up — 2026-10-10

All identified implementation changes are applied. The existing HUD redesign is retained.

- **Interrupted matches:** disconnect transitions ready, playing and valuing matches to a local cancellation, clears reservations/effects, stops input/animation and provides the existing local Play Again return to the lobby. Completed results retain the original match player identity through reconnect. Exit also cancels locally, so it can finish without another server event. Intentional transport handoffs remain unchanged.
- **Continuous clock:** `client/presentation-clock.ts` anchors presentation to `performance.now()`, reconciles server samples at a maximum 10% rate adjustment, and retains a separate unsmoothed deadline estimate. Server spawn/expiry/cutoff validation is unchanged. Hit tests use the arena owner's last displayed positions; contact/trail lifetimes use monotonic local time.
- **Stock frame isolation:** `client/StockArena.tsx` owns the only gameplay RAF. It writes disc transforms directly; React owns drop identity, contacts and authoritative UI events. Only the bounded contact/ribbon subtree receives effect-frame state. The page/HUD receive whole-second timer changes, static disc artwork is memoized and callback props are stable. Lobby, results, hidden tabs and cutoff schedule no continuing arena frames.
- **Geometry/layout:** moving discs remain at a fixed origin and combine translation/rotation in their transform, retaining inverse logo rotation. Arena geometry is cached with ResizeObserver and resize/scroll/visual-viewport invalidation. Pointer input performs no per-move geometry reads. Resizing clears the previous gesture rather than joining incompatible coordinate systems.
- **Bag interaction:** panel layout/style containment and a memoized panel-content boundary isolate it from the frame and timer clocks. Focus occurs after the panel's initial paint with `preventScroll`; Escape, close buttons and trigger-focus restoration remain intact. HUD feedback fades/expiry no longer require millisecond React props.
- **Phaser scheduling policy:** both games render through native-refresh RAF (`forceSetTimeOut: false`, `limit: 0`), with physics fixed at 60Hz. The unused hardware-based frame-rate heuristic is removed. Blade flicker and graph/particle damping now depend on elapsed time; graph flashes have equal lifetimes at simulated 60/120 refresh. Native display cadence avoids timer/display misalignment without treating `target` as a frame cap.
- **Blade lifetime:** visual points expire after 180ms and collision movement after 70ms, aged by the newest segment endpoint so 100ms pointer-event delivery remains catchable. Desktop hover behavior remains. Release, cancel, arena exit, blur and tab hide clear input; resume cannot replay old segments.
- **Stalled token motion:** pooled Hyper tokens derive ballistic positions from their monotonic spawn origin, preserving the full elapsed motion after 100–250ms stalls. Long hidden gaps hide elapsed art without an unbounded integration step or consuming the server-owned coin identity. The original static exhaust is drawn once per spawn/configuration.
- **Repeated work:** accepted price packets publish health and price in one store write; throttled packets still refresh health. HUD/page subscriptions select only the fields they use. Card reconciliation runs only when position/closing-map references or player identity change; it retains immutable map references and protects delayed removal from a changed card identity. The unused spatial-grid maintenance is removed while retaining the existing bounded token-pool collision scan.

### Verification

- `bun run test`: **79 passed, 0 failed**. New regressions cover clock reconciliation/elapsed time, cancellation in all active phases, completed identity, atomic accepted/throttled price notifications, stale and slow-delivery blade segments, input lifecycle, analytical motion at 60/20/10/4 simulated FPS, bounded hidden-gap art, static exhaust, card subscription guards and refresh-independent flashes/configs. Phaser display surfaces are stubbed; real implementation methods run.
- `bun run types` and `bun run build` pass. Changed files are formatted and `git diff --check` is clean.
- An isolated browser fixture bundled the actual Stock client, arena, HUD and de-rez components, with local auth/transport stubs and render-invocation instrumentation. No production match, account or funds were involved. During a three-second interval with the bag open, **180 arena frames produced three page renders, three HUD renders, zero arena React renders and zero panel-content renders**. These are render invocations, not a React DevTools commit profile.
- Bag/settings receive keyboard focus; Escape restores their own triggers. No >50ms long tasks were reported during that normal-CPU panel interval. Three simultaneous catch callbacks produced three contacts and three claim emissions with the panel closed, bag open and settings open; contacts expired afterward.
- Disconnect in ready/playing/valuing displayed cancellation, stopped arena frames and returned locally to the lobby. A completed victory remained a victory after reconnect with a different transport identity. A live ribbon was reproduced persisting into valuation before the review fix; afterward it cleared immediately.
- The fixture verified transform positions after arena resize, continued upward/rightward motion after a 150ms backward server-time sample, and cutoff stopping RAF/input with a zero timer. Synthetic hide/resume exercised the registered visibility handler using a fixture-only hidden-state shim because the automation host makes `document.hidden` non-configurable. It paused and resumed frames without restoring stale input.

### Remaining measurement limits

The fixture is functional/render-boundary validation, not a controlled before/after production trace. Physical-device continuous swiping, actual network fault injection, physical 60/120Hz display comparisons, a fresh 4× CPU trace of the panel/catch bursts, React commit cost and GPU/presented-frame profiling remain unmeasured. The original traces above describe the audited implementation; they do not establish a post-change FPS improvement or attribute savings independently to each fix. Accessible panel focus and the existing de-rez/audio safeguards remain preserved.
