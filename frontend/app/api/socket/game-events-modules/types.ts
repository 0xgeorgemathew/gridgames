import { Player } from '@/game/types/trading'

// Price broadcast data for clients
export interface PriceBroadcastData {
  price: number
  change: number
  changePercent: number
  timestamp: number
}

// Waiting player in lobby
export interface WaitingPlayer {
  name: string
  socketId: string
  joinedAt: number
  sceneWidth?: number
  sceneHeight?: number
  walletAddress?: string
  leverage: number // ENS leverage for matchmaking (2, 5, 10, 20)
}

// Server-side coin
export interface Coin {
  id: string
  type: 'long' | 'short'
  x: number
  y: number
}

// Perp-style open position (replaces PendingOrder)
// Positions stay open until game end - no 5-second settlement
export interface OpenPosition {
  id: string
  playerId: string
  playerName: string
  coinType: 'long' | 'short' // Maps to isLong: long=true, short=false
  priceAtOrder: number // Entry price
  leverage: number // Leverage multiplier
  collateral: number // Fixed at $1 per position
  openedAt: number // Timestamp when position opened
  isPlayer1: boolean // For compatibility with existing game logic
}

// Position settlement result at game end
export interface PositionSettlementResult {
  positionId: string
  playerId: string
  playerName: string
  isLong: boolean
  leverage: number
  collateral: number
  openPrice: number
  closePrice: number
  realizedPnl: number
  isProfitable: boolean
}

// Player settlement summary at game end
export interface PlayerSettlementResult {
  playerId: string
  playerName: string
  totalPnl: number
  positionCount: number
  winningPositions: number
  finalBalance: number
}

// Game settlement event data
export interface GameSettlementData {
  closePrice: number
  positions: PositionSettlementResult[]
  playerResults: PlayerSettlementResult[]
  winner: {
    playerId: string
    playerName: string
    winningBalance: number
  } | null
}

// Spawned coin data for network transmission
export interface SpawnedCoin {
  id: string
  type: 'long' | 'short'
  xNormalized: number
}

// Re-export types from trading for convenience
export type { Player }
