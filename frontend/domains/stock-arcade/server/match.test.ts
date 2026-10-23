import { expect, test } from 'bun:test'
import { StockMatch } from './match'
import { ValuationError } from './valuation-error'
import { dropPoint } from '../client/motion'
import { STOCK_ASSETS } from '../shared/assets'
import {
  DROP_BATCH_SIZE,
  DROP_INTERVAL_MS,
  type ArcadeResult,
  type QuoteCredit,
} from '../shared/types'
import { discDiameter } from '../client/motion'
import type { RoomProvision } from '@/worker/session'
function fixture(
  quote?: (symbol: string, request: string) => Promise<QuoteCredit>,
  value?: () => Promise<ArcadeResult>,
  random?: () => number
) {
  let now = 1000000
  const tasks: Promise<unknown>[] = [],
    terminals: Array<string | undefined> = [],
    requests: string[] = []
  const quoteCosts: Array<number | undefined> = []
  const events: Array<{ event: string; payload: unknown }> = []
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
    random,
    quote: async (symbol, id, _swapper, cost) => {
      requests.push(id)
      quoteCosts.push(cost)
      return quote
        ? quote(symbol, id)
        : {
            amount: '1000000000000000000',
            pool: STOCK_ASSETS.find((s) => s.symbol === symbol)!.pool,
            quoteId: id,
          }
    },
    value: value ?? (async () => result),
    emit: (event, payload) => events.push({ event, payload }),
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
    quoteCosts,
    events,
    terminals,
    setNow: (n: number) => {
      now = n
    },
  }
}

test('server-confirmed bet changes quote size; pending catches retain their captured cost', async () => {
  let finish!: (quote: QuoteCredit) => void
  const f = fixture(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  try {
    f.start()
    f.match.handle('a', 'set_catch_cost', { amount: 2, requestId: 'first' })
    expect(f.match.state.bags[0].catchCost).toBe(2)
    expect(f.match.state.bags[1].catchCost).toBe(1)
    const drop = f.match.state.drops[0]
    f.match.handle('a', 'catch_stock', { dropId: drop.id, catchCost: 2 })
    expect(f.match.state.bags[0].reservedSpend).toBe(2)
    expect(f.quoteCosts).toEqual([2])
    f.match.handle('a', 'set_catch_cost', { amount: 0.25, requestId: 'second' })
    expect(f.match.state.bags[0].catchCost).toBe(0.25)
    finish({
      amount: '123',
      pool: STOCK_ASSETS.find((a) => a.symbol === drop.symbol)!.pool,
      quoteId: 'q',
    })
    await f.drain()
    expect(f.match.state.bags[0]).toMatchObject({ spent: 2, reservedSpend: 0 })
    expect(f.match.state.bags[0].assets[0].cost).toBe(2)
    expect(f.events.at(-2)?.event).toBe('arcade_state')
  } finally {
    f.match.cleanup()
  }
})

test('invalid or late bet changes and stale-cost catches never mutate the ledger', async () => {
  const f = fixture()
  try {
    f.start()
    for (const amount of [0, -1, 3, '2', null, Infinity])
      f.match.handle('a', 'set_catch_cost', { amount, requestId: 'invalid' })
    f.match.handle('intruder', 'set_catch_cost', { amount: 2, requestId: 'unknown' })
    expect(f.match.state.bags[0].catchCost).toBe(1)
    f.match.handle('a', 'set_catch_cost', { amount: 2, requestId: 'valid' })
    f.match.handle('a', 'catch_stock', { dropId: f.match.state.drops[0].id, catchCost: 1 })
    await f.drain()
    expect(f.requests).toHaveLength(0)
    f.setNow(f.match.state.cutoffAt)
    f.match.handle('a', 'set_catch_cost', { amount: 0.5, requestId: 'late' })
    expect(f.match.state.bags[0].catchCost).toBe(2)
    expect(f.events.at(-1)).toMatchObject({
      event: 'arcade_bet',
      payload: { accepted: false, requestId: 'late' },
    })
  } finally {
    f.match.cleanup()
  }
})

test('a failed quote releases its original fractional reservation after changing the bet', async () => {
  let reject!: (reason: Error) => void
  const f = fixture(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      })
  )
  try {
    f.start()
    f.match.handle('a', 'set_catch_cost', { amount: 0.5, requestId: 'half' })
    f.match.handle('a', 'catch_stock', { dropId: f.match.state.drops[0].id, catchCost: 0.5 })
    expect(f.match.state.bags[0].reservedSpend).toBe(0.5)
    f.match.handle('a', 'set_catch_cost', { amount: 2, requestId: 'two' })
    reject(new Error('Unavailable'))
    await f.drain()
    expect(f.match.state.bags[0]).toMatchObject({ spent: 0, reservedSpend: 0, assets: [] })
  } finally {
    f.match.cleanup()
  }
})

