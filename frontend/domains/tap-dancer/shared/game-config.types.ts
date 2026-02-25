/**
 * Shared game configuration constants
 * Used by both client and server
 */
export interface SharedGameConfig {
  STARTING_BALANCE: number
  POSITION_COLLATERAL: number
  FIXED_LEVERAGE: number
  MAX_POSITIONS: number
  LIQUIDATION_THRESHOLD: number
  // Note: No MAX_ACTIVE_COINS - TapDancer has no coins
}
