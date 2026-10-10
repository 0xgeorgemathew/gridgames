# Stock Ninja de-rez and outcome feedback

The requirements correction on 2026-10-07 replaces the intermediate two-half
split/fade with **progressive digital disintegration of the original coin**.
A 90 ms swipe-aligned fracture preserves the circular company logo and segmented
rim. The same artwork then subdivides into 8 coarse and 32 smaller fragments,
then up to 128 fine cells. Fine pieces become cyan energy pixels and shrink to
zero by **520 ms**. The sequence has no overall opacity fade. Fragment centers
stay within the contact footprint; there is no gravity or travelling debris.
The match clock owns its lifetime; reduced motion keeps a stationary outline.
Quote outcomes remain subtly in the HUD, never a floating checkmark at the hit.

## Actual event meanings

| Event                                                           | Visual                                                                                               | Sound                                                      | Accounting                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| Unique locally reserved contact                                 | Progressive original-logo/rim de-rez; cyan pending HUD                                               | 310 ms body/blade/digital decay; three material variations | Pending only, no asset credit                |
| Authoritative credited acknowledgement for that initiated claim | Newly acquired bag entry pulses mint for 600 ms; subtle mint status/pending HUD, no arena mark       | 230 ms warm resolved interval                              | Server credited simulated units and $1 spend |
| Authoritative failed acknowledgement                            | Amber reservation-release status/pending HUD and available-balance outline for 650 ms; no arena mark | 180 ms low descending release                              | Reservation released, no spend/credit        |
| Local budget refusal                                            | Amber available-balance outline for 250 ms; disc remains visible/catchable                           | 130 ms damped double tap, 350 ms cooldown                  | No reservation/spend/credit                  |
| Empty swipe, miss, duplicate intersection or acknowledgement    | None                                                                                                 | Silent                                                     | Existing rules                               |

The shared clock removes contact art. Terminal/ready/rematch/disconnect clears
local feedback; leaving a live state also clears pointer/blade history. Credits
and failures require a unique initiated current-room claim, playing state and a
pre-cutoff timestamp. Restored ledgers, replayed messages, old rooms and late round
callbacks do not manufacture cues. Completed results retain original player
ownership across transport reconnect (the earlier fix remains intact).

## Audio ownership

The existing `StockAudio` controller retains native streaming music and one
autoplay-disabled Howler 2.2.4 sprite Howl. The original six-cue mono file is now
44.1 kHz, 1.85 seconds and 163,214 bytes, generated deterministically by
`scripts/generate-stock-contact.py`; it contains no third-party/film samples.
Contact layers combine a short low body, band-limited blade noise and a bright
decaying edge plus a band-limited pulsing digital tail aligned with subdivision. Variations do not form a combo ladder.

Loaded/unlocked/visible/current-round guards discard unavailable transients;
nothing is deferred until load or gesture. A real three-active-ID cap remains
independent of Howler's inactive-object pool; simultaneous contacts coalesce,
confirmation may replace contact tails, and overlap gain decreases. Contact gain
is 0.42, credit 0.28 and negative outcomes 0.30 before overlap attenuation. Music
stays at 0.30. The sprite has no clipped samples (peak 0.800 before playback gain).

The existing shared mute preference, silent gesture unlock, visibility pause,
current-round music resume, error handling and owned-only unmount cleanup remain.
No global mute/unload, stale-hit replay, audio polling or second sound system.

Circular original-color artwork, lower balance/catch HUD, twenty canonical stocks,
shared three-disc shuffle, 75% toss speed, server catch windows, $1/$10 accounting,
real quotes with simulated fills/payouts, native transport and older games remain.

