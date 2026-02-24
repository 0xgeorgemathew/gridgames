export interface PriceBroadcastData {
  price: number
  change: number
  changePercent: number
  timestamp: number
}

export interface WaitingPlayer {
  name: string
  socketId: string
  joinedAt: number
  sceneWidth?: number
  sceneHeight?: number
  walletAddress?: string
  leverage: number
  gameDuration: number
}

export interface Coin {
  id: string
  type: 'long' | 'short'
  x: number
  y: number
}

export interface OpenPosition {
  id: string
  playerId: string
  playerName: string
  coinType: 'long' | 'short'
  priceAtOrder: number
  leverage: number
  collateral: number
  openedAt: number
  isPlayer1: boolean
}

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
  isLiquidated: boolean
}

export interface PlayerSettlementResult {
  playerId: string
  playerName: string
  totalPnl: number
  positionCount: number
  winningPositions: number
  finalBalance: number
}

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

export interface SpawnedCoin {
  id: string
  type: 'long' | 'short'
  xNormalized: number
  velocityX: number
  velocityY: number
  sequenceIndex: number
}

export interface LiquidationEvent {
  positionId: string
  playerId: string
  playerName: string
  isLong: boolean
  leverage: number
  collateral: number
  openPrice: number
  liquidationPrice: number
  healthRatio: number
  pnlAtLiquidation: number
}

export interface Player {
  id: string
  name: string
  dollars: number
  score: number
  sceneWidth: number
  sceneHeight: number
  leverage: number
}