test('randomized launches vary the highest slot, drift, spin and release while retaining mobile clearance', () => {
  let seed = 42
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const f = fixture(undefined, undefined, random)
  try {
    f.start()
    const highest = new Set<number>(),
      spins = new Set<number>(),
      drifts = new Set<number>()
    for (let batch = 0; batch < 12; batch++) {
      f.setNow(f.match.state.startedAt + batch * DROP_INTERVAL_MS)
      f.match.tick()
      const drops = f.match.state.drops.slice(-3)
      const velocities = drops.map((d) => d.launchVelocity!)
      highest.add(velocities.indexOf(Math.max(...velocities)))
      for (const d of drops) {
        spins.add(d.rotation)
        drifts.add(d.drift)
      }
      expect(new Set(drops.map((d) => d.spawnedAt)).size).toBeGreaterThan(1)
      for (let t = 0; t < 4700; t += 40) {
        const points = drops.map((d) => dropPoint(d, drops[0].spawnedAt + t))
        for (let i = 0; i < points.length; i++) {
          expect(points[i].x * 320).toBeGreaterThanOrEqual(44)
          expect(points[i].x * 320).toBeLessThanOrEqual(276)
          for (let j = i + 1; j < points.length; j++)
            expect((points[j].x - points[i].x) * 320).toBeGreaterThan(88)
        }
      }
    }
    expect([...highest].sort()).toEqual([0, 1, 2])
    expect(spins.size).toBeGreaterThan(12)
    expect(drifts.size).toBeGreaterThan(12)
  } finally {
    f.match.cleanup()
  }
})

