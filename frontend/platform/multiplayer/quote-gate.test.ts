import { expect, mock, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { STOCK_ASSETS, USDG } from '@/domains/stock-arcade/shared/assets'
mock.module('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(
      protected ctx: DurableObjectState,
      protected env: Cloudflare.Env
    ) {}
  },
}))
const { QuoteGate, validatedQuote } = await import('@/worker/quote-gate')
function response(symbol = 'NVDA') {
  const a = STOCK_ASSETS.find((s) => s.symbol === symbol)!
  return {
    routing: 'CLASSIC',
    quote: {
      quoteId: 'test-quote',
      chainId: 4663,
      slippage: 0.5,
      input: { amount: '1000000', token: USDG },
      output: { amount: '1000000000000000', token: a.address },
      route: [
        [
          {
            type: a.protocol === 3 ? 'v3-pool' : 'v4-pool',
            address: a.pool,
            poolId: a.pool,
            tokenIn: { address: USDG as string, chainId: 4663 },
            tokenOut: { address: a.address, chainId: 4663 },
            fee: a.fee,
            tickSpacing: a.tickSpacing,
            hooks: a.hooks,
          },
        ],
      ],
    },
  }
}
test('canonical routes credit independently of designated scoring pools; chain and V4 keys validated', () => {
  for (const a of STOCK_ASSETS) expect(validatedQuote(response(a.symbol), a).pool).toBe(a.pool)
  const invalid = response()
  invalid.quote.route[0][0].address = '0x0000000000000000000000000000000000000001'
  expect(validatedQuote(invalid, STOCK_ASSETS[1]).pool).toBe(STOCK_ASSETS[1].pool)
  invalid.quote.route[0][0].tokenOut.chainId = 1
  expect(() => validatedQuote(invalid, STOCK_ASSETS[1])).toThrow()
  const v4 = response('META')
  v4.quote.route[0][0].tickSpacing = 1
  expect(() => validatedQuote(v4, STOCK_ASSETS[0])).toThrow()
  const mismatch = response()
  mismatch.quote.output.token = USDG
  expect(() => validatedQuote(mismatch, STOCK_ASSETS[1])).toThrow()
})
test('one gate enforces shared six-per-second admissions, dedups quote IDs and backs off 429', async () => {
  const db = new Database(':memory:')
  const state = {
    storage: {
      sql: {
        exec: (sql: string, ...args: Array<string | number | null>) => {
          const rows = db.query(sql).all(...args)
          return { toArray: () => rows }
        },
      },
    },
  }
  const prior = globalThis.fetch
  let calls = 0
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toBe('https://trade-api.gateway.uniswap.org/v1/quote')
    const body = JSON.parse(String(init?.body))
    expect(body.protocols).toEqual(['V3'])
    expect(body.routingPreference).toBeUndefined()
    expect(body.amount).toBe('1000000')
    calls++
    return Response.json(response())
  }) as typeof fetch
  try {
    const gate = new QuoteGate(
      state as unknown as DurableObjectState,
      { UNISWAP_API_KEY: 'FIXTURE_ONLY_NOT_A_REAL_KEY' } as Cloudflare.Env
    )
    const swapper = '0x0000000000000000000000000000000000000001'
    await gate.quote('NVDA', 'a', swapper)
    await gate.quote('NVDA', 'a', swapper)
    expect(calls).toBe(1)
    for (let i = 0; i < 5; i++) await gate.quote('NVDA', `room-${i}`, swapper)
    await expect(gate.quote('NVDA', 'seventh', swapper)).rejects.toThrow('busy')
    expect(calls).toBe(6)
    db.query('DELETE FROM attempts').run()
    globalThis.fetch = Object.assign(
      async () => new Response('', { status: 429, headers: { 'retry-after': '3' } }),
      { preconnect: prior.preconnect }
    )
    await expect(gate.quote('NVDA', 'limited', swapper)).rejects.toThrow('429')
    await expect(gate.quote('NVDA', 'backoff', swapper)).rejects.toThrow('busy')
  } finally {
    globalThis.fetch = prior
    db.close()
  }
})

test('multi-hop quote continuity, allowed protocol, slippage and raw amounts are checked', () => {
  const fixture = response()
  const first = fixture.quote.route[0][0]
  const middle = '0x0000000000000000000000000000000000000002'
  fixture.quote.route[0] = [
    { ...first, tokenOut: { address: middle, chainId: 4663 } },
    { ...first, tokenIn: { address: middle, chainId: 4663 } },
  ]
  expect(validatedQuote(fixture, STOCK_ASSETS[1]).quotedPools).toHaveLength(2)
  fixture.quote.route[0][1].tokenIn.address = USDG
  expect(() => validatedQuote(fixture, STOCK_ASSETS[1])).toThrow()
  const slip = response()
  slip.quote.slippage = Infinity
  expect(() => validatedQuote(slip, STOCK_ASSETS[1])).toThrow()
  const wrongProtocol = response()
  wrongProtocol.quote.route[0][0].type = 'v2-pool'
  expect(() => validatedQuote(wrongProtocol, STOCK_ASSETS[1])).toThrow()
})
