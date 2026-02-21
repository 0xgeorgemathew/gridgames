# Debug Mode Rules

## Multiplayer Debugging

- **Race conditions**: Check liquidation guard logs in [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) for duplicate liquidation attempts
- **Memory leaks**: Verify all timers are tracked in `GameRoom.timeouts`/`GameRoom.intervals` - untracked timers cause leaks on room deletion
- **State mismatches**: Player IDs cached at position creation may differ from current positions during async settlement

## Socket.IO Debugging

- Server runs embedded in Next.js at [`/api/socket/route.ts`](frontend/app/api/socket/route.ts)
- CORS uses origin reflection for Mini App iframe compatibility (not wildcard `*`)
- Check client orphaned position cleanup in [`trading-store-modules/index.ts`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts)

## Liquidation Debugging

- Liquidation threshold: 80% collateral health ratio
- Health ratio formula: `(Net Collateral + PnL) / Net Collateral`
- Check `checkLiquidations()` called on every price update
- Verify position removed from `openPositions` after liquidation

## Known Issues

- [`GridScanBackground.tsx`](frontend/components/GridScanBackground.tsx): High CPU (60fps Three.js)
- [`PositionIndicator.tsx`](frontend/games/hyper-swiper/components/PositionIndicator.tsx): Position display updates on price change

## Game Mechanics (Hyper Swiper)

| Aspect | Value |
|--------|-------|
| Game duration | 2.5 minutes (150,000ms) |
| Starting cash | $10 per player |
| Position collateral | $1 per position |
| Leverage | Fixed at 100X |
| Position style | Perp-style (open until game end) |
| Liquidation threshold | 80% collateral health ratio |
| Coin types | Long (▲) and Short (▼) only |
