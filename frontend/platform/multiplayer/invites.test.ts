import { expect, test } from 'bun:test'
import { RealtimeSocket } from './client'
import { InviteSession } from '@/domains/match/client/invite-session'
import { buildInviteUrl, inviteSearch } from '@/domains/match/invites'

const inviteId = '9b2f94a2-92ca-45c8-a883-1b17e489fe1a'
const player = {
  playerName: 'Runner',
  gameSlug: 'tap-dancer',
  gameDuration: 120000,
  sceneWidth: 400,
  sceneHeight: 800,
  walletAddress: 'wallet',
}
const invite = {
  inviteId,
  gameSlug: 'tap-dancer',
  gameDuration: 120000,
  expiresAt: Date.now() + 600000,
}
class Socket extends EventTarget {
  static all: Socket[] = []
  readyState = 1
  sent: Array<{ event: string; args: unknown[] }> = []
  constructor(readonly url: string) {
    super()
    Socket.all.push(this)
  }
  send(frame: string) {
    this.sent.push(JSON.parse(frame))
  }
  close() {
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }
  frame(event: string, payload: unknown) {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify({ event, args: [payload] }) })
    )
  }
}
function fixture() {
  const previousWS = globalThis.WebSocket
  globalThis.WebSocket = Socket as unknown as typeof WebSocket
  const socket = new RealtimeSocket('https://pivot.example.com')
  const ws = Socket.all.at(-1)!
  ws.frame('connect', { id: 'host' })
  const session = new InviteSession(socket, 'tap-dancer')
  const detach = session.attach()
  return {
    socket,
    ws,
    session,
    acknowledge: () => {
      const request = ws.sent.findLast((frame) => frame.event === 'create_invite')!.args[0] as any
      ws.frame('invite_created', { ...invite, requestId: request.requestId })
    },
    cleanup: () => {
      detach()
      socket.disconnect()
      globalThis.WebSocket = previousWS
    },
  }
}

test('invite URLs contain only the game route and invite ID on the current origin', () => {
  expect(buildInviteUrl('https://pivot.example.com/current?ticket=secret#room', invite)).toBe(
    `https://pivot.example.com/tap-dancer?invite=${inviteId}`
  )
  expect(() =>
    buildInviteUrl('https://pivot.example.com', { ...invite, gameSlug: '//attacker.example' })
  ).toThrow()
})
test('route search keeps an invite through sign-in and flags malformed search values', () => {
  expect(inviteSearch({ invite: inviteId, ticket: 'secret' })).toEqual({ invite: inviteId })
  expect(inviteSearch({ invite: ['one', 'two'] })).toEqual({ invite: '' })
  expect(inviteSearch({})).toEqual({})
})
test('creating an invite waits for server metadata and notifies UI subscribers', () => {
  const f = fixture()
  let updates = 0
  const unsubscribe = f.session.subscribe(() => {
    updates++
  })
  try {
    f.session.create(player)
    expect(f.ws.sent.at(-1)).toMatchObject({ event: 'create_invite', args: [player] })
    expect((f.ws.sent.at(-1)!.args[0] as any).requestId).toMatch(/^[a-f0-9-]{36}$/)
    expect(f.session.getSnapshot().status).toBe('creating')
    expect(f.session.getSnapshot().invite).toBeNull()
    f.acknowledge()
    expect(f.session.getSnapshot()).toMatchObject({ status: 'waiting', invite })
    expect(updates).toBe(2)
  } finally {
    unsubscribe()
    f.cleanup()
  }
})
test('joining validates an invite and emits once while the request is pending', () => {
  const f = fixture()
  try {
    f.session.join('invalid', player)
    expect(f.ws.sent).toHaveLength(0)
    expect(f.session.getSnapshot().status).toBe('error')
    f.session.join(inviteId, player)
    f.session.join(inviteId, player)
    expect(f.ws.sent).toHaveLength(1)
    expect(f.ws.sent[0]).toEqual({ event: 'join_invite', args: [{ ...player, inviteId }] })
    expect(f.session.getSnapshot().status).toBe('joining')
  } finally {
    f.cleanup()
  }
})
test('cancel removes the private waiting seat and ignores a late create acknowledgement', () => {
  const f = fixture()
  try {
    f.session.create(player)
    f.session.cancel()
    expect(f.ws.sent.at(-1)?.event).toBe('leave_waiting_pool')
    f.acknowledge()
    expect(f.session.getSnapshot().status).toBe('idle')
    expect(f.session.getSnapshot().invite).toBeNull()
  } finally {
    f.cleanup()
  }
})

