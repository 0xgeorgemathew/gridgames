/**
 * Game Events - Main entry point for Socket.IO multiplayer game logic.
 *
 * This file re-exports from the modular game-events/ directory.
 * See game-events/ for individual module implementations.
 */

// Re-export everything from the modular structure
export {
  // Core exports
  setupGameEvents,
  ORDER_SETTLEMENT_DURATION_MS,
  // Classes
  SettlementGuard,
  settlementGuard,
  SeededRandom,
  CoinSequence,
  PriceFeedManager,
  priceFeed,
  GameRoom,
  RoomManager,
  // Utilities
  validatePlayerName,
  validateCoinType,
  // Types
  type WaitingPlayer,
  type PendingOrder,
  type SpawnedCoin,
  type Coin,
  type PriceBroadcastData,
} from './game-events-modules'