Reference: [official Howler API, sprites, pooling and mobile unlock](https://github.com/goldfire/howler.js#documentation).

## Intermediate split preview verification: 2026-10-07

The following is historical coverage of the intermediate split implementation,
not signoff on proper de-rez. Corrected deployment verification is recorded below.

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

## Corrected proper de-rez preview: 2026-10-07

This supersedes the split-only preview above.

- Source commit `9674048`; isolated Worker `grid-games-pivot`; version
  `b7c3d5cc-1a3d-439f-a646-b23812a1b5a0` serves 100% at
  `https://pivot.gridgames.space`, tagged `9674048`. Deployed stock JS
  (`StockArcadeClient-BDx5qbYR.js`, 73,260 bytes), CSS and 163,214-byte WAV
  match the final build byte for byte. Home and all three game routes return 200.
- Strict types, lint, 55 tests / 37,696 assertions, build, whitespace check and
  generated Worker-config dry run pass. New geometric regression checks require
  increasing fragment counts/decreasing cell sizes, localized centers, no
  gravity/downward-only drift, and zero remaining pieces at 520 ms.
- Native Chrome inspected actual component phase frames at desktop 1200×760 and
  mobile-width 390×1050: original circular logo/rim, 45 ms fracture, 150 ms coarse
  original-art pieces, 275 ms smaller original-art pieces, 410 ms energy pixels,
  and 490 ms collapsing points. A requestAnimationFrame-driven normal-speed
  repeat using the actual component was also inspected through native screenshots
  (including simultaneous INTC/NVDA/LLY contacts). This is visual component
  evidence, not a recorded video or a physical-device test.
- Actual Howler/WebAudio starts used contact offsets `0`/`0.35` with 310 ms
  duration, credit `1.05`/230 ms, failure `1.35`/180 ms, budget `1.60`/130 ms.
  Lobby had zero starts; ten rapid feedback requests coalesced into one cue.
  Mute produced zero starts and paused music. Simulated hidden events paused
  music/discarded feedback; visible resumed music without stale cues; idle was
  silent; unmount left zero owned Howls and zero contact nodes. Original PCM peak
  is 0.800 with zero clipped samples and zero-valued cue endpoints.
- Final live stock regression completed all twenty canonical assets across two
  ten-credit/$10 bags with shared shuffled drop contracts, deduplicated claims,
  three-coin batches, max three choices over 532 samples. Common cutoff block
  `82666636`, finite simulated payout `19.955505 USDG`. Disconnect cancellation
  passed. Real quotes were used; execution and payout remained simulated.
- Final retained Hyper Swiper/TapDancer start/price/position/settlement,
  disconnect/reconnect identity, room/action/terminal isolation, stable return,
  new rematch rooms, wrong/replayed ticket rejection and handoff timeout pass.
- Both existing authenticated Chrome profiles loaded the corrected preview
  without copied credentials. A native match showed separate pending dollars and
  confirmed bag credit, an expired claim releasing its reservation with no spend
  or credit, and ten acquired catches/$10 spent/$0 pending. Both result owners
  displayed finite values (`9.9607` versus `0.0000` USDG) at block `82667113`.
  Play Again returned the winning player to idle; result Back returned the other
  to the games page. Full-budget refusal, rematch budget reset, Close controls and
  pending-at-cutoff cancellation were additionally exercised in the intermediate
  native preview; their implementation is unchanged and final unit/protocol
  regressions cover their guards. No late/replayed callbacks gain credit or cues.
- The task-owned localhost component fixture exited normally; its port is closed.
  No stuck process required force termination. Existing tabs/logins are preserved,
  the exercised sessions are idle, the app dev server was never started, and no
  remote Git push, production overwrite or live financial action occurred.

Remaining validation limits: subjective audible monitoring is unavailable through
these tools; improved sound design is verified by its PCM and actual playback,
not by listening. Desktop mobile-width inspection is not iOS Safari, hardware
speaker/headphone listening or a physical-device background/resume test.

## October 10 UI and motion follow-up

The adjustable per-token bet, floating funds controls, animated brighter grid and further 25% toss slowdown are documented in [stock-ninja-ui-motion-2026-10-10.md](stock-ninja-ui-motion-2026-10-10.md). Earlier $1/75%-speed verification entries above describe their recorded versions; contact effects and quote-outcome rules remain in force.
