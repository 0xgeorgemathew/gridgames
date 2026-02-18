import type { CoinType, Player, SettlementEvent } from '../../types/trading'
import {
  STANDARD_DAMAGE,
  WHALE_DAMAGE,
  TUG_OF_WAR_MIN,
  TUG_OF_WAR_MAX,
} from './types'

// Debug logging control
const DEBUG_FUNDS = typeof process !== 'undefined' && process.env?.DEBUG_FUNDS === 'true'

/**
 * Get damage amount for a coin type.
 */
export function getDamageForCoinType(coinType: CoinType): number {
  return coinType === 'whale' ? WHALE_DAMAGE : STANDARD_DAMAGE
}

/**
 * Calculate tug-of-war delta based on player position and correctness.
 */
export function calculateTugOfWarDelta(
  isPlayer1: boolean,
  isCorrect: boolean,
  damage: number
): number {
  const delta = isCorrect ? -damage : damage
  return isPlayer1 ? delta : -delta
}

/**
 * Apply damage to a specific player.
 */
export function applyDamageToPlayer(
  players: Player[],
  playerId: string,
  damage: number
): Player[] {
  return players.map((p) =>
    p.id === playerId ? { ...p, dollars: Math.max(0, p.dollars - damage) } : p
  )
}

/**
 * Transfer funds from loser to winner (zero-sum with $0 floor).
 * Caps transfer at loser's available balance.
 */
export function transferFunds(
  players: Player[],
  winnerId: string,
  loserId: string,
  amount: number
): Player[] {
  const loser = players.find((p) => p.id === loserId)
  const actualTransfer = Math.min(amount, loser?.dollars || 0)

  return players.map((p) => {
    if (p.id === winnerId) {
      return { ...p, dollars: p.dollars + actualTransfer }
    }
    if (p.id === loserId) {
      return { ...p, dollars: p.dollars - actualTransfer }
    }
    return p
  })
}

/**
 * Get the target player ID for a settlement.
 */
export function getTargetPlayerId(
  settlement: SettlementEvent,
  players: Player[]
): string | undefined {
  if (settlement.isCorrect) {
    return players.find((p) => p.id !== settlement.playerId)?.id
  }
  return settlement.playerId
}

/**
 * Clamp tug-of-war value to valid range.
 */
export function clampTugOfWar(value: number): number {
  return Math.max(TUG_OF_WAR_MIN, Math.min(TUG_OF_WAR_MAX, value))
}

/**
 * Debug logging for fund transfers.
 */
export function logFundTransfer(
  playersBefore: Player[],
  playersAfter: Player[],
  winnerId: string,
  loserId: string,
  amount: number,
  description: string,
  details?: string
): void {
  if (!DEBUG_FUNDS) return

  const totalBefore = playersBefore.reduce((sum, p) => sum + p.dollars, 0)
  const playersBeforeStr = playersBefore.map((p) => `${p.name}:${p.dollars}`).join(' | ')
  const totalAfter = playersAfter.reduce((sum, p) => sum + p.dollars, 0)
  const playersAfterStr = playersAfter.map((p) => `${p.name}:${p.dollars}`).join(' | ')

  if (totalAfter !== totalBefore) {
    const cappedLoss = totalBefore - totalAfter
    if (cappedLoss > 0) {
      // console.warn(`[CLIENT FUND CAP] ${description}: ${cappedLoss} lost to zero-cap`)
    }
  }
}

/**
 * Extend window interface for Phaser event bridge.
 */
declare global {
  interface Window {
    phaserEvents?: import('./types').PhaserEventBridge
    sceneDimensions?: { width: number; height: number }
  }
}
