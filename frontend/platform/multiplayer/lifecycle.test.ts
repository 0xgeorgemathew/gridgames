import { expect, test } from 'bun:test'
import { RealtimeServer } from './server'
import { setupGameEvents } from '@/app/api/socket/multiplayer'

test('aborted match ignores late end and position actions', async () => {
  const frames: Array<{ event: string; args: unknown[] }> = []
  const server = new RealtimeServer()
  const runtime = setupGameEvents(server, async () => {
    throw new Error('Offline test market')
  })
  server.connect('a', () => {})
  server.connect('b', (frame) => frames.push(JSON.parse(frame)))
  try {
    const match = JSON.stringify({
      event: 'find_match',
      args: [{ playerName: 'Lifecycle', gameSlug: 'tap-dancer', gameDuration: 60000 }],
    })
    await server.receive('a', match)
    await server.receive('b', match)
    expect(frames.some((frame) => frame.event === 'match_found')).toBe(true)
    await server.disconnect('a')
    expect(frames.filter((frame) => frame.event === 'match_aborted').length).toBe(1)
    frames.length = 0
    await server.receive('b', '{"event":"end_game","args":[]}')
    await server.receive('b', '{"event":"open_position","args":[{"direction":"long"}]}')
    await server.receive('b', '{"event":"scene_ready","args":[]}')
    expect(
      frames.filter((frame) =>
        ['game_settlement', 'game_over', 'game_start', 'position_opened', 'match_updated'].includes(
          frame.event
        )
      )
    ).toEqual([])
    await server.disconnect('b')
    expect(frames.filter((frame) => frame.event === 'match_aborted')).toEqual([])
  } finally {
    runtime.emergencyShutdown()
    runtime.cleanup()
  }
})

test('idle runtime creates no timers and abort clears game timers and outbound feed', async () => {
  const realTimeout = globalThis.setTimeout,
    realInterval = globalThis.setInterval
  const realClearTimeout = globalThis.clearTimeout,
    realClearInterval = globalThis.clearInterval
  const timers = new Set<number | ReturnType<typeof setTimeout>>()
  let feedClosed = 0
  globalThis.setTimeout = ((fn: TimerHandler, delay?: number, ...args: any[]) => {
    const timer = realTimeout(fn, delay, ...args)
    timers.add(timer)
    return timer
  }) as typeof setTimeout
  globalThis.setInterval = ((fn: TimerHandler, delay?: number, ...args: any[]) => {
    const timer = realInterval(fn, delay, ...args)
    timers.add(timer)
    return timer
  }) as typeof setInterval
  globalThis.clearTimeout = ((timer: ReturnType<typeof setTimeout>) => {
    timers.delete(timer)
    realClearTimeout(timer)
  }) as typeof clearTimeout
  globalThis.clearInterval = ((timer: ReturnType<typeof setInterval>) => {
    timers.delete(timer)
    realClearInterval(timer)
  }) as typeof clearInterval
  const server = new RealtimeServer()
  const runtime = setupGameEvents(
    server,
    async () => ({ readyState: 1, close: () => feedClosed++ }) as unknown as WebSocket
  )
  try {
    expect(timers.size).toBe(0)
    server.connect('a', () => {})
    server.connect('b', () => {})
    await runtime.startMatch({
      roomId: 'only-room',
      gameSlug: 'hyper-swiper',
      gameDuration: 60000,
      players: ['a', 'b'].map((id) => ({
        id,
        name: id,
        sceneWidth: 500,
        sceneHeight: 800,
        ticket: '',
        returnToken: '',
      })) as any,
    })
    await server.receive('a', '{"event":"scene_ready","args":[]}')
    await server.receive('b', '{"event":"scene_ready","args":[]}')
    expect(timers.size).toBeGreaterThan(0)
    await server.disconnect('a')
    expect(timers.size).toBe(0)
    expect(feedClosed).toBe(1)
  } finally {
    runtime.cleanup()
    globalThis.setTimeout = realTimeout
    globalThis.setInterval = realInterval
    globalThis.clearTimeout = realClearTimeout
    globalThis.clearInterval = realClearInterval
  }
})
