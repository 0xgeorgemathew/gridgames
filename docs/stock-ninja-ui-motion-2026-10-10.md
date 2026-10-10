# Stock Ninja UI and motion — 2026-10-10

## Reference and intent

The supplied 17.54-second recording combines a moving grid, illuminated junction
dots, a small scan/price-line pulse and floating controls. Stock Ninja adapts the
motion and layering in navy, cyan and ice blue while retaining original-color
logos and the TRON disc/ribbon vocabulary. It does not introduce a price graph.

The user explicitly chose one selected bet **per caught token**, rather than one
charge per entire swipe. Funds and acquired units remain simulated.

## Implemented behavior

- Floating left wallet pill shows available simulated USDG; right bet pill cycles
  $0.25/$0.50/$1/$2 and wraps. Both show only their icon and amount, reserve space
  above the dock, and retain accessible labels. The bet is disabled while pending.
- Landing screens share the grid's navy light field and ice-blue line color. A
  static scoped wash retains the cached tunnel geometry and existing entry scan;
  landing cards and login controls use navy glass. No additional animation clock
  or GPU context is introduced.
- `set_catch_cost` is validated by the room, publishes the bag, then acknowledges
  the request through `arcade_bet`. The displayed amount stays server-confirmed.
  Catches pause during confirmation. A five-second timeout releases the local UI
  lock; late authoritative snapshots still update the displayed amount.
- Every catch captures its cost before awaiting a quote. Quote input and response
  validation use that amount in six-decimal USDG units. Reservation, confirmed
  debit and failed-quote release use the captured cost even after a bet change.
  Expected-cost mismatches reject stale client catches without ledger mutation.
- Grid brightness comes from a static navy light field. A textured grid plane
  travels downward, with junction dots, a scan and four faint drifting sparks.
  Only transforms/opacity animate; no new RAF or React frame clock. Motion pauses
  outside live play, when hidden, and for reduced motion.
- The server randomizes toss height, spin, direction/drift and release offsets
  once for both players. Bounded lanes retain full-disc clearance at 320px. The
  middle token has no height advantage. The full arc now lasts 4977.78ms with
  4800ms batches, another 25% slower than the previous version. Cutoff clips arcs.

## Multiplier discussion — proposed, not implemented

The recommended next step is a capped confirmed-catch streak, separate from stock
inventory: 1× for the first two catches, 1.5× from the third, 2× from the sixth,
and 3× from the tenth. A multiplier would boost an explicit arcade score, not
fabricate quoted asset units or funds. If it is intended to decide the winner,
that would be an explicit scoring-rule change from current bag valuation.

The server should order streak progress by catch submission, resolve pending
quotes before awarding bonuses, and avoid penalizing quote-provider failures.
For variable bets, bonus points should scale with the captured cost. Progressing
tiers by successful dollars, or fixing the bet within a scoring round, avoids
cheaper bets reaching high streak tiers sooner. The catch-count tiers above
assume a fixed stake; variable-bet thresholds still need a product decision. A miss should reset only
after the player had a valid affordable opportunity; exhausted funds or transport
interruption should not create a penalty. Display the active multiplier and a
clear reset condition before introducing the mechanic.

Rare bonus tokens are an alternative with stronger visual moments and more luck.
Stake-based multipliers would require a defined risk/reward model; changing quote
size alone is an investment amount, not a multiplier. No scoring change ships in
this update.

## Verification

The follow-up color/control update passes all 86 existing tests, TypeScript,
focused ESLint, formatting, production build and Worker deployment dry run. The
collaborative preview connection failed during verification, so native Chrome
checked the real client/HUD/grid and local `StockMatch` fixture. The full bet
cycle and wrap confirm through the server; a $2 simulated catch reduces the
wallet from $10 to $8 with one confirmed asset. At a 320×568 emulated viewport,
wallet is left and bet right with only one icon and amount each. The Stock Ninja
landing retains its tunnel geometry with the shared navy field. Fixture auth,
transport and quote responses remain local stubs; no bypass is shipped.

Types, native test suite, production build, formatting and deployment dry run are
required before release. Tests cover variable quote input/validation, immutable
pending costs, fractional failure release, stale-cost rejection, invalid/late
updates, further slowdown, shared randomized flights and extreme lane bounds.

An isolated browser fixture bundles the real client, HUD, arena, grid and
`StockMatch`; only auth/transport and external quote results are replaced. Browser
checks verify 320px/390px layout, delayed confirmation, catches blocked while a
change is pending, Escape/focus restoration, timeout/late state, disconnect,
exact wallet debits and quote-failure release. A $2 catch followed by a $0.25 catch
produced $2.25 spent and $7.75 available; another failed $0.25 quote restored its
reservation without spend or inventory credit.

In a three-second no-contact sample, 180 arena frame callbacks accompanied three
page, three HUD and one arena React render invocation. Grid transforms advanced
without a page frame clock. Fixture-only hidden/media-state injection verified
all six ambient animations pause/resume and stop on terminal state. These are
functional/render-boundary checks, not a GPU profile or a presented-FPS claim.
Physical mobile swiping, fresh CPU/GPU traces, and live external quotes at every
fractional amount remain unmeasured. No product auth bypass or fixture is shipped.
