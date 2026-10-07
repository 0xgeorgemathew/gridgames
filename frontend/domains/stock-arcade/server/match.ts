import { STOCK_ASSETS } from '../shared/assets'
import {
  CATCH_CAP,
  DROP_INTERVAL_MS,
  DROP_WINDOW_MS,
  type Acquisition,
  type ArcadeResult,
  type ArcadeState,
  type QuoteCredit,
  type StockDrop,
} from '../shared/types'
import type { RoomProvision } from '@/worker/session'
export interface ArcadeServices {
  now: () => number
  quote: (symbol: string, requestId: string, swapper?: string) => Promise<QuoteCredit>
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
        pending: 0,
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
    if (
      this.state.status !== 'playing' ||
      now >= this.state.cutoffAt ||
      !drop ||
      now < drop.spawnedAt ||
      now >= drop.expiresAt ||
      bag.spent + bag.pending >= CATCH_CAP ||
      this.attempted.has(key)
    ) {
      this.services.emit('arcade_claim', {
        playerId,
        dropId,
        status: 'failed',
        reason: 'Catch unavailable, expired or bag full',
      })
      return
    }
    // Reserve before the first await. Each opportunity is independent for each player.
    this.attempted.add(key)
    this.claims.set(key, { status: 'pending', symbol: drop.symbol })
    bag.pending++
    this.publish()
    this.services.emit('arcade_claim', { playerId, dropId, status: 'pending' })
    const task = this.services
      .quote(
        drop.symbol,
        `${this.config.roomId}:${key}`,
        this.config.players.find((p) => p.id === playerId)?.walletAddress
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
        }
        bag.pending--
        bag.spent++
        bag.assets.push(acquisition)
        this.claims.set(key, { status: 'credited', symbol: drop.symbol })
        this.publish()
        this.services.emit('arcade_claim', { playerId, dropId, status: 'credited' })
      })
      .catch((error: unknown) => {
        if (this.claims.get(key)?.status !== 'pending') return
        bag.pending = Math.max(0, bag.pending - 1)
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
    if (now >= this.state.startedAt + this.nextDrop * DROP_INTERVAL_MS) {
      const i = this.nextDrop++
      // Shared deterministic opportunities; no random asset preference between players.
      const asset = STOCK_ASSETS[i % STOCK_ASSETS.length]
      const spawnedAt = this.state.startedAt + i * DROP_INTERVAL_MS
      const drop: StockDrop = {
        id: `${this.config.roomId}:${i}`,
        symbol: asset.symbol,
        spawnedAt,
        expiresAt: Math.min(spawnedAt + DROP_WINDOW_MS, this.state.cutoffAt),
        lane: 0.2 + (i % 4) * 0.2,
        drift: i % 2 ? -0.12 : 0.12,
        rotation: i % 2 ? -0.35 : 0.35,
      }
      this.state.drops.push(drop)
      this.publish()
    }
  }
  private cutoff() {
    this.cleanup()
    const ambiguous = this.state.bags.some((b) => b.pending > 0)
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
          console.error(
            JSON.stringify({
              event: 'valuation_failed',
              name: error instanceof Error ? error.name : 'Unknown',
              message: error instanceof Error ? error.message.slice(0, 1000) : 'Unavailable',
            })
          )
          this.cancel('valuation_unavailable_or_tied')
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
