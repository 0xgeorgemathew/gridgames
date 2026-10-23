# Landing loading audit — 10 October 2026

Scope: the Pivot landing page at `https://pivot.gridgames.space/`, baseline commit
`de7b111f2194ea721aabd98160e7cbe26568cd81`. The previous commit changed the palette
and bet control; it did not add a landing fetch or dependency. The confirmed
loading bottlenecks below existed in the loading architecture. This audit does
not establish that the palette alone caused the reported regression.

## Evidence

- The baseline server response contained no menu/title markup. The root waited
  on lazy Privy/Wagmi providers, then the home client loaded through another lazy
  boundary. The menu also started hidden and waited on staggered entrance motion.
- A baseline first visit loaded 3,205,540 decoded bytes of top-frame JavaScript
  across 40 resources (1,005,881 transferred bytes). Its heading LCP was 1,436ms;
  main-thread long tasks included 59ms and 169ms. These are individual browser
  observations, not field statistics or a throttled mobile benchmark.
- The idle menu downloaded the 533,302-byte decoded GridScan module
  (137,253 bytes transferred on the first visit), built Three.js/postprocessing,
  compiled shaders, rendered bloom, and encoded a WebP before disposing WebGL.
  Its four-image in-memory cache saved route returns, but not reloads.
- A repeat baseline at the browser's measured 615×1331 CSS viewport recorded
  heading LCP 1,380ms and a 142ms long task even with cached JavaScript. The
  collaborative preview's requested viewport differs from its measured CSS
  viewport; these records use `innerWidth`/`innerHeight`.

## Patch

The root renders the public menu in its server/ClientOnly fallback while auth
providers load. The presenter takes auth props instead of importing auth SDKs;
`GameSelectionAuth` retains the existing Privy/Farcaster decisions and router
destinations. Pending auth disables login and game entry. The menu is initially
visible, so hydration/provider replacement does not restart an invisible
entrance animation.

Idle landing uses compressed portrait/landscape captures of the exact existing
shader at time zero and the current cyan palette. They are 60,666 and 87,012
bytes, selected with a picture source and fingerprinted by Vite. Each capture
keeps the original tunnel geometry and glow; the existing CSS color wash remains.
The original shader scan warms on Play focus/pointer intent and renders only
during entry. Its load failure leaves the static background/navigation usable.
Sibling background layers avoid applying the palette wash twice. Entry timers
are cleared when the presenter unmounts.

The stock arena, other game lobby renderers, server and deployment configuration
are unchanged. Auth SDKs still initialize in the background; this patch removes
them from the first-menu-paint dependency, not from the application.

## Verification

- Regression test first failed because the menu required WagmiProvider; after
  the split it renders without auth/router providers. Tests also verify pending
  auth cannot enable either game and confirmed auth enables the existing choices.
- `bun run types`, `bun run test` (89 passed, zero failed), production build and
  `git diff --check` passed. A focused review found the double palette overlay
  and cold entry import timing; the patch fixes the overlay and prefetches on
  entry intent without constructing idle GPU resources.
- The built Worker preview response contains the menu/title, pending login and
  both game choices. Idle browser loads recorded zero WebGL module requests and
  zero canvases. Total decoded top-frame JS fell to 2,674,224 bytes, removing
  about 531KB of JS. Auth and WebGL stay behind dynamic imports in the build.
- At the measured 615×1331 viewport, the local production preview recorded FCP
  216ms, LCP 248ms, no long tasks and approximately 0.069 cumulative layout shift
  during font swapping. Local timing is not directly comparable to public-network
  timings. No DevTools CPU/network trace API was exposed; observations use
  PerformanceObserver and resource timing.
- Login became enabled after SDK readiness and opened the existing Privy dialog
  with Google/email choices. Its iframe loaded successfully on the allowed local
  port 3000. Port 4173 was rejected by Privy's origin policy, so auth smoke testing
  used a production preview on port 3000. No dev server was started.
- No account sign-in, authenticated multiplayer match or Farcaster-host session
  was performed. The actual game-entry scan is retained but can be skipped when
  its intent-prefetched module cannot become ready before the existing 500ms
  navigation delay; navigation never waits on this decorative dependency.

Deployment targets the existing `grid-games-pivot` Worker using built
`dist/server/wrangler.json`, without changing main or its route.
