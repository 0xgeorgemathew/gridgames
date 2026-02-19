# Debug Mode Rules

## Multiplayer Debugging

- **Race conditions**: Check [`SettlementGuard`](frontend/app/api/socket/game-events.ts) logs for duplicate settlement attempts
- **Memory leaks**: Verify all timers are tracked in `GameRoom.timeouts`/`GameRoom.intervals` - untracked timers cause leaks on room deletion
- **State mismatches**: Player IDs cached at order creation may differ from current positions during async settlement

## Socket.IO Debugging

- Server runs embedded in Next.js at [`/api/socket/route.ts`](frontend/app/api/socket/route.ts)
- CORS wildcard (`*`) in production may cause connection issues from unknown origins
- Check client orphaned order cleanup in [`trading-store.ts:737-752`](frontend/game/stores/trading-store.ts)

## Known Issues

- [`GridScanBackground.tsx`](frontend/components/GridScanBackground.tsx): High CPU (60fps Three.js)
- [`PositionIndicator.tsx`](frontend/components/PositionIndicator.tsx): Unnecessary re-renders (16ms RAF loop)
