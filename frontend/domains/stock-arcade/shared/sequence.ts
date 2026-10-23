import type { StockAsset } from './types'
/** Server-owned Fisher–Yates deck: each stock once per cycle, identical for both players. */
export function shuffledStocks(
  assets: readonly StockAsset[],
  random = () => {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] / 0x100000000
  }
): StockAsset[] {
  const deck = [...assets]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}
