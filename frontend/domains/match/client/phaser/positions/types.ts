export type SharedPositionStatus = 'open' | 'settled'

export interface SharedPosition {
  id: string
  playerId: string
  playerName: string
  isUp: boolean
  leverage: number
  collateral: number
  openPrice: number
  closePrice: number | null
  realizedPnl: number
  openedAt: number
  settledAt: number | null
  status: SharedPositionStatus
}

export type SharedPositionCloseReason = 'manual' | 'liquidated'

export interface SharedPositionClosingState {
  positionId: string
  reason: SharedPositionCloseReason
  realizedPnl: number
  timestamp: number
}

export interface SharedPriceData {
  price: number
}

export interface SharedPositionStoreState {
  openPositions: Map<string, SharedPosition>
  localPlayerId: string | null
  closingPositions: Map<string, SharedPositionClosingState>
  priceData: SharedPriceData | null
}

export interface PositionStoreAdapter {
  subscribe: (listener: (state: SharedPositionStoreState) => void) => () => void
  getState: () => SharedPositionStoreState
  requestClose: (positionId: string) => void
}
