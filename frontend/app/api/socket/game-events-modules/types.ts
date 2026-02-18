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
  type: 'call' | 'put' | 'gas' | 'whale'
  x: number
  y: number
}

// Server-side order type (same structure as client OrderPlacedEvent)
export interface PendingOrder {
  id: string
  playerId: string
  playerName: string
  coinType: 'call' | 'put' | 'whale'
  priceAtOrder: number
  settlesAt: number
  isPlayer1: boolean // Stored at order creation to avoid lookup issues at settlement
  multiplier: number // Stored at order creation - 2 if 2x was active when placed, 1 otherwise
}

// Spawned coin data for network transmission
export interface SpawnedCoin {
  id: string
  type: 'call' | 'put' | 'gas' | 'whale'
  xNormalized: number
}

// Re-export types from trading for convenience
export type { Player }
