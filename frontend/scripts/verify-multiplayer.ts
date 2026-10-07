import { RealtimeSocket } from '../platform/multiplayer/client'
// Synthetic players only: this check never sends a blockchain transaction.
const base = process.argv[2] || 'http://localhost:8789'
class MissingPeer {
  ws: WebSocket
  frames: Array<{ event: string; args: any[] }> = []
  handoffs: string[] = []
  constructor(private follow = false) {
    this.ws = this.open('/api/socket')
  }
  private open(path: string): WebSocket {
    const ws = new WebSocket(base.replace(/^http/, 'ws') + path)
    ws.addEventListener('message', (event) => {
      if (this.ws !== ws) return
      const frame = JSON.parse(event.data.toString())
      if (frame.event === 'transport_handoff' && this.follow) {
        const path = frame.args[0].path
        this.handoffs.push(path)
        this.ws = this.open(path)
        ws.close()
      } else this.frames.push(frame)
    })
    return ws
  }
  emit(event: string, data?: unknown) {
    this.ws.send(JSON.stringify({ event, args: data === undefined ? [] : [data] }))
  }
  async wait(event: string, timeout = 15000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const found = this.frames.find((frame) => frame.event === event)
      if (found) return found.args[0]
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(
      `Timed out waiting for ${event}; seen: ${this.frames.map((f) => f.event).join(',')}`
    )
  }
  close() {
    this.ws.close()
  }
}
// Use the same adapter as the browser. Only the missing-seat test uses a raw socket.
class Peer {
  socket = new RealtimeSocket(base)
  frames: Array<{ event: string; args: any[] }> = []
  constructor() {
    this.socket.on('connect', () =>
      this.frames.push({ event: 'connect', args: [{ id: this.socket.id }] })
    )
    for (const event of [
      'joined_waiting_pool',
      'waiting_for_match',
      'lobby_players',
      'match_found',
      'game_start',
      'btc_price',
      'coin_spawn',
      'position_opened',
      'game_over',
      'game_settlement',
      'match_aborted',
      'error',
    ])
      this.socket.on(event, (...args: any[]) => this.frames.push({ event, args }))
  }
  get handoffs(): string[] {
    const url = new URL((this.socket as any).ws.url)
    return [url.pathname + url.search]
  }
  emit(event: string, data?: unknown) {
    if (data === undefined) this.socket.emit(event)
    else this.socket.emit(event, data)
  }
  async wait(event: string, timeout = 15000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const frame = this.frames.find((frame) => frame.event === event)
      if (frame) return frame.args[0]
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(
      `Timed out waiting for ${event}; seen: ${this.frames.map((f) => f.event).join(',')}`
    )
  }
  close() {
    this.socket.removeAllListeners()
    this.socket.disconnect()
  }
}
for (const gameSlug of ['hyper-swiper', 'tap-dancer']) {
  const a = new Peer(),
    b = new Peer()
  try {
    const [ha, hb] = await Promise.all([a.wait('connect'), b.wait('connect')])
    if (!ha.id || ha.id === hb.id) throw new Error('Invalid identities')
    a.emit('join_waiting_pool', { playerName: 'Migration A', gameSlug, gameDuration: 60000 })
    b.emit('join_waiting_pool', { playerName: 'Migration B', gameSlug, gameDuration: 60000 })
    await Promise.all([a.wait('joined_waiting_pool'), b.wait('joined_waiting_pool')])
    a.emit('get_lobby_players', { gameSlug })
    const lobby = await a.wait('lobby_players')
    if (!lobby.some((player: any) => player.socketId === hb.id))
      throw new Error('Lobby opponent missing')
    a.emit('select_opponent', { opponentSocketId: hb.id })
    const [ma, mb] = await Promise.all([a.wait('match_found'), b.wait('match_found')])
    if (ma.roomId !== mb.roomId) throw new Error('Room mismatch')
    a.emit('scene_ready')
    b.emit('scene_ready')
    await Promise.all([a.wait('game_start'), b.wait('game_start')])
    const price = await a.wait('btc_price', 20000)
    if (!Number.isFinite(price.price) || price.price <= 0) throw new Error('Invalid market price')
    if (gameSlug === 'hyper-swiper') {
      const coin = await a.wait('coin_spawn')
      a.emit('slice_coin', { coinId: coin.coinId, coinType: coin.coinType })
      await a.wait('position_opened')
    } else {
      a.emit('open_position', { direction: 'long' })
      await a.wait('position_opened')
    }
    a.emit('end_game')
    const result = await b.wait('game_over')
    await b.wait('game_settlement')
    if (!result.playerResults || result.playerResults.length !== 2)
      throw new Error('Settlement results missing')
    console.log(
      JSON.stringify({
        gameSlug,
        roomId: ma.roomId,
        lobby: true,
        start: true,
        price: true,
        positions: true,
        settlement: true,
      })
    )
  } finally {
    a.close()
    b.close()
  }
  // Exercise interruption on a fresh room and ensure reconnect is a new identity.
  const c = new Peer(),
    d = new Peer()
  let oldId: string
  try {
    const [hc] = await Promise.all([c.wait('connect'), d.wait('connect')])
    oldId = hc.id
    c.emit('find_match', { playerName: 'Migration C', gameSlug, gameDuration: 60000 })
    d.emit('find_match', { playerName: 'Migration D', gameSlug, gameDuration: 60000 })
    await Promise.all([c.wait('match_found'), d.wait('match_found')])
    c.close()
    await d.wait('match_aborted')
  } finally {
    c.close()
    d.close()
  }
  const reconnect = new Peer()
  try {
    const fresh = await reconnect.wait('connect')
    if (fresh.id === oldId!) throw new Error('Disconnected identity reused')
    console.log(JSON.stringify({ gameSlug, disconnectAbort: true, reconnectNewIdentity: true }))
  } finally {
    reconnect.close()
  }
}

