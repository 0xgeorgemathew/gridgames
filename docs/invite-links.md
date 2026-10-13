# Invite links

Stock Ninja, Tap Dancer and Hyper Swiper offer **Invite a friend** in their
matchmaking screen. The host creates a private waiting seat and can copy its link
or use the device's share sheet. The recipient opens the game route, signs in
through the existing auth flow and selects **Join friend**. The host's duration
applies to both players.

Links use `/<game>?invite=<random-id>` on the current origin. They expire after ten
minutes and require the host to keep the page open. Cancel, disconnect, replacing
the invite, joining a public queue or consuming the invite makes the old link
unavailable. An unavailable link never falls back to a random opponent.

## Runtime

- `worker/lobby.ts` keeps private invite metadata in the existing hibernating
  WebSocket attachments. Its alarm expires invites alongside reservations and
  return credentials. No new Durable Object binding or storage migration is needed.
- Private seats are omitted from public lobby lists, auto-match and manual
  opponent selection. Joining reserves both seats before any asynchronous room
  provisioning. A failed reservation removes private seats rather than publishing
  them in the public queue.
- `domains/match/events.ts` owns `create_invite`, `join_invite`, `invite_created`
  and `invite_expired` payloads. Only an opaque invite ID is shared; each player
  receives a separate room ticket through the existing transport handoff.
- `domains/match/client/invite-session.ts` owns the client lifecycle. The router
  retains invite search during sign-in and removes it on cancel or match creation.
  Room aborts, expiry and disconnection clear shareable metadata.
- `platform/ui/InviteMatchPanel.tsx` provides join, copy, native share and cancel
  controls. When clipboard access fails, the visible link can be selected manually.

## Nonvisual verification

`bun run types`, `bun run test` and `bun run build` from `frontend/`.
The multiplayer tests cover private-seat isolation, hibernation reconstruction,
host settings, competing joins, cancellation, replacement, expiry, unavailable
hosts, wrong games, failed provisioning and client handoff/abort behavior.
