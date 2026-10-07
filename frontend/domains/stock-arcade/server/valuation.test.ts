import { expect, test } from 'bun:test'
import { encodeAbiParameters, decodeFunctionData, encodeFunctionResult, multicall3Abi } from 'viem'
import { USDG, stockAsset } from '../shared/assets'
import { valueBags } from './valuation'

test('both bags use one block at or before cutoff, batched pool reads, fixed-block 429 retry and acquired assets only', async () => {
  const original = globalThis.fetch
  const nvda = stockAsset('NVDA')!
  const calls: Array<{ method: string; params: unknown[] }> = []
  let batches = 0
  let throttled = false
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    if (Array.isArray(body)) batches++
    const requests = Array.isArray(body) ? body : [body]
    if (!throttled && requests.some((request) => request.method === 'eth_call')) {
      throttled = true
      calls.push(...requests)
      return new Response('Too many requests', { status: 429 })
    }
    const respond = (request: { id: number; method: string; params: unknown[] }) => {
      calls.push(request)
      let result: unknown
      if (request.method === 'eth_getBlockByNumber') {
        const latest = request.params[0] === 'latest'
        result = {
          number: latest ? '0xa' : '0x9',
          timestamp: latest ? '0x65' : '0x64',
          transactions: [],
        }
      } else {
        const call = request.params[0] as { data: `0x${string}`; to: string }
        expect(call.to.toLowerCase()).toBe('0xca11bde05977b3631167028862be2a173976ca11')
        expect(request.params[1]).toBe('0x9')
        const decoded = decodeFunctionData({ abi: multicall3Abi, data: call.data })
        expect(decoded.functionName).toBe('aggregate3')
        const aggregate = decoded.args![0] as readonly { target: string; callData: string }[]
        expect(aggregate).toHaveLength(3)
        const results = aggregate.map((subcall) => {
          expect(subcall.target.toLowerCase()).toBe(nvda.pool)
          const returnData =
            subcall.callData === '0x0dfe1681'
              ? encodeAbiParameters([{ type: 'address' }], [USDG])
              : subcall.callData === '0xd21220a7'
                ? encodeAbiParameters([{ type: 'address' }], [nvda.address])
                : encodeAbiParameters(
                    [
                      { type: 'uint160' },
                      { type: 'int24' },
                      { type: 'uint16' },
                      { type: 'uint16' },
                      { type: 'uint16' },
                      { type: 'uint8' },
                      { type: 'bool' },
                    ],
                    [1n << 96n, 0, 0, 1, 1, 0, true]
                  )
          return { success: true, returnData }
        })
        result = encodeFunctionResult({
          abi: multicall3Abi,
          functionName: 'aggregate3',
          result: results,
        })
      }
      return { jsonrpc: '2.0', id: request.id, result }
    }
    return Response.json(Array.isArray(body) ? body.map(respond) : respond(body))
  }) as typeof fetch
  try {
    const result = await valueBags(
      [
        {
          playerId: 'a',
          name: 'A',
          spent: 1,
          pending: 0,
          assets: [
            {
              dropId: 'd',
              symbol: 'NVDA',
              amount: '2000000',
              pool: nvda.pool,
              quoteId: 'fixture',
              receivedAt: 99000,
            },
          ],
        },
        { playerId: 'b', name: 'B', spent: 0, pending: 0, assets: [] },
      ],
      100500,
      'https://fixture.invalid'
    )
    expect(result.block).toBe('9')
    expect(result.values).toEqual({ a: '2000000', b: '0' })
    expect(result.winnerId).toBe('a')
    expect(result.simulatedPayoutUSDG).toBe('2000000')
    expect(result.winnerFixed).toBe(true)
    expect(calls.filter((c) => c.method === 'eth_call')).toHaveLength(2)
    expect(
      calls.filter((c) => c.method === 'eth_call').every((call) => call.params[1] === '0x9')
    ).toBe(true)
    expect(batches).toBeGreaterThan(0)
  } finally {
    globalThis.fetch = original
  }
})

test('a provider backoff beyond the valuation budget cancels without premature retry', async () => {
  const original = globalThis.fetch
  let poolAttempts = 0
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    const requests = Array.isArray(body) ? body : [body]
    if (requests.some((request) => request.method === 'eth_call')) {
      poolAttempts++
      return new Response('Throttled', { status: 429, headers: { 'Retry-After': '60' } })
    }
    return Response.json(
      requests.map((request) => ({
        jsonrpc: '2.0',
        id: request.id,
        result: { number: '0x9', timestamp: '0x64', transactions: [] },
      }))
    )
  }) as typeof fetch
  try {
    const asset = stockAsset('NVDA')!
    await expect(
      valueBags(
        [
          {
            playerId: 'a',
            name: 'A',
            spent: 1,
            pending: 0,
            assets: [
              {
                dropId: 'd',
                symbol: 'NVDA',
                amount: '2000000',
                pool: asset.pool,
                quoteId: 'fixture',
                receivedAt: 99000,
              },
            ],
          },
          { playerId: 'b', name: 'B', spent: 0, pending: 0, assets: [] },
        ],
        100500,
        'https://fixture.invalid'
      )
    ).rejects.toThrow('429')
    expect(poolAttempts).toBe(1)
  } finally {
    globalThis.fetch = original
  }
}, 2500)