const peers = [new Peer(), new Peer(), new Peer(), new Peer()]
try {
  const identities = await Promise.all(peers.map((peer) => peer.wait('connect')))
  for (const [i, peer] of peers.entries())
    peer.emit('find_match', {
      playerName: `Parallel${i}`,
      gameSlug: i < 2 ? 'tap-dancer' : 'hyper-swiper',
      gameDuration: 60000,
    })
  const matches = await Promise.all(peers.map((peer) => peer.wait('match_found')))
  if (matches[0].roomId === matches[2].roomId) throw new Error('Parallel rooms share identity')
  for (const peer of peers) peer.emit('scene_ready')
  await Promise.all(peers.map((peer) => peer.wait('game_start')))
  await Promise.all(peers.map((peer) => peer.wait('btc_price', 20000)))
  peers[0].emit('find_match', { playerName: 'Injected', gameSlug: 'tap-dancer' })
  await peers[0].wait('error')
  peers[0].emit('match_action', {
    matchId: matches[2].roomId,
    action: { type: 'open_position', direction: 'long' },
  })
  await new Promise((resolve) => setTimeout(resolve, 150))
  if (peers[2].frames.some((frame) => frame.event === 'position_opened'))
    throw new Error('Cross-room action applied')
  peers[0].emit('end_game')
  await peers[1].wait('game_over')
  await new Promise((resolve) => setTimeout(resolve, 250))
  if (peers[2].frames.some((frame) => ['game_over', 'match_aborted'].includes(frame.event)))
    throw new Error('Other room stopped')
  peers[2].emit('end_game')
  await peers[3].wait('game_over')
  await new Promise((resolve) => setTimeout(resolve, 250))
  for (const [i, peer] of peers.entries()) {
    const connects = peer.frames.filter((frame) => frame.event === 'connect')
    if (connects.at(-1)?.args[0].id !== identities[i].id || connects.length !== 1)
      throw new Error('Return identity changed')
    peer.frames = []
  }
  peers[0].emit('find_match', {
    playerName: 'Rematch0',
    gameSlug: 'tap-dancer',
    gameDuration: 60000,
  })
  peers[1].emit('find_match', {
    playerName: 'Rematch1',
    gameSlug: 'tap-dancer',
    gameDuration: 60000,
  })
  const again = await peers[0].wait('match_found')
  await peers[1].wait('match_found')
  if (again.roomId === matches[0].roomId) throw new Error('Terminal room reused')
  peers[0].emit('end_game')
  await peers[1].wait('game_over')
  console.log(
    JSON.stringify({
      parallelRooms: true,
      isolatedActions: true,
      terminalIsolation: true,
      stableReturnIdentity: true,
      rematchNewRoom: true,
    })
  )
} finally {
  for (const peer of peers) peer.close()
}
const joined = new Peer(),
  missing = new MissingPeer(false)
try {
  await Promise.all([joined.wait('connect'), missing.wait('connect')])
  joined.emit('find_match', { playerName: 'Joined', gameSlug: 'tap-dancer', gameDuration: 60000 })
  missing.emit('find_match', { playerName: 'Missing', gameSlug: 'tap-dancer', gameDuration: 60000 })
  const transfer = await missing.wait('transport_handoff')
  const path = transfer.path as string
  const denied = async (suffix: string) => {
    const response = await fetch(base + suffix, {
      headers: {
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': btoa('0123456789abcdef'),
        Origin: base,
      },
    })
    if (response.status !== 403) {
      response.webSocket?.close()
      throw new Error(`Ticket accepted at ${suffix.split('?')[0]}: ${response.status}`)
    }
  }
  await denied(path.split('?')[0] + '?ticket=wrong')
  // Wait for the joined seat's actual room handshake, not a fixed network delay.
  const joinedRoom = path.split('?')[0].split('/').at(-1)
  const handoffDeadline = Date.now() + 5000
  while (
    (!joined.socket.connected || joined.socket.roomId !== joinedRoom) &&
    Date.now() < handoffDeadline
  )
    await new Promise((resolve) => setTimeout(resolve, 30))
  if (!joined.socket.connected || joined.socket.roomId !== joinedRoom)
    throw new Error('Joined seat did not complete its room handoff')
  await denied(joined.handoffs[0])
  await joined.wait('match_aborted', 20000)
  if (joined.frames.some((frame) => frame.event === 'match_found'))
    throw new Error('Incomplete room started')
  const deadline = Date.now() + 3000
  while ((!joined.socket.connected || joined.socket.roomId !== null) && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 50))
  if (!joined.socket.connected || joined.socket.roomId !== null)
    throw new Error('Partial room did not return to lobby')
  const next = new Peer()
  try {
    await next.wait('connect')
    joined.frames = []
    joined.emit('find_match', {
      playerName: 'AfterTimeout',
      gameSlug: 'tap-dancer',
      gameDuration: 60000,
    })
    next.emit('find_match', {
      playerName: 'NewOpponent',
      gameSlug: 'tap-dancer',
      gameDuration: 60000,
    })
    await Promise.all([joined.wait('match_found'), next.wait('match_found')])
    joined.emit('end_game')
    await next.wait('game_over')
  } finally {
    next.close()
  }
  console.log(
    JSON.stringify({
      wrongTicketRejected: true,
      replayRejected: true,
      partialHandoffAborted: true,
      nextMatchAfterTimeout: true,
      noPrematureMatch: true,
    })
  )
} finally {
  joined.close()
  missing.close()
}
