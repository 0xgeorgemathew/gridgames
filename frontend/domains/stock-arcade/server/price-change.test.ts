import { expect, test } from 'bun:test'
import { percentChange } from './price-change'
import { StockMatch } from './match'
import { PRICE_CHANGE_REFRESH_MS, type ArcadeState } from '../shared/types'
import { priceRingFraction, formatPriceChange } from '../client/StockEffects'
import type { RoomProvision } from '@/worker/session'

const Q96 = 1n << 96n
const at = (price: number, assetIsToken0: boolean) => {
  // sqrtPriceX96² / 2^192 is token1 per token0.
  const sqrt = BigInt(Math.round(Math.sqrt(assetIsToken0 ? price : 1 / price) * 1e9)) * Q96
  return { square: sqrt * sqrt, assetIsToken0 }
}

test('price change is USDG per stock for either token order', () => {
  expect(percentChange(at(100, true), at(101, true))).toBeCloseTo(1, 2)
  expect(percentChange(at(100, false), at(101, false))).toBeCloseTo(1, 2)
  expect(percentChange(at(200, false), at(199, false))).toBeCloseTo(-0.5, 2)
  expect(percentChange(at(50, true), at(50, true))).toBe(0)
  expect(() => percentChange(at(1, true), at(1, false))).toThrow()
})

test('ring scales thin moves visibly and caps at 2%', () => {
  expect(priceRingFraction(0)).toBe(0)
  expect(priceRingFraction(0.02)).toBeCloseTo(0.1, 5)
  expect(priceRingFraction(-0.5)).toBeCloseTo(0.5, 5)
  expect(priceRingFraction(7)).toBe(1)
  expect(formatPriceChange(0.4)).toBe('+0.40%')
  expect(formatPriceChange(-1.25)).toBe('-1.25%')
  expect(formatPriceChange(0)).toBe('0.00%')
})

test('match refreshes display-only price changes on a bounded cadence', async () => {
  let now = 1000000
  const tasks: Promise<unknown>[] = []
  const states: ArcadeState[] = []
  let reads = 0
  let changes: Record<string, number> = { NVDA: 0.42 }
  const config = {
    roomId: 'prices',
    gameSlug: 'stock-arcade',
    gameDuration: 60000,
    players: ['a', 'b'].map((id) => ({ id, name: id, ticket: '', returnToken: '' })),
  } as unknown as RoomProvision
  const match = new StockMatch(config, {
    now: () => now,
    quote: async () => {
      throw new Error('unused')
    },
    value: async () => {
      throw new Error('unused')
    },
    priceChanges: async () => {
      reads++
      return changes
    },
    emit: (event, payload) => {
      if (event === 'arcade_state') states.push(payload as ArcadeState)
    },
    waitUntil: (p) => tasks.push(p),
    terminal: () => {},
  })
  match.initialize()
  await Promise.all(tasks.splice(0))
  expect(reads).toBe(1)
  expect(states.at(-1)?.priceChanges).toEqual({ NVDA: 0.42 })

  match.handle('a', 'scene_ready', null)
  match.handle('b', 'scene_ready', null)
  now = match.state.startedAt
  match.tick()
  await Promise.all(tasks.splice(0))
  expect(reads).toBe(1)

  changes = { META: -0.1 }
  now += PRICE_CHANGE_REFRESH_MS
  match.tick()
  await Promise.all(tasks.splice(0))
  expect(reads).toBe(2)
  // A partial read keeps earlier symbols rather than blanking their rings.
  expect(states.at(-1)?.priceChanges).toEqual({ NVDA: 0.42, META: -0.1 })
  match.cleanup()
})
