import { ValuationError } from './valuation-error'
import { shuffledStocks } from '../shared/sequence'
import { STOCK_ASSETS } from '../shared/assets'
import {
  MATCH_BUDGET,
  CATCH_COST,
  isCatchCost,
  DROP_INTERVAL_MS,
  DROP_BATCH_SIZE,
  DROP_WINDOW_MS,
  type Acquisition,
  type ArcadeResult,
  type ArcadeState,
  type QuoteCredit,
  type StockDrop,
  type CatchCost,
  type ArcadeBetEvent,
} from '../shared/types'
import type { RoomProvision } from '@/worker/session'
export interface ArcadeServices {
  now: () => number
  quote: (
    symbol: string,
    requestId: string,
    swapper?: string,
    cost?: CatchCost
  ) => Promise<QuoteCredit>
  random?: () => number
  value: (bags: ArcadeState['bags'], cutoffAt: number) => Promise<ArcadeResult>
  emit: (event: string, payload: unknown) => void
  waitUntil: (promise: Promise<unknown>) => void
  terminal: (reason?: string) => void
}
/** One synchronization implementation: authoritative schedule, clock, claims and ledger. */
export class StockMatch {
  readonly state: ArcadeState
  private ready = new Set<string>()
  private claims = new Map<string, { status: 'pending' | 'credited' | 'failed'; symbol: string }>()
  private attempted = new Set<string>()
  private sequence = shuffledStocks(STOCK_ASSETS)
  private nextDrop = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private readyTimer: ReturnType<typeof setTimeout> | null = null
  constructor(
    private config: RoomProvision,
    private services: ArcadeServices
  ) {
    this.state = {
      matchId: config.roomId,
      status: 'ready',
      startedAt: 0,
      cutoffAt: 0,
      serverTime: services.now(),
      simulation: true,
      drops: [],
      bags: config.players.map((p) => ({
        playerId: p.id,
        name: p.name,
        spent: 0,
        reservedSpend: 0,
        catchCost: CATCH_COST,
        assets: [],
      })),
    }
  }
  initialize() {
    this.publish()
    // Never silently start before both players are ready.
    this.readyTimer = setTimeout(() => this.cancel('ready_timeout'), 15000)
  }
  handle(playerId: string, event: string, payload: unknown) {
    if (!this.state.bags.some((b) => b.playerId === playerId)) return
    if (event === 'scene_ready' && this.state.status === 'ready') {
      this.ready.add(playerId)
      if (this.ready.size === 2) this.start()
      return
    }
    if (event === 'end_game') {
      this.cancel('player_left')
      return
    }
    if (event === 'set_catch_cost') {
      const request = payload as { amount?: unknown; requestId?: unknown } | null
      if (
        typeof request?.requestId !== 'string' ||
        !request.requestId ||
        request.requestId.length > 100
      )
        return
      const bag = this.state.bags.find((b) => b.playerId === playerId)!
      const accepted =
        (this.state.status === 'ready' || this.state.status === 'playing') &&
        (this.state.status === 'ready' || this.services.now() < this.state.cutoffAt) &&
        isCatchCost(request.amount)
      if (accepted) {
        bag.catchCost = request.amount as CatchCost
        this.publish()
      }
      const response: ArcadeBetEvent = {
        playerId,
        requestId: request.requestId,
        catchCost: bag.catchCost ?? CATCH_COST,
        accepted,
        ...(!accepted ? { reason: 'Bet unavailable or match closed' } : {}),
      }
      this.services.emit('arcade_bet', response)
      return
    }
    if (event !== 'catch_stock') return
    const dropId =
      payload && typeof payload === 'object' && 'dropId' in payload ? payload.dropId : null
    if (typeof dropId !== 'string' || dropId.length > 100) return
    const key = `${playerId}:${dropId}`
    if (this.claims.has(key)) {
      this.services.emit('arcade_claim', { playerId, dropId, status: this.claims.get(key)!.status })
      return
    }
    const now = this.services.now()
    const drop = this.state.drops.find((d) => d.id === dropId)
    const bag = this.state.bags.find((b) => b.playerId === playerId)!
    const cost = bag.catchCost ?? CATCH_COST
    const expectedCost =
      payload && typeof payload === 'object' && 'catchCost' in payload
        ? payload.catchCost
        : undefined
    if (
      this.state.status !== 'playing' ||
      now >= this.state.cutoffAt ||
      !drop ||
      now < drop.spawnedAt ||
      now >= drop.expiresAt ||
      bag.spent + bag.reservedSpend + cost > MATCH_BUDGET ||
      (expectedCost !== undefined && expectedCost !== cost) ||
      this.attempted.has(key)
    ) {
      this.services.emit('arcade_claim', {
        playerId,
        dropId,
        status: 'failed',
        reason: 'Catch unavailable, expired or budget exhausted',
      })
      return
    }
    // Reserve before the first await. Each opportunity is independent for each player.
    this.attempted.add(key)
    this.claims.set(key, { status: 'pending', symbol: drop.symbol })
    bag.reservedSpend += cost
    this.publish()
    this.services.emit('arcade_claim', { playerId, dropId, status: 'pending' })
    const task = this.services
      .quote(
        drop.symbol,
        `${this.config.roomId}:${key}`,
        this.config.players.find((p) => p.id === playerId)?.walletAddress,
        cost
      )
      .then((quote) => {
        // Conservative demo rule: quote-backed credit must arrive before cutoff.
        if (this.state.status !== 'playing' || this.services.now() >= this.state.cutoffAt)
          throw new Error('Quote arrived after cutoff')
        if (!/^\d+$/.test(quote.amount) || BigInt(quote.amount) <= 0n)
          throw new Error('Invalid quote amount')
        const acquisition: Acquisition = {
          dropId,
          symbol: drop.symbol,
          ...quote,
          receivedAt: this.services.now(),
          cost,
        }
        bag.reservedSpend -= cost
        bag.spent += cost
        bag.assets.push(acquisition)
        this.claims.set(key, { status: 'credited', symbol: drop.symbol })
        this.publish()
        this.services.emit('arcade_claim', { playerId, dropId, status: 'credited' })
      })
      .catch((error: unknown) => {
        if (this.claims.get(key)?.status !== 'pending') return
        bag.reservedSpend = Math.max(0, bag.reservedSpend - cost)
        this.claims.set(key, { status: 'failed', symbol: drop.symbol })
        this.publish()
        this.services.emit('arcade_claim', {
          playerId,
          dropId,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Quote unavailable',
        })
      })
    this.services.waitUntil(task)
  }
  private start() {
    if (this.readyTimer) clearTimeout(this.readyTimer)
    this.state.status = 'playing'
    this.state.startedAt = this.services.now() + 1000
    this.state.cutoffAt = this.state.startedAt + this.config.gameDuration
    this.publish()
    this.timer = setInterval(() => this.tick(), 100)
  }
  tick() {
    if (this.state.status !== 'playing') return
    const now = this.services.now()
    if (now >= this.state.cutoffAt) {
      this.cutoff()
      return
    }
    this.state.drops = this.state.drops.filter((d) => d.expiresAt > now)
    const batch = Math.floor(this.nextDrop / DROP_BATCH_SIZE)
    if (now >= this.state.startedAt + batch * DROP_INTERVAL_MS) {
      // Three shared tosses per launch. Each deck stays independent of catches;
      // the previous flight clears the arena before the next larger coins arrive.
      const spawnedAt = this.state.startedAt + batch * DROP_INTERVAL_MS
      const random = this.services.random ?? secureRandom
      const drift = (random() < 0.5 ? -1 : 1) * (0.06 + random() * 0.05)
      for (let n = 0; n < DROP_BATCH_SIZE; n++) {
        const i = this.nextDrop++
        if (i > 0 && i % STOCK_ASSETS.length === 0) this.sequence = shuffledStocks(STOCK_ASSETS)
        const asset = this.sequence[i % this.sequence.length]
        const drop: StockDrop = {
          id: `${this.config.roomId}:${i}`,
          symbol: asset.symbol,
          spawnedAt: spawnedAt + (n === 0 ? 0 : n * (40 + random() * 80)),
          expiresAt: 0,
          // Bounded parallel lanes preserve 88px clearance at 320px, with
          // independent heights/spin and shared server-owned randomness.
          lane: [0.21, 0.5, 0.79][n] - drift / 2 + (random() - 0.5) * 0.006,
          drift: drift + (random() - 0.5) * 0.004,
          rotation: (random() < 0.5 ? -1 : 1) * (2.1 + random() * 2.1),
          launchVelocity: 3.5 + random() * 0.7,
        }
        drop.expiresAt = Math.min(drop.spawnedAt + DROP_WINDOW_MS, this.state.cutoffAt)
        this.state.drops.push(drop)
      }
      this.publish()
    }
  }

