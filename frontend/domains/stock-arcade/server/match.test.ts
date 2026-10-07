import { expect, test } from 'bun:test'
import { StockMatch } from './match'
import { STOCK_ASSETS } from '../shared/assets'
import type { ArcadeResult, QuoteCredit } from '../shared/types'
import type { RoomProvision } from '@/worker/session'
function fixture(quote?: (symbol: string, request: string) => Promise<QuoteCredit>) {
  let now = 1000000
  const tasks: Promise<unknown>[] = [],
    terminals: Array<string | undefined> = [],
    requests: string[] = []
  const result: ArcadeResult = {
    block: '100',
    values: { a: '1000000', b: '0' },
    winnerId: 'a',
    simulatedPayoutUSDG: '1000000',
    settlement: 'simulated',
    winnerFixed: true,
  }
  const config: RoomProvision = {
    roomId: 'fixture',
    gameSlug: 'stock-arcade',
    gameDuration: 60000,
    players: ['a', 'b'].map((id) => ({
      id,
      name: id,
      ticket: '',
      returnToken: '',
      sceneWidth: 500,
      sceneHeight: 800,
    })) as RoomProvision['players'],
  }
  const match = new StockMatch(config, {
    now: () => now,
    quote: async (symbol, id) => {
      requests.push(id)
      return quote
        ? quote(symbol, id)
        : {
            amount: '1000000000000000000',
            pool: STOCK_ASSETS.find((s) => s.symbol === symbol)!.pool,
            quoteId: id,
          }
    },
    value: async () => result,
    emit: () => {},
    waitUntil: (p) => tasks.push(p),
    terminal: (reason) => terminals.push(reason),
  })
  const start = () => {
    match.handle('a', 'scene_ready', null)
    match.handle('b', 'scene_ready', null)
    now = match.state.startedAt
    match.tick()
  }
  const drain = async () => {
    await Promise.all(tasks.splice(0))
  }
  return {
    match,
    start,
    drain,
    requests,
    terminals,
    setNow: (n: number) => {
      now = n
    },
  }
}
test('two ready players share authoritative opportunities; early, stale and unknown claims fail', async () => {
  const f = fixture()
  try {
    f.match.handle('a', 'scene_ready', null)
    expect(f.match.state.status).toBe('ready')
    f.match.handle('b', 'scene_ready', null)
    expect(f.match.state.startedAt).toBe(1001000)
    f.setNow(f.match.state.startedAt)
    f.match.tick()
    const drop = f.match.state.drops[0]
    f.match.handle('a', 'catch_stock', { dropId: 'unknown' })
    f.setNow(drop.expiresAt)
    f.match.handle('a', 'catch_stock', { dropId: drop.id })
    await f.drain()
    expect(f.requests).toHaveLength(0)
    expect(f.match.state.bags[0].spent).toBe(0)
  } finally {
    f.match.cleanup()
  }
})
test('pending reservation releases on quote failure; duplicate claims cannot spend twice', async () => {
  let resolve!: (q: QuoteCredit) => void
  const f = fixture(
    () =>
      new Promise((r) => {
        resolve = r
      })
  )
  try {
    f.start()
    const drop = f.match.state.drops[0]
    f.match.handle('a', 'catch_stock', { dropId: drop.id })
    f.match.handle('a', 'catch_stock', { dropId: drop.id })
    expect(f.match.state.bags[0].pending).toBe(1)
    expect(f.requests).toHaveLength(1)
    resolve({ amount: '100', pool: STOCK_ASSETS[0].pool, quoteId: 'q' })
    await f.drain()
    f.match.handle('a', 'catch_stock', { dropId: drop.id })
    await f.drain()
    expect(f.match.state.bags[0].spent).toBe(1)
    expect(f.match.state.bags[0].assets).toHaveLength(1)
    expect(f.match.state.bags[1].spent).toBe(0)
  } finally {
    f.match.cleanup()
  }
  const fail = fixture(async () => {
    throw new Error('No quote')
  })
  try {
    fail.start()
    fail.match.handle('a', 'catch_stock', { dropId: fail.match.state.drops[0].id })
    await fail.drain()
    expect(fail.match.state.bags[0]).toMatchObject({ spent: 0, pending: 0, assets: [] })
  } finally {
    fail.match.cleanup()
  }
})
test('ten confirmed catches enforce $10 cap independently per player', async () => {
  const f = fixture()
  try {
    f.start()
    for (let i = 0; i < 11; i++) {
      f.setNow(f.match.state.startedAt + i * 1500)
      f.match.tick()
      const drop = f.match.state.drops.at(-1)!
      f.match.handle('a', 'catch_stock', { dropId: drop.id })
      await f.drain()
    }
    expect(f.requests).toHaveLength(10)
    expect(f.match.state.bags[0].spent).toBe(10)
    f.match.handle('b', 'catch_stock', { dropId: f.match.state.drops.at(-1)!.id })
    await f.drain()
    expect(f.match.state.bags[1].spent).toBe(1)
  } finally {
    f.match.cleanup()
  }
})
test('pending at cutoff cancels; late quote cannot credit or produce payout', async () => {
  let resolve!: (q: QuoteCredit) => void
  const f = fixture(
    () =>
      new Promise((r) => {
        resolve = r
      })
  )
  try {
    f.start()
    f.match.handle('a', 'catch_stock', { dropId: f.match.state.drops[0].id })
    f.setNow(f.match.state.cutoffAt)
    f.match.tick()
    expect(f.match.state.status).toBe('cancelled')
    expect(f.terminals).toEqual(['pending_at_cutoff'])
    resolve({ amount: '10', pool: STOCK_ASSETS[0].pool, quoteId: 'late' })
    await f.drain()
    expect(f.match.state.bags[0].spent).toBe(0)
    expect(f.match.state.result).toBeUndefined()
  } finally {
    f.match.cleanup()
  }
})
test('completed score is fixed; leave/disconnect cancels active match without settlement', async () => {
  const f = fixture()
  try {
    f.start()
    f.match.handle('a', 'catch_stock', { dropId: f.match.state.drops[0].id })
    await f.drain()
    f.setNow(f.match.state.cutoffAt)
    f.match.tick()
    await f.drain()
    expect(f.match.state.status).toBe('completed')
    expect(f.match.state.result?.winnerFixed).toBe(true)
    f.match.handle('a', 'end_game', null)
    expect(f.match.state.status).toBe('completed')
  } finally {
    f.match.cleanup()
  }
  const c = fixture()
  try {
    c.start()
    c.match.cancel('player_disconnected')
    expect(c.match.state.status).toBe('cancelled')
    expect(c.match.state.result).toBeUndefined()
  } finally {
    c.match.cleanup()
  }
})
