import { DurableObject } from 'cloudflare:workers'
import { encodeAbiParameters, keccak256 } from 'viem'
import { stockAsset, USDG, ROBINHOOD_CHAIN_ID } from '@/domains/stock-arcade/shared/assets'
import type { QuoteCredit } from '@/domains/stock-arcade/shared/types'
export class QuoteGate extends DurableObject<Cloudflare.Env> {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, started INTEGER NOT NULL, result TEXT)'
    )
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS backoff (id INTEGER PRIMARY KEY, until_ms INTEGER NOT NULL)'
    )
  }
  async quote(symbol: string, requestId: string, swapper?: string): Promise<QuoteCredit> {
    const asset = stockAsset(symbol)
    if (!asset || !this.env.UNISWAP_API_KEY)
      throw new Error('Live quotes are not configured; no simulated spend')
    if (!swapper || !/^0x[0-9a-fA-F]{40}$/.test(swapper))
      throw new Error('Connect a wallet for quotes')
    if (requestId.length > 200) throw new Error('Invalid quote request')
    const now = Date.now()
    this.ctx.storage.sql.exec('DELETE FROM attempts WHERE started < ?', now - 120000)
    const previous = this.ctx.storage.sql
      .exec<{ result: string | null }>('SELECT result FROM attempts WHERE id=?', requestId)
      .toArray()[0]
    if (previous) {
      if (previous.result) return JSON.parse(previous.result) as QuoteCredit
      throw new Error('Quote request already attempted')
    }
    const backoff = this.ctx.storage.sql
      .exec<{ until_ms: number }>('SELECT until_ms FROM backoff WHERE id=1')
      .toArray()[0]
    const count = this.ctx.storage.sql
      .exec<{
        count: number
      }>('SELECT COUNT(*) AS count FROM attempts WHERE started > ?', now - 1000)
      .toArray()[0].count
    // All matches share this one gate for this API key. Six admissions per sliding second.
    if (count >= 6 || (backoff && now < backoff.until_ms))
      throw new Error('Quote service busy; no spend')
    this.ctx.storage.sql.exec('INSERT INTO attempts VALUES (?,?,NULL)', requestId, now)
    const response = await fetch('https://trade-api.gateway.uniswap.org/v1/quote', {
      method: 'POST',
      signal: AbortSignal.timeout(4500),
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.env.UNISWAP_API_KEY },
      body: JSON.stringify({
        type: 'EXACT_INPUT',
        amount: '1000000',
        tokenInChainId: ROBINHOOD_CHAIN_ID,
        tokenOutChainId: ROBINHOOD_CHAIN_ID,
        tokenIn: USDG,
        tokenOut: asset.address,
        swapper,
        protocols: [asset.protocol === 4 ? 'V4' : 'V3'],
        ...(asset.protocol === 4 ? { hooksOptions: 'V4_NO_HOOKS' } : {}),
        autoSlippage: 'DEFAULT',
      }),
    })
    if (response.status === 429 || response.status >= 500) {
      const retry = Number(response.headers.get('retry-after'))
      this.ctx.storage.sql.exec(
        'INSERT OR REPLACE INTO backoff VALUES (1,?)',
        Date.now() + Math.min(30000, Math.max(2000, Number.isFinite(retry) ? retry * 1000 : 2000))
      )
    }
    if (!response.ok) throw new Error(`Quote unavailable (${response.status}); no spend`)
    const result = validatedQuote(await response.json(), asset)
    this.ctx.storage.sql.exec(
      'UPDATE attempts SET result=? WHERE id=?',
      JSON.stringify(result),
      requestId
    )
    return result
  }
}

