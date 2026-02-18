/**
 * Trading Store - Main entry point for HFT Battle game state.
 *
 * This file re-exports from the modular trading-store/ directory.
 * See trading-store/ for individual module implementations.
 */

export {
  useTradingStore,
  // Types
  type TradingState,
  type ConnectionState,
  type LobbyState,
  type RoomState,
  type RoundState,
  type GameState,
  type AudioState,
  type PriceFeedState,
  type CryptoSymbol,
  type PhaserEventBridge,
  // Constants
  STANDARD_DAMAGE,
  WHALE_DAMAGE,
  TUG_OF_WAR_MIN,
  TUG_OF_WAR_MAX,
  // Helpers
  getDamageForCoinType,
  calculateTugOfWarDelta,
  applyDamageToPlayer,
  transferFunds,
  getTargetPlayerId,
  clampTugOfWar,
  logFundTransfer,
} from './trading-store-modules'
