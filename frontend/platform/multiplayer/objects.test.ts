import { expect, mock, test } from 'bun:test'
import { Database } from 'bun:sqlite'
mock.module('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(
      protected ctx: any,
      protected env: any
    ) {}
  },
}))
const { Lobby } = await import('@/worker/lobby')
class Socket {
  readyState = 1
  frames: any[] = []
  data: any
  constructor(id: string) {
    this.data = { id, count: 0, windowStart: Date.now() }
  }
  serializeAttachment(data: any) {
    this.data = structuredClone(data)
  }
  deserializeAttachment() {
    return structuredClone(this.data)
  }
  send(raw: string) {
    this.frames.push(JSON.parse(raw))
  }
  close() {
    this.readyState = 3
  }
}
function fixture(provision: (config: any) => Promise<void>) {
  const db = new Database(':memory:'),
    sockets = ['a', 'b', 'c'].map((id) => new Socket(id))
  const state = {
    storage: {
      sql: {
        exec: (sql: string, ...args: any[]) => {
          const rows = db.query(sql).all(...args)
          return { toArray: () => rows }
        },
      },
      setAlarm: async () => {},
      deleteAlarm: async () => {},
    },
    getWebSockets: () => sockets,
  }
  const env = {
    ALLOWED_ORIGINS: '',
    GAME_ROOMS: {
      idFromName: (id: string) => id,
      get: () => ({ provision, cancel: async () => {} }),
    },
  }
  return { db, sockets, state, env, lobby: new Lobby(state as any, env as any) }
}
const message = (event: string, payload: any = {}) => JSON.stringify({ event, args: [payload] })
test('cold lobby reconstructs queue from socket attachments without app connect', async () => {
  const f = fixture(async () => {})
  try {
    await f.lobby.webSocketMessage(
      f.sockets[0] as any,
      message('join_waiting_pool', { playerName: 'A', gameSlug: 'tap-dancer' })
    )
    const cold = new Lobby(f.state as any, f.env as any)
    await cold.webSocketMessage(
      f.sockets[1] as any,
      message('get_lobby_players', { gameSlug: 'tap-dancer' })
    )
    expect(f.sockets[1].frames.at(-1).event).toBe('lobby_players')
    expect(f.sockets[1].frames.at(-1).args[0][0].socketId).toBe('a')
    expect(f.sockets.flatMap((s) => s.frames).some((frame) => frame.event === 'connect')).toBe(
      false
    )
  } finally {
    f.db.close()
  }
})
test('reservation blocks a second pair and failed provision restores both waiting seats', async () => {
  let reject!: (error: Error) => void,
    calls = 0
  const f = fixture(async () => {
    calls++
    await new Promise<void>((_, fail) => {
      reject = fail
    })
  })
  try {
    for (const [i, ws] of f.sockets.entries())
      await f.lobby.webSocketMessage(
        ws as any,
        message('join_waiting_pool', { playerName: `P${i}`, gameSlug: 'tap-dancer' })
      )
    const first = f.lobby.webSocketMessage(
      f.sockets[0] as any,
      message('select_opponent', { opponentSocketId: 'b' })
    )
    await Promise.resolve()
    await Promise.resolve()
    await f.lobby.webSocketMessage(
      f.sockets[2] as any,
      message('select_opponent', { opponentSocketId: 'b' })
    )
    expect(calls).toBe(1)
    expect(f.sockets[2].frames.at(-1).event).toBe('error')
    reject(new Error('Controlled provision failure'))
    await first
    expect(f.sockets[0].data.reserved).toBeUndefined()
    expect(f.sockets[1].data.reserved).toBeUndefined()
    expect(f.sockets[0].data.waiting.id).toBe('a')
    expect(f.db.query('SELECT COUNT(*) AS count FROM reservations').get()).toEqual({ count: 0 })
  } finally {
    f.db.close()
  }
})

test('expired reservation alarm restores live queue seats and allows another pair', async () => {
  let calls = 0
  const f = fixture(async () => {
    calls++
  })
  try {
    for (const [i, ws] of f.sockets.entries())
      await f.lobby.webSocketMessage(
        ws as any,
        message('join_waiting_pool', { playerName: `P${i}`, gameSlug: 'tap-dancer' })
      )
    for (const ws of f.sockets.slice(0, 2)) {
      const data = ws.deserializeAttachment()
      data.reserved = 'expired'
      ws.serializeAttachment(data)
    }
    f.db.query('INSERT INTO reservations VALUES (?,?)').run('expired', Date.now() - 1)
    await f.lobby.alarm()
    expect(f.sockets[0].data.reserved).toBeUndefined()
    expect(f.sockets[1].data.reserved).toBeUndefined()
    await f.lobby.webSocketMessage(
      f.sockets[0] as any,
      message('select_opponent', { opponentSocketId: 'b' })
    )
    expect(calls).toBe(1)
    expect(f.sockets[0].frames.at(-1).event).toBe('transport_handoff')
  } finally {
    f.db.close()
  }
})

