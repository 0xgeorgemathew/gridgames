# Type System Documentation

TypeScript type organization, exports, and conventions for Grid Games frontend.

## Type Organization

```
frontend/game/
├── types/
│   └── trading.ts       # All HFT Battle types
├── stores/
│   └── trading-store.ts # Zustand store
├── config.ts            # Game configuration (Phaser config, grid dimensions)
├── constants.ts         # Game constants (economy, timing) - SEPARATED from config
├── systems/             # Game systems (extracted from scenes)
└── scenes/
    └── TradingScene.ts  # Phaser scene
```

## Exported Types (from types/trading.ts)

All core HFT Battle types are centralized in `frontend/game/types/trading.ts`:

| Type | Purpose | Exported |
|------|---------|----------|
| `CoinType` | 'call' \| 'put' \| 'gas' \| 'whale' | ✅ Yes |
| `Player` | Player state (dollars, score, scene dimensions, leverage) | ✅ Yes |
| `CoinSpawnEvent` | Server coin spawn event | ✅ Yes |
| `SliceEvent` | Server slice event | ✅ Yes |
| `OrderPlacedEvent` | Active order with countdown | ✅ Yes |
| `SettlementEvent` | Settlement result after timer expires | ✅ Yes |
| `MatchFoundEvent` | Two players matched | ✅ Yes |
| `GameOverEvent` | Game over with final results | ✅ Yes |
| `PriceData` | Binance price data | ✅ Yes |
| `LobbyPlayer` | Lobby player for matchmaking | ✅ Yes |
| `LobbyPlayersEvent` | Lobby players list event | ✅ Yes |
| `LobbyUpdatedEvent` | Lobby update broadcast | ✅ Yes |

## Type Organization Updates

**Previously Missing Types (Now Exported):**
- `CoinConfig` - Now exported from `types/trading.ts` (visual and physics configuration)
- `CryptoSymbol` - Simplified to `'btcusdt'` only (defined in trading-store.ts)

**New Event Types:**
- `LobbyPlayer` - Player in matchmaking lobby
- `LobbyPlayersEvent` - List of waiting players
- `LobbyUpdatedEvent` - Lobby state changes

**ENS Integration Types:**
- `LeverageOption` - Player leverage setting (1, 2, 5, 10, 20)
- Stored in ENS text record `games.grid.leverage`
- Fetched via `frontend/lib/ens.ts`

## Type Import Patterns

### Current Pattern

```typescript
// Core types from types/
import type { CoinType, Player, LobbyPlayer } from '@/game/types/trading'

// Game configuration
import { COIN_CONFIGS, GRID_CONFIG } from '@/game/config'

// Game constants (economy, timing)
import { GAME_CONFIG } from '@/game/constants'

// ENS types
import type { LeverageOption } from '@/lib/ens'
```

## Related Documentation

- `.claude/rules/game-design.md` - Game mechanics that types model
- `.claude/rules/frontend.md` - Frontend architecture and conventions
- `ens-code-usage.md` - ENS integration and leverage types
