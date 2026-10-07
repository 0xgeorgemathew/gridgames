# Stock Ninja arcade contact feedback

George replaced the film-style de-rez direction with game-fit arcade feedback on
2026-10-07. The previous chunk/glass effect is removed from the runtime. Current
feedback uses a compact **neon snap**, not fragments or prolonged destruction.
Circular original-color logos, the floating simulated balance/per-catch cost HUD,
75% toss speed, shared three-disc launches, twenty stocks, dollar reservations and
all existing economic rules remain.

## Actual event meanings

| Event                                                                                                 | Visual                                                            | Sound                                                            | Accounting                                          |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| Unique local contact, budget successfully reserved                                                    | White cut/rim snap, original disc fades locally over180ms         | Quiet90ms dry synthetic tik-zzt, one of three non-ladder timbres | Pending only; no asset credit                       |
| Authoritative `arcade_claim: credited` for a locally initiated claim                                  | Compact220ms mint check; newly acquired bag entry pulses          | Quieter160ms two-note confirmation                               | Server already credited simulated units and$1 spend |
| `arcade_claim: failed` for that local claim                                                           | Restrained160ms amber cross; truthful reservation-release message | Soft140ms descending cue                                         | No spend/credit; reservation released               |
| Local budget guard refuses a new contact                                                              | Amber available-balance outline; disc remains catchable           | Damped90ms low tok,350ms sound cooldown                          | No reservation/spend/credit                         |
| Miss, spawn, pointer movement without a new contact, already handled disc or replayed acknowledgement | None                                                              | Silent                                                           | Existing rules                                      |

There are no invented collisions, penalties, combo multipliers or real trade
confirmation sounds. Pending has no checkmark. A single swipe can contact several
discs, each with its own visual. Near-simultaneous audio is coalesced and at most
three voices are active; new confirmation/failure cues can replace older contact
tails. Overlap gain decreases. The rejected disc stays visible and is eligible
for a later valid contact if pending capacity releases.

`ContactFeedback` deduplicates local claims and terminal acknowledgements within
the round. Ready/rematch/disconnect resets it. Unknown/restored bag entries do not
manufacture confirmation cues. Native transport discards messages from an old
WebSocket during room handoff; the feedback handler additionally requires the
current room/match and live pre-cutoff state. Late old-round responses and terminal
state changes stay silent. Reduced motion uses a compact outline without disc
scaling or the moving blade.

## Audio ownership

Howler **2.2.4** supplies one preloaded, autoplay-disabled WebAudio sound-sprite
Howl with HTML5 fallback. Sprite offsets/durations are milliseconds and playback
IDs enforce a real voice cap: Howler's `pool` only recycles inactive objects.
Transient cues require decoded/loaded audio and an unlocked current gesture;
past cues are discarded rather than played after load/unlock. A play error does
not block gameplay or queue a historical retry.

The existing native HTML5 music element and `StockMusic` lifecycle are retained
for the original streaming loop and immediate visibility handling. One
`StockAudio` controller owns both music and contact sounds. The shared per-game
mute preference stops both; hidden tabs stop transient sounds and pause music.
Visibility resumes music only during the enabled current round, with no replay
of hidden contact history. Ordinary Start/pointer/key gestures unlock silently.
Unmount removes app listeners, pauses/releases music, stops/unloads only the
owned Howl and invalidates old callbacks. There is no global mute/unload, audio
polling loop or effect-owned RAF. Howler's normal idle auto-suspend remains on.

Official references: [release2.2.4](https://github.com/goldfire/howler.js/releases/tag/v2.2.4),
[API, sprites, playback, pooling and mobile unlock](https://github.com/goldfire/howler.js#documentation),
[upstream implementation](https://raw.githubusercontent.com/goldfire/howler.js/master/src/howler.core.js).

`public/audio/stock-contact.wav` is an original synthetic mono six-cue sprite,
48,554bytes, generated deterministically by `scripts/generate-stock-contact.py`.
No film or third-party sound sample ships. Visuals use existing shared TRON rim
and ribbon geometry, SVG/DOM only, confined to roughly1.27disc diameters and
removed by the existing match clock. There are no particle canvases or idle
contact animation work.
