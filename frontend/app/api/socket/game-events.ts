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
  // Classes
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
  type OpenPosition,
  type SpawnedCoin,
  type Coin,
  type PriceBroadcastData,
  type PositionSettlementResult,
  type PlayerSettlementResult,
  type GameSettlementData,
} from './game-events-modules'