test('a delayed acknowledgement from a cancelled request cannot replace a newer invite', () => {
  const f = fixture()
  try {
    f.session.create(player)
    const first = f.ws.sent.at(-1)!.args[0] as any
    f.session.cancel()
    f.session.create(player)
    const second = f.ws.sent.at(-1)!.args[0] as any
    f.ws.frame('invite_created', { ...invite, requestId: first.requestId })
    expect(f.session.getSnapshot().status).toBe('creating')
    expect(f.session.getSnapshot().invite).toBeNull()
    const nextId = '1a2f94a2-92ca-45c8-a883-1b17e489fe1a'
    f.ws.frame('invite_created', { ...invite, inviteId: nextId, requestId: second.requestId })
    expect(f.session.getSnapshot().invite?.inviteId).toBe(nextId)
  } finally {
    f.cleanup()
  }
})
test('expiry, unavailable invites and disconnects clear a shareable invite', () => {
  const f = fixture()
  try {
    f.session.create(player)
    f.acknowledge()
    f.ws.frame('invite_expired', { inviteId: 'different' })
    expect(f.session.getSnapshot().status).toBe('waiting')
    f.ws.frame('invite_expired', { inviteId })
    expect(f.session.getSnapshot()).toMatchObject({ status: 'error', invite: null })
    f.session.join(inviteId, player)
    f.ws.frame('error', { code: 'INVITE_UNAVAILABLE', message: 'Host left' })
    expect(f.session.getSnapshot()).toMatchObject({
      status: 'error',
      message: 'Host left',
      invite: null,
    })
    f.session.create(player)
    f.acknowledge()
    f.ws.close()
    expect(f.session.getSnapshot()).toMatchObject({ status: 'error', invite: null })
  } finally {
    f.cleanup()
  }
})
test('intentional room handoff preserves the pending invite until match creation consumes it', () => {
  const f = fixture()
  let matched = 0
  const detach = f.session.attach(() => {
    matched++
  })
  try {
    f.session.create(player)
    f.acknowledge()
    f.ws.frame('transport_handoff', { path: '/api/socket/room/private?ticket=opaque' })
    const room = Socket.all.at(-1)!
    room.frame('connect', { id: 'host' })
    expect(f.session.getSnapshot().status).toBe('waiting')
    room.frame('match_found', { roomId: 'private', players: [] })
    expect(f.session.getSnapshot()).toMatchObject({ status: 'idle', invite: null })
    expect(matched).toBe(1)
    f.session.create(player)
    expect(room.sent).toHaveLength(0)
  } finally {
    detach()
    f.cleanup()
  }
})

test('a room abort before match creation releases the invite flow and ignores older rooms', () => {
  const f = fixture()
  try {
    f.session.join(inviteId, player)
    f.ws.frame('transport_handoff', { path: '/api/socket/room/private?ticket=opaque' })
    const room = Socket.all.at(-1)!
    room.frame('connect', { id: 'host' })
    room.frame('match_aborted', { matchId: 'old-room', reason: 'join_timeout' })
    expect(f.session.getSnapshot().status).toBe('joining')
    room.frame('match_aborted', { matchId: 'private', reason: 'join_timeout' })
    expect(f.session.getSnapshot()).toMatchObject({ status: 'error', invite: null })
    room.frame('transport_handoff', { path: '/api/socket?return=opaque' })
    const lobby = Socket.all.at(-1)!
    lobby.frame('connect', { id: 'host' })
    f.session.cancel()
    f.session.create(player)
    expect(lobby.sent.at(-1)?.event).toBe('create_invite')
  } finally {
    f.cleanup()
  }
})
