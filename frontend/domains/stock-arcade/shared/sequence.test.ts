import { expect, test } from 'bun:test'
import { shuffledStocks } from './sequence'
import { STOCK_ASSETS } from './assets'
import { tronRibbon } from '@/platform/game-engine/visuals/tron-ribbon'
test('server shuffle preserves all twenty canonical stocks exactly once without mutating catalog', () => {
  const original = STOCK_ASSETS.map((a) => a.symbol)
  const deck = shuffledStocks(STOCK_ASSETS, () => 0)
  expect(deck.map((a) => a.symbol)).not.toEqual(original)
  expect(deck.map((a) => a.symbol).sort()).toEqual([...original].sort())
  expect(new Set(deck.map((a) => a.address)).size).toBe(20)
  expect(STOCK_ASSETS.map((a) => a.symbol)).toEqual(original)
  expect(deck).not.toBe(STOCK_ASSETS)
})
test('shared legacy ribbon keeps finite tapered glass polygons and white edge cores on mobile', () => {
  for (const mobile of [false, true]) {
    const ribbon = tronRibbon(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 200, y: 50 },
      ],
      mobile,
      0
    )!
    expect(ribbon.layers).toHaveLength(6)
    expect(ribbon.layers.filter((l) => l.color === 0xffffff)).toHaveLength(2)
    for (const layer of ribbon.layers)
      for (const point of layer.points)
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
    expect(ribbon.head).toEqual({ x: 200, y: 50 })
  }
  expect(tronRibbon([], true, 0)).toBeNull()
})