test('randomization extremes keep every full-flight disc inside the mobile lanes', () => {
  for (const random of [
    () => 0,
    () => 0.999999999,
    (() => {
      let alternate = false
      return () => ((alternate = !alternate) ? 0 : 0.999999999)
    })(),
  ]) {
    const f = fixture(undefined, undefined, random)
    try {
      f.start()
      const drops = f.match.state.drops
      for (let elapsed = 0; elapsed <= 5300; elapsed += 25) {
        const points = drops.map((drop) => dropPoint(drop, f.match.state.startedAt + elapsed))
        for (let i = 0; i < 3; i++) {
          expect(points[i].x * 320).toBeGreaterThanOrEqual(44)
          expect(points[i].x * 320).toBeLessThanOrEqual(276)
          for (let j = i + 1; j < 3; j++)
            expect((points[j].x - points[i].x) * 320).toBeGreaterThan(88)
        }
      }
    } finally {
      f.match.cleanup()
    }
  }
})
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
    expect(f.match.state.bags[0].reservedSpend).toBe(1)
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
    expect(fail.match.state.bags[0]).toMatchObject({ spent: 0, reservedSpend: 0, assets: [] })
  } finally {
    fail.match.cleanup()
  }
})
test('ten confirmed catches enforce $10 cap independently per player', async () => {
  const f = fixture()
  try {
    f.start()
    for (let i = 0; i < 11; i++) {
      f.setNow(f.match.state.startedAt + i * DROP_INTERVAL_MS)
      f.match.tick()
      const drop = f.match.state.drops.at(-1)!
      f.setNow(drop.spawnedAt)
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

test('tie, empty acquisitions and infrastructure failures keep distinct terminal reasons', async () => {
  for (const [error, reason] of [
    [new ValuationError('tie'), 'tie'],
    [new ValuationError('empty_bags'), 'empty_bags'],
    [new Error('RPC unavailable'), 'valuation_unavailable'],
  ] as const) {
    const f = fixture(undefined, async () => {
      throw error
    })
    try {
      f.start()
      f.setNow(f.match.state.cutoffAt)
      f.match.tick()
      await f.drain()
      expect(f.match.state.status).toBe('cancelled')
      expect(f.match.state.reason).toBe(reason)
      expect(f.terminals).toEqual([reason])
      expect(f.match.state.result).toBeUndefined()
    } finally {
      f.match.cleanup()
    }
  }
})

test('three shared tosses per batch retain shuffled fairness and readable separated large mobile coins', () => {
  const f = fixture()
  try {
    f.start()
    const symbols = new Set<string>()
    const batches = new Map<number, Set<string>>()
    for (let elapsed = 0; elapsed < 60000; elapsed += 100) {
      const now = f.match.state.startedAt + elapsed
      f.setNow(now)
      f.match.tick()
      const drops = f.match.state.drops
      expect(new Set(drops.map((d) => d.id)).size).toBe(drops.length)
      for (const drop of drops) {
        symbols.add(drop.symbol)
        const batch = Math.round((drop.spawnedAt - f.match.state.startedAt) / DROP_INTERVAL_MS)
        const ids = batches.get(batch) ?? new Set<string>()
        ids.add(drop.id)
        batches.set(batch, ids)
      }
      for (const [width, height] of [
        [320, 300],
        [390, 580],
        [900, 780],
      ]) {
        const radius = discDiameter(width) / 2
        const points = drops
          .map((d) => dropPoint(d, now))
          .filter((p) => p.y * height - radius < height)
        expect(points.length).toBeLessThanOrEqual(DROP_BATCH_SIZE)
        for (let i = 0; i < points.length; i++) {
          expect(points[i].x * width).toBeGreaterThanOrEqual(radius)
          expect(points[i].x * width).toBeLessThanOrEqual(width - radius)
          for (let j = i + 1; j < points.length; j++)
            expect(
              Math.hypot((points[i].x - points[j].x) * width, (points[i].y - points[j].y) * height)
            ).toBeGreaterThan(discDiameter(width))
        }
      }
    }
    expect([...batches.values()].every((ids) => ids.size === 3)).toBe(true)
    expect(symbols.size).toBe(STOCK_ASSETS.length)
    expect(f.requests).toHaveLength(0)
    expect(f.match.state.bags.map((b) => b.spent)).toEqual([0, 0])
  } finally {
    f.match.cleanup()
  }
})

test('in-flight quotes reserve dollars before awaiting and never exceed either player budget', async () => {
  const finish: Array<() => void> = []
  const f = fixture(
    (symbol, id) =>
      new Promise((resolve) =>
        finish.push(() =>
          resolve({
            amount: '100',
            pool: STOCK_ASSETS.find((a) => a.symbol === symbol)!.pool,
            quoteId: id,
          })
        )
      )
  )
  try {
    f.start()
    for (let i = 0; i < 6; i++) {
      f.setNow(f.match.state.startedAt + i * DROP_INTERVAL_MS)
      f.match.tick()
      const batch = f.match.state.drops.slice(-3)
      f.setNow(Math.max(...batch.map((d) => d.spawnedAt)))
      for (const drop of batch) f.match.handle('a', 'catch_stock', { dropId: drop.id })
    }
    expect(f.requests).toHaveLength(10)
    expect(f.match.state.bags[0]).toMatchObject({ spent: 0, reservedSpend: 10, assets: [] })
    expect('pending' in f.match.state.bags[0]).toBe(false)
    f.match.handle('b', 'catch_stock', { dropId: f.match.state.drops.at(-1)!.id })
    expect(f.match.state.bags[1].reservedSpend).toBe(1)
    for (const resolve of finish) resolve()
    await f.drain()
    expect(f.match.state.bags[0].spent).toBe(10)
    expect(f.match.state.bags[0].reservedSpend).toBe(0)
    expect(f.match.state.bags[1].spent).toBe(1)
  } finally {
    f.match.cleanup()
  }
})

test('slower authoritative window accepts the extended flight and rejects its exact expiry', async () => {
  const f = fixture()
  try {
    f.start()
    const drop = f.match.state.drops[0]
    expect(drop.expiresAt - drop.spawnedAt).toBeCloseTo(4977.777777777778, 6)
    f.setNow(drop.spawnedAt + 4200)
    f.match.handle('a', 'catch_stock', { dropId: drop.id })
    await f.drain()
    expect(f.match.state.bags[0].spent).toBe(1)
    f.setNow(drop.expiresAt)
    f.match.handle('b', 'catch_stock', { dropId: drop.id })
    await f.drain()
    expect(f.match.state.bags[1].spent).toBe(0)
    expect(f.requests).toHaveLength(1)
  } finally {
    f.match.cleanup()
  }
})