  private cutoff() {
    this.cleanup()
    const ambiguous = this.state.bags.some((b) => b.reservedSpend > 0)
    if (ambiguous) {
      this.cancel('pending_at_cutoff')
      return
    }
    this.state.status = 'valuing'
    this.publish()
    this.services.waitUntil(
      this.services
        .value(this.state.bags, this.state.cutoffAt)
        .then((result) => {
          if (this.state.status !== 'valuing') return
          this.state.status = 'completed'
          this.state.result = result
          this.publish()
          this.services.terminal()
        })
        .catch((error: unknown) => {
          const reason = error instanceof ValuationError ? error.reason : 'valuation_unavailable'
          const message =
            error instanceof Error
              ? 'shortMessage' in error && typeof error.shortMessage === 'string'
                ? error.shortMessage
                : error.message
              : 'Unavailable'
          console.error(
            JSON.stringify({
              event: 'valuation_failed',
              reason,
              name: error instanceof Error ? error.name : 'Unknown',
              message: message.slice(0, 250),
            })
          )
          this.cancel(reason)
        })
    )
  }
  cancel(reason: string) {
    if (this.state.status === 'completed' || this.state.status === 'cancelled') return
    this.cleanup()
    this.state.status = 'cancelled'
    this.state.reason = reason
    this.publish()
    this.services.terminal(reason)
  }
  cleanup() {
    if (this.timer) clearInterval(this.timer)
    if (this.readyTimer) clearTimeout(this.readyTimer)
    this.timer = this.readyTimer = null
  }
  private publish() {
    this.state.serverTime = this.services.now()
    this.services.emit('arcade_state', structuredClone(this.state))
  }
}

function secureRandom() {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return value[0] / 0x100000000
}
