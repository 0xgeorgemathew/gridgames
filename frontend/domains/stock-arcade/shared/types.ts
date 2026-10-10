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
  /** Angular travel during one toss, in radians. */
  rotation: number
  /** Normalized upward impulse; absent in older room snapshots. */
  launchVelocity?: number
}
export interface Acquisition {
  dropId: string
  symbol: string
  amount: string
  pool: `0x${string}`
  quoteId: string
  receivedAt: number
  /** Simulated USDG cost captured before this quote began. */
  cost?: number
}
export interface Bag {
  playerId: string
  name: string
  spent: number
  /** USDG dollars reserved by in-flight quotes, not inventory positions. */
  reservedSpend: number
  /** Server-confirmed bet per caught token; older snapshots default to $1. */
  catchCost?: CatchCost
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
export const CATCH_AMOUNTS = [0.25, 0.5, 1, 2] as const
export type CatchCost = (typeof CATCH_AMOUNTS)[number]
export const isCatchCost = (value: unknown): value is CatchCost =>
  typeof value === 'number' && CATCH_AMOUNTS.some((amount) => amount === value)
export const catchInputAmount = (cost: CatchCost) => String(cost * 1000000)
export interface SetCatchCostPayload {
  amount: CatchCost
  requestId: string
}
export interface CatchStockPayload {
  dropId: string
  catchCost?: CatchCost
}
export interface ArcadeBetEvent {
  playerId: string
  requestId: string
  catchCost: CatchCost
  accepted: boolean
  reason?: string
}
export const MATCH_BUDGET = 10
// Another 25% slower than the previous 75% speed; motion and server expiry agree.
export const DROP_WINDOW_MS = 2800 / (0.75 * 0.75)
export const DROP_INTERVAL_MS = 2700 / (0.75 * 0.75)
export const DROP_BATCH_SIZE = 3
