# Pivot grid navigation continuity — 11 October 2026

Home stretched the committed portrait/landscape tunnel captures across its
container. Entry replaced them with a live viewport-projected shader; the Stock
Ninja lobby then generated another viewport-specific raster. Even rigid shader
lines can differ from a stretched capture at another aspect ratio. Loading
fallbacks also removed the grid while the route/auth dependencies resolved.

Home, Stock Ninja's lobby and its root/route loading fallbacks now share the same
viewport-fixed `LandingGridBackground`. The 800ms entry illumination masks a
brighter copy of the identical image without translating, scaling or replacing
its lines. The existing 500ms navigation delay remains. Reduced motion hides the
illumination; settled screens have no background animation or WebGL renderer.
The active Stock Ninja arena retains its existing `StockGrid`.

Validation:

- Current workspace and isolated release types pass. The archive's pre-existing
  `app/Test`/`app/test` case collision required normalizing the temporary directory
  name to the workspace's lowercase spelling; no source change was made for it.
- All 89 existing release tests pass, with 75,426 assertions. Focused lint,
  formatting, production build, deployment dry run and whitespace checks pass.
- Actual-component fixtures at 390×844 and 1200×760 exercised the Play handler,
  a deliberately delayed lazy route fallback and the original lobby presenter.
  Across 75 mobile and 58 desktop frame samples, the base image remains loaded,
  every visible grid/image keeps the same viewport bounds and no image transform
  changes. Entry masks move; grid geometry does not. A newly mounted illumination
  copy can take an initial frame to decode, leaving the persistent base visible.
- Fixture idle state has zero running animations and zero canvases. Both built
  local routes and live routes use the same image, bounds and palette, with no
  GridScan module requests or canvases. Live browser CSS size was measured as
  615×1331; the preview's requested viewport differs from its actual CSS viewport.
- Live home, Stock Ninja, Hyper Swiper and TapDancer routes return 200. Published
  menu/stock JS, grid CSS and both captures match the release SHA-256 hashes.

The isolated release contains commit `42dabc1` plus this visual patch; existing
uncommitted authentication changes were excluded. Cloudflare Worker
`grid-games-pivot` deployed version `5a952903-ed6e-4909-b4a6-e26b5c3dd6b9` at
`https://pivot.gridgames.space`. No remote Git push or main deployment was made.

Authenticated production entry and physical iOS Safari were not exercised. The
entry fixture uses explicit presentation props and does not alter app auth.