test('active room cold restart stores interruption and rejects attachment without restoring a game', async () => {
  const { GameRoom } = await import('@/worker/game-room')
  const db = new Database(':memory:')
  const state = {
    storage: {
      sql: {
        exec: (sql: string, ...args: any[]) => {
          const rows = db.query(sql).all(...args)
          return { toArray: () => rows }
        },
      },
      deleteAlarm: async () => {},
    },
    waitUntil: () => {},
  }
  try {
    const env = { ALLOWED_ORIGINS: '' }
    new GameRoom(state as any, env as any)
    const config = {
      roomId: 'restart-test',
      gameSlug: 'tap-dancer',
      gameDuration: 60000,
      players: [],
    }
    db.query('INSERT INTO lifecycle VALUES (1,?,?,?,?)').run(
      'active',
      JSON.stringify(config),
      '{}',
      Date.now()
    )
    db.query('INSERT INTO tickets VALUES (?,?)').run('unused', 'seat')
    const cold = new GameRoom(state as any, env as any)
    expect(db.query('SELECT status FROM lifecycle').get()).toEqual({ status: 'interrupted' })
    expect(db.query('SELECT COUNT(*) AS count FROM tickets').get()).toEqual({ count: 0 })
    const response = await cold.fetch(
      new Request('https://example.com/api/socket/room/restart-test?ticket=unused', {
        headers: { Upgrade: 'websocket' },
      })
    )
    expect(response.status).toBe(410)
  } finally {
    db.close()
  }
})

test.each(['resolve', 'reject'] as const)(
  'expired provision %s cannot overwrite a newer reservation',
  async (mode) => {
    const pending: Array<{ config: any; resolve: () => void; reject: (error: Error) => void }> = []
    const f = fixture(async (config) => {
      await new Promise<void>((resolve, reject) => pending.push({ config, resolve, reject }))
    })
    try {
      for (const [i, ws] of f.sockets.entries())
        await f.lobby.webSocketMessage(
          ws as any,
          message('join_waiting_pool', { playerName: `P${i}`, gameSlug: 'tap-dancer' })
        )
      const old = f.lobby.webSocketMessage(
        f.sockets[0] as any,
        message('select_opponent', { opponentSocketId: 'b' })
      )
      for (let i = 0; i < 10 && !pending.length; i++) await Promise.resolve()
      f.db.query('UPDATE reservations SET expires=?').run(Date.now() - 1)
      await f.lobby.alarm()
      const newer = f.lobby.webSocketMessage(
        f.sockets[0] as any,
        message('select_opponent', { opponentSocketId: 'c' })
      )
      for (let i = 0; i < 10 && pending.length < 2; i++) await Promise.resolve()
      const newId = pending[1].config.roomId
      const oldToken = pending[0].config.players[0].returnToken
      const newToken = pending[1].config.players[0].returnToken
      f.db.query('INSERT INTO returns VALUES (?,?,?)').run(oldToken, 'a', Date.now() + 60000)
      f.db.query('INSERT INTO returns VALUES (?,?,?)').run(newToken, 'a', Date.now() + 60000)
      if (mode === 'resolve') pending[0].resolve()
      else pending[0].reject(new Error('Old provision failed'))
      await old
      expect(f.sockets[0].data.reserved).toBe(newId)
      expect(f.sockets[0].readyState).toBe(1)
      expect(f.sockets[0].frames.some((frame) => frame.event === 'transport_handoff')).toBe(false)
      expect(f.db.query('SELECT token FROM returns WHERE token=?').get(oldToken)).toBeNull()
      expect(f.db.query('SELECT token FROM returns WHERE token=?').get(newToken)).toEqual({
        token: newToken,
      })
      f.db.query('DELETE FROM returns WHERE token=?').run(newToken)
      pending[1].resolve()
      await newer
      expect(f.sockets[0].frames.at(-1).args[0].path).toContain(newId)
    } finally {
      f.db.close()
    }
  }
)