interface RouteToken {
  address: string
  chainId: number
}
interface QuotePool {
  type: string
  address: string
  poolId?: string
  tokenIn: RouteToken
  tokenOut: RouteToken
  fee: string | number
  tickSpacing?: string | number
  hooks?: string
}
export function validatedQuote(
  raw: unknown,
  asset: NonNullable<ReturnType<typeof stockAsset>>
): QuoteCredit {
  const body = raw as {
    routing?: string
    quote?: {
      quoteId?: string
      chainId?: number
      txFailureReason?: string
      txFailureReasons?: string[]
      input?: { amount?: string; token?: string }
      output?: { amount?: string; token?: string }
      slippage?: number
      route?: QuotePool[][]
    }
  }
  const quote = body?.quote
  const routes = quote?.route
  const address = (value: unknown): value is `0x${string}` =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)
  const amount = quote?.output?.amount
  const validPool = (pool: QuotePool) => {
    if (
      !pool ||
      !address(pool.tokenIn?.address) ||
      !address(pool.tokenOut?.address) ||
      pool.tokenIn.chainId !== ROBINHOOD_CHAIN_ID ||
      pool.tokenOut.chainId !== ROBINHOOD_CHAIN_ID ||
      !Number.isInteger(Number(pool.fee)) ||
      Number(pool.fee) < 0 ||
      Number(pool.fee) >= 1000000
    )
      return false
    if (asset.protocol === 3) return pool.type === 'v3-pool' && address(pool.address)
    const tick = Number(pool.tickSpacing)
    if (
      pool.type !== 'v4-pool' ||
      !Number.isInteger(tick) ||
      tick <= 0 ||
      tick > 32767 ||
      pool.hooks?.toLowerCase() !== '0x0000000000000000000000000000000000000000'
    )
      return false
    const [zero, one] = [
      pool.tokenIn.address.toLowerCase(),
      pool.tokenOut.address.toLowerCase(),
    ].sort() as [`0x${string}`, `0x${string}`]
    const key = keccak256(
      encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'address' },
          { type: 'uint24' },
          { type: 'int24' },
          { type: 'address' },
        ],
        [zero, one, Number(pool.fee), tick, pool.hooks as `0x${string}`]
      )
    )
    return key === (pool.poolId ?? pool.address)?.toLowerCase()
  }
  if (
    body?.routing !== 'CLASSIC' ||
    quote?.txFailureReason ||
    quote?.txFailureReasons?.length ||
    typeof quote?.quoteId !== 'string' ||
    !quote.quoteId ||
    quote.quoteId.length > 200 ||
    (quote.chainId !== undefined && quote.chainId !== ROBINHOOD_CHAIN_ID) ||
    quote.input?.amount !== '1000000' ||
    quote.input.token?.toLowerCase() !== USDG.toLowerCase() ||
    quote.output?.token?.toLowerCase() !== asset.address.toLowerCase() ||
    typeof amount !== 'string' ||
    !/^[0-9]{1,78}$/.test(amount) ||
    BigInt(amount) <= 0n ||
    BigInt(amount) >= 1n << 256n ||
    !Number.isFinite(quote.slippage) ||
    quote.slippage! < 0 ||
    quote.slippage! > 5 ||
    !Array.isArray(routes) ||
    routes.length < 1 ||
    routes.length > 8 ||
    !routes.every(
      (route) =>
        Array.isArray(route) &&
        route.length >= 1 &&
        route.length <= 4 &&
        route[0]?.tokenIn?.address?.toLowerCase() === USDG.toLowerCase() &&
        route.at(-1)?.tokenOut?.address?.toLowerCase() === asset.address.toLowerCase() &&
        route.every(
          (pool, index) =>
            validPool(pool) &&
            (index === 0 ||
              route[index - 1].tokenOut.address.toLowerCase() ===
                pool.tokenIn.address.toLowerCase())
        )
    )
  ) {
    console.log(
      JSON.stringify({
        event: 'quote_route_rejected',
        symbol: asset.symbol,
        routing: body?.routing,
        routeCount: routes?.length,
      })
    )
    throw new Error('Quote is not a verified canonical stock route')
  }
  // Execution routing and scoring are distinct. Always retain the designated cutoff pool.
  // Transaction, permit and approval payloads never leave this estimates-only path.
  return {
    amount: amount!,
    pool: asset.pool,
    quoteId: quote.quoteId!,
    quotedPools: routes!.flat().map((pool) => pool.poolId ?? pool.address),
  }
}
