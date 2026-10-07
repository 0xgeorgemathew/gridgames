import {
  createPublicClient,
  http,
  parseAbi,
  keccak256,
  encodeAbiParameters,
  defineChain,
} from 'viem'
import { stockAsset, USDG, V4_STATE_VIEW } from '../shared/assets'
import type { ArcadeResult, Bag } from '../shared/types'
import { ValuationError } from './valuation-error'
const poolAbi = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
])
const stateAbi = parseAbi([
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)',
])
const Q192 = 1n << 192n
/** Read-only, fixed-block pool valuation. No signer, swap, order, approval or funds. */
export async function valueBags(
  bags: Bag[],
  cutoffAt: number,
  rpcUrl: string
): Promise<ArcadeResult> {
  console.info(JSON.stringify({ event: 'valuation_started', source: new URL(rpcUrl).hostname }))
  const deadline = Date.now() + 20000
  // One finite read budget. Honor Retry-After; never retry sooner than requested.
  // A long provider backoff fails conservatively instead of stranding the results UI.
  const boundedFetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ): Promise<Response> => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new Error('Valuation read timed out')
      const signal = AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        AbortSignal.timeout(Math.min(7000, remaining)),
      ])
      const response = await fetch(input, { ...init, signal })
      if (![429, 502, 503, 504].includes(response.status) || attempt === 3) return response
      const header = response.headers.get('Retry-After')
      const retryAfter = header
        ? /^\d+$/.test(header)
          ? Number(header) * 1000
          : Math.max(0, Date.parse(header) - Date.now())
        : 0
      const delay = Math.max(1000 * 2 ** attempt, Number.isFinite(retryAfter) ? retryAfter : 0)
      if (Date.now() + delay >= deadline) return response
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    throw new Error('Valuation read unavailable')
  }
  const client = createPublicClient({
    chain: defineChain({
      id: 4663,
      name: 'Robinhood Chain',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
      contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
    }),
    batch: { multicall: { wait: 20, batchSize: 8192 } },
    // Public RPC throttling may outlast viem's short default retry interval.
    // Retrying these reads keeps the selected blockNumber unchanged.
    transport: http(rpcUrl, {
      batch: { wait: 20 },
      timeout: 7000,
      retryCount: 0,
      fetchFn: boundedFetch,
    }),
  })
  let cutoff = await client.getBlock()
  // Select one block at or before the common cutoff for every asset and both players.
  for (let i = 0; Number(cutoff.timestamp) * 1000 > cutoffAt && i < 12; i++) {
    if (!cutoff.number || cutoff.number < 1n) throw new Error('Cutoff block unavailable')
    cutoff = await client.getBlock({ blockNumber: cutoff.number - 1n })
  }
  if (
    cutoff.number === null ||
    Number(cutoff.timestamp) * 1000 > cutoffAt ||
    cutoffAt - Number(cutoff.timestamp) * 1000 > 30000
  )
    throw new Error('No recent cutoff block')
  console.info(
    JSON.stringify({
      event: 'valuation_block_selected',
      source: new URL(rpcUrl).hostname,
      block: cutoff.number.toString(),
    })
  )
  const pools = new Map<string, `0x${string}`>()
  for (const bag of bags)
    for (const asset of bag.assets) {
      if (
        pools.has(asset.symbol) &&
        pools.get(asset.symbol)!.toLowerCase() !== asset.pool.toLowerCase()
      )
        throw new Error('Ambiguous designated pool')
      pools.set(asset.symbol, asset.pool)
    }
  const prices = new Map<string, { square: bigint; assetIsToken0: boolean }>()
  await Promise.all(
    [...pools].map(async ([symbol, address]) => {
      const asset = stockAsset(symbol)
      if (!asset) throw new Error('Unknown stock')
      if (address.toLowerCase() !== asset.pool.toLowerCase()) throw new Error('Undesignated pool')
      if (asset.protocol === 4) {
        const [currency0, currency1] = [asset.address, USDG].sort() as [
          `0x${string}`,
          `0x${string}`,
        ]
        const id = keccak256(
          encodeAbiParameters(
            [
              { type: 'address' },
              { type: 'address' },
              { type: 'uint24' },
              { type: 'int24' },
              { type: 'address' },
            ],
            [currency0, currency1, asset.fee, asset.tickSpacing!, asset.hooks!]
          )
        )
        if (id !== asset.pool) throw new Error('V4 pool key mismatch')
        const slot = await client.readContract({
          address: V4_STATE_VIEW,
          abi: stateAbi,
          functionName: 'getSlot0',
          args: [id],
          blockNumber: cutoff.number!,
        })
        if (slot[0] <= 0n || slot[3] !== asset.fee)
          throw new Error('V4 state unavailable or changed fee')
        prices.set(symbol, {
          square: slot[0] * slot[0],
          assetIsToken0: currency0 === asset.address,
        })
        return
      }
      const [token0, token1, slot] = await Promise.all([
        client.readContract({
          address,
          abi: poolAbi,
          functionName: 'token0',
          blockNumber: cutoff.number!,
        }),
        client.readContract({
          address,
          abi: poolAbi,
          functionName: 'token1',
          blockNumber: cutoff.number!,
        }),
        client.readContract({
          address,
          abi: poolAbi,
          functionName: 'slot0',
          blockNumber: cutoff.number!,
        }),
      ])
      const zero = token0.toLowerCase(),
        one = token1.toLowerCase()
      const assetIsToken0 = zero === asset.address.toLowerCase() && one === USDG.toLowerCase()
      if (!assetIsToken0 && !(one === asset.address.toLowerCase() && zero === USDG.toLowerCase()))
        throw new Error('Pool identity mismatch')
      if (slot[0] <= 0n) throw new Error('Pool price unavailable')
      prices.set(symbol, { square: slot[0] * slot[0], assetIsToken0 })
    })
  )
  const values: Record<string, string> = {}
  let winnerId = '',
    best = -1n,
    total = 0n,
    tied = false
  for (const bag of bags) {
    let value = 0n
    for (const asset of bag.assets) {
      const price = prices.get(asset.symbol)!
      value += price.assetIsToken0
        ? (BigInt(asset.amount) * price.square) / Q192
        : (BigInt(asset.amount) * Q192) / price.square
    }
    values[bag.playerId] = value.toString()
    total += value
    if (value > best) {
      winnerId = bag.playerId
      best = value
      tied = false
    } else if (value === best) tied = true
  }
  if (best <= 0n) throw new ValuationError('empty_bags')
  if (tied) throw new ValuationError('tie')
  return {
    block: cutoff.number.toString(),
    values,
    winnerId,
    simulatedPayoutUSDG: total.toString(),
    settlement: 'simulated',
    winnerFixed: true,
  }
}
