import { RealtimeSocket } from '../platform/multiplayer/client'
import { dropPoint } from '../domains/stock-arcade/client/motion'
import type { ArcadeState } from '../domains/stock-arcade/shared/types'
const base = process.argv[2] || 'http://127.0.0.1:4173'
const requireCompleted = process.argv.includes('--require-completed')
// Synthetic protocol identities. This is NOT authenticated UI coverage and never signs or sends funds.
class Peer {
  socket = new RealtimeSocket(base)
  state: ArcadeState | null = null
  claims: Array<{ dropId: string; status: string; reason?: string }> = []
  terminal = false
  serverOffset = 0
  constructor() {
    this.socket.on('arcade_state', (raw: unknown) => {
      this.state = raw as ArcadeState
      this.serverOffset = this.state.serverTime - Date.now()
      if (this.state.status === 'ready') this.socket.emit('scene_ready')
      if (['cancelled', 'completed'].includes(this.state.status)) this.terminal = true
    })
    this.socket.on('arcade_claim', (raw: unknown) => {
      const claim = raw as { playerId: string; dropId: string; status: string; reason?: string }
      if (claim.playerId === this.socket.id) this.claims.push(claim)
    })
  }
  close() {
    this.socket.disconnect()
  }
}
async function until(test: () => boolean, label: string, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (!test()) {
    if (Date.now() > deadline) throw new Error(`Timeout: ${label}`)
    await new Promise((r) => setTimeout(r, 30))
  }
}
const a = new Peer(),
  b = new Peer()
try {
  await until(() => a.socket.connected && b.socket.connected, 'connect')
  if (a.socket.id === b.socket.id) throw new Error('Distinct identities required')
  a.socket.emit('find_match', {
    playerName: 'Quote QA A',
    gameSlug: 'stock-arcade',
    gameDuration: 22000,
    walletAddress: '0x0000000000000000000000000000000000000001',
  })
  b.socket.emit('find_match', {
    playerName: 'Quote QA B',
    gameSlug: 'stock-arcade',
    gameDuration: 22000,
    walletAddress: '0x0000000000000000000000000000000000000002',
  })
  await until(() => a.state?.status === 'playing' && b.state?.status === 'playing', 'shared start')
  if (a.state!.matchId !== b.state!.matchId || a.state!.cutoffAt !== b.state!.cutoffAt)
    throw new Error('Room/clock mismatch')
  const attempted = new Set<string>()
  const attemptSymbols = new Map<string, string>()
  const visibleCounts: number[] = []
  const batches = new Map<number, Set<string>>()
  const deadline = Date.now() + 19000
  while (Date.now() < deadline && !a.terminal) {
    // Observe the uncaught opponent's actual authoritative stream and render geometry.
    const time = Date.now() + b.serverOffset
    if (
      b.state?.status === 'playing' &&
      time >= b.state.startedAt + 200 &&
      time < b.state.cutoffAt - 200
    ) {
      const visible = b.state.drops.filter(
        (d) => time >= d.spawnedAt && time < d.expiresAt && dropPoint(d, time).y <= 1
      )
      visibleCounts.push(visible.length)
      for (const drop of b.state.drops) {
        const ids = batches.get(drop.spawnedAt) ?? new Set<string>()
        ids.add(drop.id)
        batches.set(drop.spawnedAt, ids)
      }
    }
    const creditedSymbols = new Set(
      a.state!.bags.find((bag) => bag.playerId === a.socket.id)!.assets.map((asset) => asset.symbol)
    )
    const latestClaims = new Map(a.claims.map((claim) => [claim.dropId, claim.status]))
    const pendingSymbols = new Set(
      [...latestClaims]
        .filter(([, status]) => status === 'pending')
        .map(([id]) => attemptSymbols.get(id))
    )
    // Coverage strategy only: await each symbol's quote before retrying a later drop.
    // Real players may catch repeated symbols; the game still dedups by drop ID.
    for (const drop of a.state!.drops)
      if (
        !attempted.has(drop.id) &&
        !creditedSymbols.has(drop.symbol) &&
        !pendingSymbols.has(drop.symbol) &&
        Date.now() < drop.expiresAt
      ) {
        attempted.add(drop.id)
        attemptSymbols.set(drop.id, drop.symbol)
        a.socket.emit('catch_stock', { dropId: drop.id })
        a.socket.emit('catch_stock', { dropId: drop.id }) // intentional replay; exactly one credit allowed
      }
    await new Promise((r) => setTimeout(r, 100))
  }
  await until(() => a.terminal && b.terminal, 'cutoff', 35000)
  const bag = a.state!.bags.find((bag) => bag.playerId === a.socket.id)!
  if (
    bag.spent > 10 ||
    bag.assets.length !== bag.spent ||
    new Set(bag.assets.map((x) => x.dropId)).size !== bag.assets.length
  )
    throw new Error('Ledger/cap invariant')
  if (
    !visibleCounts.length ||
    Math.min(...visibleCounts) < 2 ||
    Math.max(...visibleCounts) > 4 ||
    [...batches.values()].some((ids) => ids.size !== 2)
  )
    throw new Error('Expected paired spawns and two to four concurrent visible choices')
  console.log(
    JSON.stringify(
      {
        base,
        room: a.state!.matchId,
        sameRoom: true,
        commonCutoff: true,
        attempts: attempted.size,
        credits: bag.spent,
        ledgerDedup: true,
        concurrentVisibleChoices: {
          min: Math.min(...visibleCounts),
          max: Math.max(...visibleCounts),
          samples: visibleCounts.length,
        },
        pairedSpawns: [...batches.values()].every((ids) => ids.size === 2),
        status: a.state!.status,
        reason: a.state!.reason,
        result: a.state!.result,
        quoteResults: a.claims
          .filter((c) => c.status === 'failed')
          .map((c) => ({ drop: c.dropId.split(':').at(-1), reason: c.reason })),
        acquired: bag.assets.map((x) => ({ symbol: x.symbol, amount: x.amount, pool: x.pool })),
      },
      null,
      2
    )
  )
  if (
    requireCompleted &&
    (a.state!.status !== 'completed' ||
      bag.spent !== 10 ||
      new Set(bag.assets.map((asset) => asset.symbol)).size !== 10 ||
      !a.state!.result?.winnerFixed)
  )
    throw new Error('Expected all ten quoted catches and fixed common-cutoff settlement')
} finally {
  a.close()
  b.close()
}
const c = new Peer(),
  d = new Peer()
try {
  await until(() => c.socket.connected && d.socket.connected, 'disconnect peers')
  c.socket.emit('find_match', {
    playerName: 'Disconnect QA C',
    gameSlug: 'stock-arcade',
    gameDuration: 10000,
  })
  d.socket.emit('find_match', {
    playerName: 'Disconnect QA D',
    gameSlug: 'stock-arcade',
    gameDuration: 10000,
  })
  await until(
    () => c.state?.status === 'playing' && d.state?.status === 'playing',
    'disconnect match'
  )
  c.close()
  await until(() => d.terminal, 'disconnect cancellation')
  if (d.state?.status !== 'cancelled' || d.state.result) throw new Error('Disconnect settled a bag')
  console.log(JSON.stringify({ disconnectCancel: true, reason: d.state.reason }))
} finally {
  c.close()
  d.close()
}
