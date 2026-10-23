import { STOCK_ASSETS } from '../shared/assets'
import { PRICE_CHANGE_WINDOW_MS } from '../shared/types'
import { readPoolPrices, robinhoodClient, type PoolPrice } from './valuation'

const SAMPLE_BLOCKS = 600n
const SCALE = 1_000_000n

/** Percent move from `before` to `now` in USDG per stock, rounded to 0.01%. */
export function percentChange(before: PoolPrice, now: PoolPrice): number {
  if (before.assetIsToken0 !== now.assetIsToken0 || before.square <= 0n || now.square <= 0n)
    throw new Error('Incomparable pool prices')
  // Token0 stocks are priced by sqrtPrice²; token1 stocks by its inverse.
  const ratio = now.assetIsToken0
    ? (now.square * SCALE) / before.square
    : (before.square * SCALE) / now.square
  return Math.round(Number(ratio - SCALE) / 100) / 100
}

/** Read-only spot comparison of every designated pool against ~60 seconds earlier.
 * Assets whose pools can't be read are omitted rather than failing the whole set. */
export async function readPriceChanges(rpcUrl: string): Promise<Record<string, number>> {
  const client = robinhoodClient(rpcUrl, Date.now() + 8000)
  const latest = await client.getBlock()
  if (latest.number === null || latest.number <= SAMPLE_BLOCKS) throw new Error('No recent block')
  // Estimate the block rate from a recent sample, then jump once to ~60s earlier.
  const sample = await client.getBlock({ blockNumber: latest.number - SAMPLE_BLOCKS })
  const seconds = Number(latest.timestamp - sample.timestamp)
  if (seconds <= 0) throw new Error('Block rate unavailable')
  const back = BigInt(Math.round((Number(SAMPLE_BLOCKS) * PRICE_CHANGE_WINDOW_MS) / 1000 / seconds))
  if (back <= 0n || back >= latest.number) throw new Error('Block rate unavailable')
  const before = latest.number - back
  const changes: Record<string, number> = {}
  await Promise.all(
    STOCK_ASSETS.map(async (asset) => {
      const pools = new Map([[asset.symbol, asset.pool]])
      try {
        const [then, now] = await Promise.all([
          readPoolPrices(client, pools, before),
          readPoolPrices(client, pools, latest.number!),
        ])
        changes[asset.symbol] = percentChange(then.get(asset.symbol)!, now.get(asset.symbol)!)
      } catch {
        // One unreadable pool hides only that disc's ring.
      }
    })
  )
  return changes
}
