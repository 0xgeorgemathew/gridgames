import { describe, expect, test } from 'bun:test'
import { parseFrame } from './protocol'
import { RealtimeServer } from './server'
import { RealtimeSocket } from './client'

describe('event protocol', () => {
  test('rejects malformed, reserved, binary and oversized client messages', () => {
    for (const value of [
      '{',
      '{}',
      '{"event":"disconnect","args":[]}',
      '{"event":"x","args":{}}',
      'x'.repeat(65537),
      new ArrayBuffer(2),
    ]) {
      expect(parseFrame(value, true)).toBeNull()
    }
    expect(parseFrame('{"event":"scene_ready","args":[]}', true)).toEqual({
      event: 'scene_ready',
      args: [],
    })
  })
})

test('server scopes rooms, direct messages and disconnect exactly once', async () => {
  const server = new RealtimeServer()
  const messages: Record<string, string[]> = { a: [], b: [], c: [] }
  let disconnected = 0
  server.on('connection', (socket) => socket.on('disconnect', () => disconnected++))
  const a = server.connect('a', (value) => messages.a.push(value))
  const b = server.connect('b', (value) => messages.b.push(value))
  server.connect('c', (value) => messages.c.push(value))
  a.join('room')
  b.join('room')
  server.to('room').emit('game_start', { durationMs: 60000 })
  server.to('a').emit('error', { message: 'direct' })
  expect(messages.a.length).toBe(2)
  expect(messages.b.length).toBe(1)
  expect(messages.c.length).toBe(0)
  await server.disconnect('a')
  await server.disconnect('a')
  expect(disconnected).toBe(1)
  expect(server.of('/').sockets.size).toBe(2)
})

class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = []
  readyState = 0
  sent: string[] = []
  constructor(readonly url: string) {
    super()
    FakeWebSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }
  receive(event: string, ...args: unknown[]) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ event, args }) }))
  }
}

test('client handshake sets identity, buffers only initial join and tears down listeners', () => {
  const previous = globalThis.WebSocket
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
  try {
    const socket = new RealtimeSocket('https://example.com')
    const ws = FakeWebSocket.instances.at(-1)!
    let identities: string[] = []
    socket.on('connect', () => identities.push(socket.id!))
    socket.emit('join_waiting_pool', { playerName: 'A' })
    ws.readyState = 1
    ws.receive('connect', { id: 'first', epoch: 'one' })
    expect(identities).toEqual(['first'])
    expect(socket.connected).toBe(true)
    expect(ws.sent.length).toBe(1)
    socket.removeAllListeners()
    ws.receive('connect', { id: 'second', epoch: 'one' })
    expect(identities).toEqual(['first'])
    socket.disconnect()
    expect(socket.connected).toBe(false)
    expect(socket.id).toBeUndefined()
  } finally {
    globalThis.WebSocket = previous
  }
})

test('server rejects connection spoofing and malformed payload without running game handlers', async () => {
  const server = new RealtimeServer()
  const messages: string[] = []
  let scenes = 0
  server.on('connection', (socket) =>
    socket.on('scene_ready', () => {
      scenes++
    })
  )
  server.connect('a', (value) => messages.push(value))
  await server.receive('a', '{"event":"connect","args":[{"id":"victim"}]}')
  await server.receive('a', '{"event":"scene_ready","args":[null]}')
  expect(scenes).toBe(0)
  expect(messages.map((value) => JSON.parse(value).event)).toEqual(['error', 'error'])
  await server.receive('a', '{"event":"scene_ready","args":[]}')
  expect(scenes).toBe(1)
})

test('client reconnect replaces identity and does not replay actions from an interrupted match', async () => {
  const previous = globalThis.WebSocket
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
  let socket: RealtimeSocket | undefined
  try {
    socket = new RealtimeSocket('https://example.com')
    const first = FakeWebSocket.instances.at(-1)!
    const identities: string[] = []
    let disconnects = 0
    socket.on('connect', () => {
      identities.push(socket!.id!)
    })
    socket.on('disconnect', () => {
      disconnects++
    })
    first.readyState = 1
    first.receive('connect', { id: 'first' })
    first.close()
    socket.emit('open_position', { direction: 'long' })
    await new Promise((resolve) => setTimeout(resolve, 1100))
    const second = FakeWebSocket.instances.at(-1)!
    expect(second).not.toBe(first)
    second.readyState = 1
    second.receive('connect', { id: 'second' })
    first.receive('game_over', { winnerId: 'stale' })
    expect(identities).toEqual(['first', 'second'])
    expect(disconnects).toBe(1)
    expect(second.sent).toEqual([])
  } finally {
    socket?.disconnect()
    globalThis.WebSocket = previous
  }
})

test('intentional room and lobby handoffs preserve identity and listeners without app reconnect', () => {
  const previous = globalThis.WebSocket
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
  const socket = new RealtimeSocket('https://example.com')
  try {
    let connects = 0,
      disconnects = 0,
      results = 0
    socket.on('connect', () => connects++)
    socket.on('disconnect', () => disconnects++)
    socket.on('game_over', () => results++)
    const lobby = FakeWebSocket.instances.at(-1)!
    lobby.readyState = 1
    lobby.receive('connect', { id: 'seat' })
    lobby.receive('transport_handoff', { path: '/api/socket/room/room-id?ticket=opaque' })
    const room = FakeWebSocket.instances.at(-1)!
    expect(room.url).toBe('wss://example.com/api/socket/room/room-id?ticket=opaque')
    room.readyState = 1
    room.receive('connect', { id: 'seat' })
    room.receive('game_over', { winnerId: 'seat' })
    room.receive('transport_handoff', { path: '/api/socket?return=opaque' })
    const returned = FakeWebSocket.instances.at(-1)!
    socket.emit('join_waiting_pool', { playerName: 'A' })
    returned.readyState = 1
    returned.receive('connect', { id: 'seat' })
    expect(socket.id).toBe('seat')
    expect(connects).toBe(1)
    expect(disconnects).toBe(0)
    expect(results).toBe(1)
    expect(returned.sent).toHaveLength(1)
  } finally {
    socket.disconnect()
    globalThis.WebSocket = previous
  }
})
