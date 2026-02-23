// Game economy constants (centralized, no Phaser imports for server-side compatibility)
export const GAME_CONFIG = {
  STARTING_CASH: 100, // $100 starting balance
  GAME_DURATION_MS: 150000, // 2.5 minutes
  POSITION_COLLATERAL: 10, // $10 per position
  MAX_POSITIONS: 10, // Max positions per player (limited by $100 balance)
  LIQUIDATION_HEALTH_RATIO: 0.8, // 80% threshold - positions liquidated when health ratio <= 80%
} as const
