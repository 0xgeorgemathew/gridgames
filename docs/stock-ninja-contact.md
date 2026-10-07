# Stock Ninja slice and outcome feedback

The requirements review on 2026-10-07 replaced the intact fading disc and floating
quote tick/cross. Contact now visibly cuts **the original logo and segmented rim**
along the swipe direction. Two clipped halves separate by at most about one third
of a disc diameter, rotate slightly and dissolve locally over **380 ms**. The first
122 ms includes a white/cyan blade flash; the split remains legible before fading.
No cubes, gravity, debris flying downscreen, new collision/penalty/combo rules or
extra animation loop. Reduced motion uses a stationary cyan outline.

## Actual event meanings

| Event                                                           | Visual                                                                                               | Sound                                                                  | Accounting                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| Unique locally reserved contact                                 | Swipe-aligned split of logo/rim; cyan pending HUD                                                    | 190 ms layered body/edge/energy tail; three slight material variations | Pending only, no asset credit                |
| Authoritative credited acknowledgement for that initiated claim | Newly acquired bag entry pulses mint for 600 ms; subtle mint status/pending HUD, no arena mark       | 230 ms warm resolved interval                                          | Server credited simulated units and $1 spend |
| Authoritative failed acknowledgement                            | Amber reservation-release status/pending HUD and available-balance outline for 650 ms; no arena mark | 180 ms low descending release                                          | Reservation released, no spend/credit        |
| Local budget refusal                                            | Amber available-balance outline for 250 ms; disc remains visible/catchable                           | 130 ms damped double tap, 350 ms cooldown                              | No reservation/spend/credit                  |
| Empty swipe, miss, duplicate intersection or acknowledgement    | None                                                                                                 | Silent                                                                 | Existing rules                               |

The shared clock removes contact art. Terminal/ready/rematch/disconnect clears
local feedback; leaving a live state also clears pointer/blade history. Credits
and failures require a unique initiated current-room claim, playing state and a
pre-cutoff timestamp. Restored ledgers, replayed messages, old rooms and late round
callbacks do not manufacture cues. Completed results retain original player
ownership across transport reconnect (the earlier fix remains intact).

## Audio ownership

The existing `StockAudio` controller retains native streaming music and one
autoplay-disabled Howler 2.2.4 sprite Howl. The original six-cue mono file is now
44.1 kHz, 1.5 seconds and 132,344 bytes, generated deterministically by
`scripts/generate-stock-contact.py`; it contains no third-party/film samples.
Contact layers combine a short low body, band-limited blade noise and a bright
decaying edge rather than the old dry tick. Variations do not form a combo ladder.

Loaded/unlocked/visible/current-round guards discard unavailable transients;
nothing is deferred until load or gesture. A real three-active-ID cap remains
independent of Howler's inactive-object pool; simultaneous contacts coalesce,
confirmation may replace contact tails, and overlap gain decreases. Contact gain
is 0.42, credit 0.28 and negative outcomes 0.30 before overlap attenuation. Music
stays at 0.30. The sprite has no clipped samples (peak 0.822 before playback gain).

The existing shared mute preference, silent gesture unlock, visibility pause,
current-round music resume, error handling and owned-only unmount cleanup remain.
No global mute/unload, stale-hit replay, audio polling or second sound system.

Circular original-color artwork, lower balance/catch HUD, twenty canonical stocks,
shared three-disc shuffle, 75% toss speed, server catch windows, $1/$10 accounting,
real quotes with simulated fills/payouts, native transport and older games remain.

Reference: [official Howler API, sprites, pooling and mobile unlock](https://github.com/goldfire/howler.js#documentation).

## Verified preview: 2026-10-07

- Source commit `0b1a670`; isolated Worker `grid-games-pivot`; deployed version
  `9cc40b7a-d4dd-49e3-a274-504efc962016` at `https://pivot.gridgames.space`.
  Cloudflare reports 100% deployment with tag `0b1a670`. Live JS, CSS and WAV bytes
  match the build. No main/production deployment or remote Git push.
- Strict types, full lint, 53 tests / 16,595 assertions, build, whitespace check and
  generated-config deployment dry run pass. Unit coverage includes local pending
  budget guards, duplicates, released reservations, old rounds/acknowledgements,
  sound loading/locking/mute/visibility/disposal and three-voice limits.
- Real preview protocol test completed all twenty assets across two $10 bags,
  with common-cutoff block `82651433`, simulated payout `19.956991 USDG`, identical
  shared shuffled drop contracts and three-disc batches. Two timeout failures
  released reservations without credit/spend; subsequent opportunities completed
  both budgets. Duplicate claims stayed deduplicated. Disconnect cancelled.
- Retained Hyper Swiper/TapDancer start/price/position/settlement checks pass, plus
  disconnect/reconnect identity, parallel-room and terminal isolation, stable
  return identity, rematch rooms, wrong/replayed ticket rejection and handoff timeout.
- Native Chrome inspected the actual split component at 1200×760 and 390×844:
  original logo/rim visibly separate; no floating result tick/cross or travelling
  debris. These controlled phase views use synthetic state and no auth adapter.
- Actual WebAudio starts in the isolated component fixture used offsets
  `0`, `0.75`, `1.05`, `1.30` seconds for contact/credit/failure/rejection, with
  durations `0.19`, `0.23`, `0.18`, `0.13`. No autoplay. Ten rapid requests added
  only one contact sound. Mute stopped music/effects. Simulated visibility events
  paused music, discarded hidden cues and resumed without replay; idle stayed
  silent; unmount left zero owned Howls and contact nodes.
- Two existing authenticated Chrome profiles loaded the final preview, played and
  rematched without copied auth data or new login. Pending dollars and actual bag
  credit remained separate. A pending-at-cutoff round cancelled with no payout.
  The fresh rematch reset to $10 / empty bags; one player acquired ten catches,
  spent $10, returned to $0 pending and saw further contacts rejected with coins
  retained. It completed at block `82653730` with finite `9.9655`/`0.0000` displayed
  bag values. Result music stopped. Settings Close, instructions close and Back
  navigation worked. The exercised tabs end idle; unrelated tabs/logins preserved.
- No genuinely stuck task-owned process was found. The temporary component server
  was closed normally after QA; no unrelated process was terminated.

Limits: tools could inspect actual playback and the original PCM file (no clipped
samples), but could not provide audible monitoring. Subjective listening is **not
verified**. Desktop mobile-size layout is **not iOS Safari or physical mobile audio**.
Visibility-event fixture checks are simulated browser lifecycle coverage, not a
phone backgrounding test. The app dev server was never started.
