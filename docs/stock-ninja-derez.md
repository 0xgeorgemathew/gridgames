# Stock Ninja circular artwork, dock and de-rez

## Current presentation

Original, untinted stock logos sit in 42–54px circular contrast chambers inside the segmented TRON discs. Artwork uses contain-fit, with no additional crop or deformation. Tickers remain; visible per-coin `$1` labels are removed. A lower-left wallet pill shows available **simulated match balance**, subtracting authoritative spend and pending reservations. A separate lower-right coin-stack pill shows the fixed **$1 per successful catch** amount. A single swipe can catch several discs. Neither pill represents a connected wallet's actual balance. The rounded dock retains the timer, both players' spend, confirmed acquired bag, pending amount, settings and music.

Tosses retain the approved 75% speed: 3733⅓ms shared catch windows and 3600ms three-disc launches. The authoritative dollar ledger, all twenty stocks, local reservation guard, quote failures without spend and simulated fills/settlement are unchanged.

## Research and browser adaptation

The earlier 360ms simultaneous triangle fracture is superseded. This effect adapts the **TRON: Legacy (2010)** production approach, rather than claiming to reproduce its offline simulation:

- Digital Domain's [SIGGRAPH2011 production paper](https://euler.nafees.net/siggraph/ikarashi-Tron_sketch.pdf) describes irregular connected chunks, progressive erosion from chunk edges into cubes, continuing motion in intact regions and children inheriting parent motion.
- Sequence-supervisor discussion in [CGW's Inside Job](https://www.cgw.com/Publications/CGW/2011/Volume-33-Issue-11-December-2010-/Inside-Job.aspx) supports retaining original exterior material while newly exposed interiors become glassy. Emission belongs to the material/light sources rather than uniformly bright debris.
- [Motionographer's Digital Domain interviews](https://motionographer.com/2011/01/24/full-coverage-talking-tron-with-digital-domain/) support simple geometry with integrated lighting.
- Parent research inspected Digital Domain's [official production reel](https://digitaldomain.com/work/tron-legacy/) near 3:38. Its vehicle destruction supports the relationship between luminous edges, dark fragments and fine detail; it does not establish character de-rez timing or justify an explosive coin effect.

No film artwork ships. The following times and counts are browser design choices, not measured film constants.

At impact the displayed disc pose, original logo texture, ticker, rim and actual swipe direction are captured once. Six irregular connected regions activate near that swipe band. Edge cells release first; interior cells remain connected longer. Medium cubes retain their unique original surface crop while exposing blue-gray glass sides and pale edges. Each subdivides into four smaller cubes that inherit its position, velocity and rotation, without a second burst. Fine debris damps, fades and shrinks near the original disc. Restrained cyan comes from rim cells; there are no travelling shockwaves, intact falling halves, floor debris or whole-logo copies on every piece.

Contact lasts up to45ms; connected material remains recognizable near120ms; connected regions, medium and fine cells coexist around280ms; glassy fine matter dominates near450ms. All material is gone by740ms and its surface is removed after750ms or immediately when play ends. The pure geometry tests cover connectivity, edge ordering, UV subdivision, motion continuity, local bounds and at most180 active cubes per catch/540 for three simultaneous cuts.

## Runtime

`client/derez-geometry.ts` precomputes spatial propagation and fragment lifetimes. `client/derez-renderer.ts` uses one transient Canvas2D surface plus one prebaked source texture per catch, capped at device-pixel-ratio2. Connected-region masks are cached by erosion membership. It advances from the existing match clock, owns no RAF/timer, performs no image readback or WebGL/refraction simulation, and creates no per-fragment DOM nodes. Source geometry is read once at impact; canvas backings and image listeners are released on unmount. Hidden tabs do not draw. No effect surfaces or draw work remain when the effect list is empty.

The logo source/provenance remains in [stock-ninja-logos.md](stock-ninja-logos.md). Real swaps, wallet accounting and unresolved economics remain outside this visual change.
