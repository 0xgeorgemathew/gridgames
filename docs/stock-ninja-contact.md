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
