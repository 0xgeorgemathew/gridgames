import { expect, spyOn, test } from 'bun:test'
import { RealtimeServer } from './server'
import { setupGameEvents } from '@/app/api/socket/multiplayer'
import { RoomManager } from '@/app/api/socket/multiplayer/room-registry.server'
import type { GameRoom } from '@/app/api/socket/multiplayer/room.manager'
async function fixture(gameSlug: string) {
  let room!: GameRoom
  const create = RoomManager.prototype.createRoom
  const spy = spyOn(RoomManager.prototype, 'createRoom').mockImplementation(function (...args) {
    return (room = create.apply(this, args))
  })
  const frames: Array<{ event: string; args: any[] }> = []
  const server = new RealtimeServer()
  const runtime = setupGameEvents(server, async () => ({ readyState: 1, close() {} }) as WebSocket)
  server.connect('a', (frame) => frames.push(JSON.parse(frame)))
  server.connect('b', () => {})
  await runtime.startMatch({
    roomId: 'test',
    gameSlug,
    gameDuration: 60000,
    players: ['a', 'b'].map((id) => ({ id, name: id, sceneWidth: 500, sceneHeight: 800 })) as any,
  })
  spy.mockRestore()
  for (const p of ['a', 'b'])
    await server.receive(p, JSON.stringify({ event: 'scene_ready', args: [] }))
  return {
    room,
    frames,
    action: (p: string, event: string, data: unknown) =>
      server.receive(p, JSON.stringify({ event, args: [data] })),
    coin: (id: string) => {
      room.addCoin({ id, type: 'long', x: 0, y: 0 })
      room.addActiveCoin(id, 'long')
    },
    cleanup: () => {
      runtime.emergencyShutdown()
      runtime.cleanup()
    },
  }
}
test('Hyper rejects unknown, mismatch and replay; failed capacity preserves disc', async () => {
  const f = await fixture('hyper-swiper')
  try {
    const claim = (coinId: string, coinType = 'long') => ({ coinId, coinType, priceAtSlice: 1 })
    await f.action('a', 'slice_coin', claim('unknown'))
    expect(f.room.openPositions.size).toBe(0)
    f.coin('shared')
    await f.action('a', 'slice_coin', claim('shared', 'short'))
    expect(f.room.coins.has('shared')).toBe(true)
    expect(f.room.openPositions.size).toBe(0)
    await Promise.all([
      f.action('a', 'slice_coin', claim('shared')),
      f.action('b', 'slice_coin', claim('shared')),
    ])
    expect(f.room.openPositions.size).toBe(1)
    expect(f.room.coins.has('shared')).toBe(false)
    expect([...f.room.players.values()].map((p) => p.dollars)).toEqual([10, 10])
    f.coin('capacity')
    f.room.players.get('a')!.dollars = 0
    await f.action('a', 'slice_coin', claim('capacity'))
    expect(f.room.coins.has('capacity')).toBe(true)
    expect(f.room.openPositions.size).toBe(1)
  } finally {
    f.cleanup()
  }
})
test('Hyper server TTL rejects expired claim; live client expiry cannot consume and cadence clears both maps', async () => {
  const f = await fixture('hyper-swiper'),
    now = Date.now
  try {
    f.coin('live')
    f.coin('live-2')
    f.coin('live-3')
    await f.action('a', 'coin_expired', { coinId: 'live' })
    expect(f.room.coins.has('live')).toBe(true)
    expect(f.room.getActiveCoinCount()).toBe(3)
    Date.now = () => now() - 6000
    f.coin('old')
    Date.now = now
    await f.action('a', 'slice_coin', { coinId: 'old', coinType: 'long' })
    expect(f.room.openPositions.size).toBe(0)
    expect(f.room.coins.has('old')).toBe(true)
    expect(f.room.getActiveCoinCount()).toBe(4)
    await Bun.sleep(550)
    expect(f.room.coins.has('old')).toBe(false)
    expect(f.frames.some((x) => x.event === 'coin_expired' && x.args[0].coinId === 'old')).toBe(
      true
    )
  } finally {
    Date.now = now
    f.cleanup()
  }
})
test('Tap successful opens alone consume isolated recovery; invalid/capacity rejection leaves retry and settlement unchanged', async () => {
  const f = await fixture('tap-dancer'),
    now = Date.now
  let clock = now()
  Date.now = () => clock
  try {
    await f.action('a', 'open_position', { direction: 'invalid' })
    expect(f.room.openPositions.size).toBe(0)
    await f.action('a', 'open_position', { direction: 'long' })
    await f.action('a', 'open_position', { direction: 'short' })
    expect(f.room.openPositions.size).toBe(1)
    expect(f.frames.find((x) => x.event === 'position_opened')!.args[0].recoveryMs).toBe(600)
    expect(
      f.frames.some((x) => x.event === 'error' && x.args[0].details?.reason === 'tap_recovery')
    ).toBe(true)
    await f.action('b', 'open_position', { direction: 'short' })
    expect(f.room.openPositions.size).toBe(2)
    clock += 600
    f.room.players.get('a')!.dollars = 0
    await f.action('a', 'open_position', { direction: 'long' })
    expect(f.room.openPositions.size).toBe(2)
    f.room.players.get('a')!.dollars = 10
    await f.action('a', 'open_position', { direction: 'long' })
    expect(f.room.openPositions.size).toBe(3)
    await f.action('a', 'end_game', {})
    expect(f.room.closedPositions.every((p) => p.realizedPnl === 0)).toBe(true)
    expect([...f.room.players.values()].map((p) => p.dollars)).toEqual([10, 10])
  } finally {
    Date.now = now
    f.cleanup()
  }
})

test.each(['hyper-swiper', 'tap-dancer'])(
  '%s terminal actions cannot change positions, balance or coins',
  async (game) => {
    const f = await fixture(game)
    try {
      f.coin('opening')
      await f.action(
        'a',
        game === 'hyper-swiper' ? 'slice_coin' : 'open_position',
        game === 'hyper-swiper' ? { coinId: 'opening', coinType: 'long' } : { direction: 'long' }
      )
      expect(f.room.openPositions.size).toBe(1)
      f.coin('late')
      await f.action('a', 'end_game', {})
      const balances = [...f.room.players.values()].map((p) => p.dollars)
      const closed = f.room.closedPositions.length
      const coins = [...f.room.coins.keys()]
      await f.action('a', 'slice_coin', { coinId: 'late', coinType: 'long' })
      await f.action('b', 'open_position', { direction: 'short' })
      await f.action('a', 'end_game', {})
      expect(f.room.openPositions.size).toBe(0)
      expect(f.room.closedPositions.length).toBe(closed)
      expect([...f.room.players.values()].map((p) => p.dollars)).toEqual(balances)
      expect([...f.room.coins.keys()]).toEqual(coins)
    } finally {
      f.cleanup()
    }
  }
)
