# Continuous Stock Ninja de-rez — 2026-10-07

Source `a7920d1` preserves the liked 520ms digital disintegration and original
logo/rim identity while removing animation holds and excess contact rendering work.
Isolated preview `pivot.gridgames.space` serves 100% Worker version
`bcaf5acf-8033-4b0f-a261-88f39b1c3e36`, tagged `a7920d1`.

## Confirmed causes and narrow correction

The old renderer switched grids at 90/210/340ms, kept coarse/medium scales constant,
and delayed fine-cell collapse by a hash. It rebuilt fragment arrays and replaced
SVG subtrees during subdivision. Three hits reached 2,364 SVG descendants.

Contact age also used `Date.now() + offset`, with the offset corrected on every
server state. A controlled -120ms correction at age 150ms rewound the old contact
three times, from about 145ms to 33ms. This proves the clock coupling; it does not
establish the size or frequency of corrections during ordinary live play.

The new contact clock uses monotonic `performance.now()`. Server time still owns
tosses, catch windows, cutoff, and ledger/HUD outcomes. Precomputed nested cells
continuously split the same moving parent footprint, then shrink immediately into
local pixels. A small Canvas2D texture retains original-color vector logos, the
original rim palette, and ticker at displayed device resolution. It is prepared
per contact/resolution, refreshed when its logo becomes available, and released
with that contact. No renderer-owned animation loop or playback queue is added.
The first 90ms DOM slice, sound cue, reduced-motion feedback and 520ms lifetime stay.

Gameplay contracts, budget, shared three-coin launches, shuffle, quote ownership,
audio implementation, completed-result ownership and GridScan are unchanged.

## Comparable active-play measurements

Production-mode actual components ran three moving discs, the blade, full HUD and
synthetic pending/credit updates. After 700ms warmup, each run measured 12 seconds,
with three contact waves. Single-hit cases ran once per viewport; three-hit cases
ran twice. Assets were warm. Desktop 1200×800 used Chrome zoom 67%, reported DPR
1.333; mobile-size 390×844 used zoom 100%, DPR 2. These are comparable CSS viewports
on the same Mac, not physical mobile-device tests.

| Workload                      | Before contact p95 / p99 (ms) | After contact p95 / p99 (ms) | Before / after intervals >24ms |
| ----------------------------- | ----------------------------- | ---------------------------- | ------------------------------ |
| Desktop, 1 hit                | 9.2 / 9.3                     | 9.3 / 9.4                    | 0 / 0                          |
| Mobile-size, 1 hit            | 9.3 / 9.4                     | 9.3 / 9.4                    | 0 / 0                          |
| Desktop, 3 hits, two runs     | 16.7–24.9 / 33.3–33.8         | 9.2–9.3 / 9.4                | 4–8 / 0                        |
| Mobile-size, 3 hits, two runs | 16.6–24.5 / 33.3–33.4         | 9.3 / 9.4                    | 4–8 / 0                        |

Three-hit maxima fell from 33.3–41.6ms to 9.4ms in these runs. Maximum contact
DOM descendants fell from 2,364 to 189, including the unchanged initial DOM halves.
Normal workload windows reported no component errors or long-animation-frame /
long-task entries. RAF intervals are callback pacing evidence, not presentation
frame timestamps, guaranteed FPS, GPU traces, or a physical-device guarantee.

## Verification

- Types, lint, production build, whitespace and isolated deployment dry run pass.
- 56 stock/transport/audio/lifecycle tests and 56,592 assertions pass. Three motion
  checks cover nested footprints, continuous boundaries, immediate shrink and
  terminal disappearance. Both retained GridScan clock tests / 19 assertions pass.
- The same controlled correction produces zero rewinds in the new contact.
- Native Chrome inspected original-art subdivision and pixel collapse at both
  viewport sizes, plus normal-speed component workloads and simultaneous hits.
- Deliberately delayed logo callbacks produced zero draws after unmount, with zero
  remaining contact canvases. A real native hidden-tab interval of 50.3 seconds
  produced zero hidden contact draws, including the delayed callback.
- Freshly loaded existing authenticated Chrome sessions exercised pending without
  false credit, real quote confirmation, completed simulated results, clean rematch
  balances/bags, Close, mute/unmute, native background/resume, Exit cancellation
  without payout, and Back to the idle menu. Sound preferences were restored.
- Live native-WebSocket checks credit all 20 stocks, $10 per synthetic player,
  shared batches/clock, deduplication, cutoff settlement and disconnect cancellation.
  Both retained games pass room isolation, reconnect, rematch, ticket rejection and
  partial-handoff timeout regressions. These protocol identities are synthetic;
  no signing, swaps or real-funds actions occur.
- Published stock JS/CSS, core/menu JS/CSS, all 20 logos, GridScan JS/CSS and contact
  WAV match the build byte for byte; all four game/menu routes return 200. Stock JS
  `StockArcadeClient-DbhccG0i.js` is 75,245 bytes, SHA-256
  `b09d1b9283942b83b4c1c7776e1bc7222ada7f79335e058115aeb306fa177d83`.
  GridScan JS retains SHA-256
  `6d93e3e2842122b7c815bb9bfeda8491e0e141ee762b1ecc9f6e5f0dc6e5206f`.
  The unchanged WAV retains SHA-256
  `b53b5c23a74d9112a9ea0ca7b5c59171bd59d8b640db9874d70068e9450fba6d`.
- Task-owned fixture port 4176 and temporary tabs are closed. Existing profiles,
  logins, windows and unrelated tabs are preserved. No app dev server, remote Git
  push, main merge or production overwrite.

Physical iOS Safari, hardware audio listening and a full authenticated-game
DevTools/GPU trace remain outside this pass. The separate performance inspection
is a follow-up, not claimed complete by this implementation.
