# GridScan launch correction — 2026-10-07

The narrow correction preserves the TRON tunnel, palette, scan light, bloom,
chromatic fringe, portrait projection, resolution cap and bounded idle cache.
Gameplay, HUD, audio and the completed proper de-rez are unchanged.

## Confirmed cause

The cold authenticated Pivot menu visibly had bowed lines. Its first Stock Ninja
launch changed those line shapes while the scan appeared. The actual component
fixture at 390×844 reproduced this independently of authentication/game state:

- Both grid masks added hard-coded sinusoidal coordinate jitter (`0.1`) that bends
  the projected lines and changes shape with `iTime`.
- The cached idle raster uses `iTime = 0`; activation used `performance.now()/1000`,
  jumping to page uptime (13.25 seconds in the baseline observation). Scan phase,
  line deformation and grain therefore jumped together at an arbitrary point.
- Canvas/shader sizes were 390×844, device DPR was 2 with renderer DPR capped at 1,
  and camera skew/tilt/yaw remained zero. No pointer listeners update the camera.
  Sizing, DPR and pointer motion did not explain the reproduced deformation.

## Targeted change

Source commit `0060455` removes the two jitter calculations so tunnel geometry
stays rigid. A per-renderer local clock starts at zero and excludes paused time.
Unsized frames do not render or consume scan time. The menu explicitly sets zero
scan delay during its existing 500ms transition; otherwise a new local clock
would inherit the default two-second delay and show no entry sweep. The inward
scan still lasts 0.8 seconds, with navigation at the existing 500ms timeout.

There is no new idle loop, pointer behavior or game feature. Static views retain
time zero, four cached rasters, no mounted canvas after capture and GPU disposal.

## Validation and exact deployment

- Types, lint, build, whitespace and generated-config deployment dry run pass.
- Two focused clock regressions / 19 assertions verify launch independence from
  page uptime, repeated refreshes, pause/resume without catch-up and fresh clocks.
  The 55 existing gameplay/audio/lifecycle tests / 37,696 assertions also pass.
- Native Chrome inspected baseline and corrected actual-component mobile 390×844
  and desktop 1200×760 renders. Corrected lines stay rigid while the scan light
  moves; a 500ms launch advanced locally through 0.4962 seconds. Cold initialization,
  repeated activation, cached remount, resize between portrait/landscape, and
  controlled hidden/resume were exercised without component errors.
- Settled idle and hidden windows measured zero GL draw calls over one second and
  no mounted canvas. Cached desktop remount retained total draws 13,554 and six
  created/six released contexts. These instrumented counters include postprocessing
  passes; they are lifecycle evidence, not device power or frame-rate claims.
- Isolated Worker `grid-games-pivot`, 100% version
  `3df6f029-a588-4d14-880f-c0c0c0d51e4e`, tag `0060455`, at
  `https://pivot.gridgames.space`. Final GridScan JS/CSS, menu JS, stock JS/CSS and
  contact WAV match the build byte for byte. All existing game routes return 200.
  GridScan JS is `GridScanBackground-D4R_1_BA.js` (533,302 bytes, SHA-256
  `6d93e3e2842122b7c815bb9bfeda8491e0e141ee762b1ecc9f6e5f0dc6e5206f`).
- The deployed authenticated tab was hard-reloaded, returned to the menu and
  launched Stock Ninja, Hyper Swiper and TapDancer in sequence. Native screenshots show the
  same rigid lines through cold/hydrated idle and active entry frames. Existing
  sessions and unrelated tabs are preserved; QA stays outside live matches. Actual
  native tab hide/resume returned to the idle menu; active hidden/resume draw counts
  came from the controlled component fixture.
- The task-owned component fixture was closed normally and port 4175 is closed.
  No app dev server, remote Git push, production deployment or live funds action.

Limits: mobile-size and portrait/landscape checks used desktop Chrome, not physical
iOS Safari. Hidden/resume instrumentation used controlled visibility events;
physical iOS address-bar resizing, GPU precision and backgrounding are unverified.
The code-level and reproduced cause is fixed; no physical-device guarantee is made.
