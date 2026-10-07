export interface StockAsset {
  symbol: string
  name: string
  address: `0x${string}`
  color: string
  logo: string
  pool: `0x${string}`
  protocol: 3 | 4
  fee: number
  tickSpacing?: number
  hooks?: `0x${string}`
}
export interface StockDrop {
  id: string
  symbol: string
  spawnedAt: number
  expiresAt: number
  lane: number
  drift: number
  rotation: number
}
export interface Acquisition {
  dropId: string
  symbol: string
  amount: string
  pool: `0x${string}`
  quoteId: string
  receivedAt: number
}
export interface Bag {
  playerId: string
  name: string
  spent: number
  /** USDG dollars reserved by in-flight quotes, not inventory positions. */
  reservedSpend: number
  assets: Acquisition[]
}
export interface ArcadeState {
  matchId: string
  status: 'ready' | 'playing' | 'valuing' | 'completed' | 'cancelled'
  startedAt: number
  cutoffAt: number
  serverTime: number
  bags: Bag[]
  drops: StockDrop[]
  simulation: true
  reason?: string
  result?: ArcadeResult
}
export interface ArcadeResult {
  block: string
  values: Record<string, string>
  winnerId: string
  simulatedPayoutUSDG: string
  settlement: 'simulated'
  winnerFixed: true
}
export interface QuoteCredit {
  amount: string
  pool: `0x${string}`
  quoteId: string
  quotedPools?: string[]
}
export const CATCH_COST = 1
export const MATCH_BUDGET = 10
export const DROP_WINDOW_MS = 2800
export const DROP_INTERVAL_MS = 1500
export const DROP_BATCH_SIZE = 2
