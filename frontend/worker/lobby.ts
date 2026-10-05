import { DurableObject } from 'cloudflare:workers'
import { parseFrame } from '@/platform/multiplayer/protocol'
import { validatePlayerName } from '@/app/api/socket/multiplayer/validation.utils'
import { SERVER_GAME_CONFIG as CFG } from '@/app/api/socket/multiplayer/game.config'
import { send, handoff, upgradeDenied, type RoomPlayer, type RoomProvision } from './session'

interface QueueEntry extends RoomPlayer {
  gameSlug: string
  gameDuration: number
  joinedAt: number
}
interface Attachment {
  id: string
  waiting?: QueueEntry
  reserved?: string
  count: number
  windowStart: number
}
/** Queue state lives in hibernating socket attachments, not process-local Maps. */
export class Lobby extends DurableObject<Cloudflare.Env> {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)'
    )
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS returns (token TEXT PRIMARY KEY, player_id TEXT NOT NULL, expires INTEGER NOT NULL)'
    )
  }
  async fetch(request: Request): Promise<Response> {
    const denied = upgradeDenied(request, this.env.ALLOWED_ORIGINS)
    if (denied) return denied
    let id = crypto.randomUUID() as string
    const token = new URL(request.url).searchParams.get('return')
    if (token) {
      const row = this.ctx.storage.sql
        .exec<{
          player_id: string
        }>(
          'DELETE FROM returns WHERE token = ? AND expires > ? RETURNING player_id',
          token,
          Date.now()
        )
        .toArray()[0]
      if (!row) return new Response('Invalid return credential', { status: 403 })
      id = row.player_id
    }
    const pair = new WebSocketPair()
    pair[1].serializeAttachment({ id, count: 0, windowStart: Date.now() } satisfies Attachment)
    this.ctx.acceptWebSocket(pair[1])
    send(pair[1], 'connect', { id, recovery: token ? 'handoff' : 'new-session' })
    return new Response(null, { status: 101, webSocket: pair[0] })
  }
  private entries(): Array<{ ws: WebSocket; data: Attachment }> {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === 1)
      .map((ws) => ({ ws, data: ws.deserializeAttachment() as Attachment }))
  }
  private broadcast(): void {
    const players = this.entries().flatMap(({ data }) =>
      data.waiting && !data.reserved ? [this.publicPlayer(data.waiting)] : []
    )
    for (const { ws, data } of this.entries())
      if (!data.reserved) send(ws, 'lobby_updated', { players })
  }
  private publicPlayer(p: QueueEntry) {
    return {
      socketId: p.id,
      name: p.name,
      gameSlug: p.gameSlug,
      gameDuration: p.gameDuration,
      joinedAt: p.joinedAt,
      leverage: CFG.FIXED_LEVERAGE,
    }
  }
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const data = ws.deserializeAttachment() as Attachment
    if (Date.now() - data.windowStart > 1000) {
      data.count = 0
      data.windowStart = Date.now()
    }
    data.count++
    ws.serializeAttachment(data)
    if (data.count > 100) {
      ws.close(1008, 'Message rate exceeded')
      return
    }
    const frame = parseFrame(raw, true)
    if (!frame || data.reserved) {
      send(ws, 'error', { message: 'Invalid lobby action' })
      return
    }
    const payload = frame.args[0] ?? {}
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      send(ws, 'error', { message: 'Invalid event payload' })
      return
    }
    const p = payload as Record<string, unknown>
    if (frame.event === 'get_lobby_players') {
      const players = this.entries().flatMap(({ data: other }) =>
        other.id !== data.id &&
        other.waiting &&
        !other.reserved &&
        (!p.gameSlug || other.waiting.gameSlug === p.gameSlug)
          ? [this.publicPlayer(other.waiting)]
          : []
      )
      send(ws, 'lobby_players', players)
      return
    }
    if (frame.event === 'leave_waiting_pool') {
      delete data.waiting
      ws.serializeAttachment(data)
      this.broadcast()
      return
    }
    if (frame.event === 'join_waiting_pool' || frame.event === 'find_match') {
      try {
        const gameSlug = p.gameSlug ?? 'hyper-swiper'
        const duration = p.gameDuration ?? 60000
        if (
          !['hyper-swiper', 'tap-dancer'].includes(String(gameSlug)) ||
          typeof duration !== 'number' ||
          !Number.isFinite(duration) ||
          duration < 1000 ||
          duration > 3600000
        )
          throw new Error('Invalid game settings')
        const name = validatePlayerName(p.playerName)
        if (!name || name.length > 64) throw new Error('Invalid player name')
        const size = (value: unknown, fallback: number) =>
          typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 8192
            ? value
            : fallback
        data.waiting = {
          id: data.id,
          name,
          gameSlug: String(gameSlug),
          gameDuration: duration,
          sceneWidth: size(p.sceneWidth, CFG.DEFAULT_SCENE_WIDTH),
          sceneHeight: size(p.sceneHeight, CFG.DEFAULT_SCENE_HEIGHT),
          walletAddress:
            typeof p.walletAddress === 'string' ? p.walletAddress.slice(0, 128) : undefined,
          ticket: '',
          returnToken: '',
          joinedAt: Date.now(),
        }
        ws.serializeAttachment(data)
        this.broadcast()
        if (frame.event === 'find_match') {
          const opponent = this.entries().find(
            ({ data: other }) =>
              other.id !== data.id &&
              !other.reserved &&
              other.waiting?.gameSlug === gameSlug &&
              other.waiting.gameDuration === duration
          )
          if (opponent) {
            await this.pair(ws, data, opponent.ws, opponent.data)
            return
          }
          send(ws, 'waiting_for_match')
        } else send(ws, 'joined_waiting_pool')
      } catch {
        send(ws, 'error', {
          code: frame.event === 'find_match' ? 'FIND_MATCH_FAILED' : 'JOIN_POOL_FAILED',
          message: 'Invalid matchmaking request',
        })
      }
      return
    }
    if (frame.event === 'select_opponent') {
      const opponent = this.entries().find(
        ({ data: other }) => other.id === p.opponentSocketId && !other.reserved
      )
      if (
        !data.waiting ||
        !opponent?.data.waiting ||
        opponent.data.id === data.id ||
        data.waiting.gameSlug !== opponent.data.waiting.gameSlug ||
        data.waiting.gameDuration !== opponent.data.waiting.gameDuration
      ) {
        send(ws, 'error', { code: 'OPPONENT_UNAVAILABLE', message: 'Opponent no longer available' })
        return
      }
      await this.pair(ws, data, opponent.ws, opponent.data)
      return
    }
    send(ws, 'error', { message: 'Action is not allowed in the lobby' })
  }
  private async pair(a: WebSocket, ad: Attachment, b: WebSocket, bd: Attachment): Promise<void> {
    const roomId = crypto.randomUUID()
    // Reserve both seats before the first await. Other events cannot pair them twice.
    ad.reserved = bd.reserved = roomId
    a.serializeAttachment(ad)
    b.serializeAttachment(bd)
    const players = [ad.waiting!, bd.waiting!].map((player) => ({
      ...player,
      ticket: crypto.randomUUID(),
      returnToken: crypto.randomUUID(),
    })) as [QueueEntry, QueueEntry]
    const config: RoomProvision = {
      roomId,
      players,
      gameSlug: players[0].gameSlug,
      gameDuration: players[0].gameDuration,
    }
    const room = this.env.GAME_ROOMS.get(this.env.GAME_ROOMS.idFromName(roomId))
    this.ctx.storage.sql.exec('INSERT INTO reservations VALUES (?,?)', roomId, Date.now() + 20000)
    const assertOwnership = () => {
      const reservation = this.ctx.storage.sql
        .exec<{ expires: number }>('SELECT expires FROM reservations WHERE id=?', roomId)
        .toArray()[0]
      if (
        !reservation ||
        reservation.expires <= Date.now() ||
        a.deserializeAttachment().reserved !== roomId ||
        b.deserializeAttachment().reserved !== roomId
      )
        throw new Error('Reservation expired or replaced')
    }
    try {
      await this.scheduleAlarm()
      assertOwnership()
      await room.provision(config)
      assertOwnership()
      if (a.readyState !== 1 || b.readyState !== 1) throw new Error('Player left during handoff')
      for (const player of players)
        this.ctx.storage.sql.exec(
          'INSERT INTO returns VALUES (?,?,?)',
          player.returnToken,
          player.id,
          Date.now() + config.gameDuration + 120000
        )
      await this.scheduleAlarm()
      assertOwnership()
      for (const [i, ws] of [a, b].entries()) {
        handoff(ws, `/api/socket/room/${roomId}?ticket=${players[i].ticket}`)
        ws.close(1000, 'Move to room')
      }
    } catch (error) {
      await room.cancel().catch(() => {})
      for (const player of players)
        this.ctx.storage.sql.exec('DELETE FROM returns WHERE token=?', player.returnToken)
      for (const ws of [a, b]) {
        const current = ws.deserializeAttachment() as Attachment
        if (current.reserved !== roomId) continue
        delete current.reserved
        if (ws.readyState === 1) {
          ws.serializeAttachment(current)
          send(ws, 'error', {
            code: 'MATCH_START_FAILED',
            message: 'Match could not start. Try again.',
          })
        }
      }
      console.error(JSON.stringify({ event: 'room_provision_failed', message: String(error) }))
    }
    this.ctx.storage.sql.exec('DELETE FROM reservations WHERE id=?', roomId)
    await this.scheduleAlarm()
    this.broadcast()
  }
  webSocketClose(_ws: WebSocket): void {
    this.broadcast()
  }
  webSocketError(ws: WebSocket): void {
    ws.close(1011, 'Socket error')
    this.broadcast()
  }
  private async scheduleAlarm(): Promise<void> {
    const row = this.ctx.storage.sql
      .exec<{
        expires: number
      }>(
        'SELECT MIN(expires) AS expires FROM (SELECT expires FROM returns UNION ALL SELECT expires FROM reservations)'
      )
      .toArray()[0]
    if (row?.expires) await this.ctx.storage.setAlarm(row.expires)
    else await this.ctx.storage.deleteAlarm()
  }
  async alarm(): Promise<void> {
    const expired = this.ctx.storage.sql
      .exec<{ id: string }>('DELETE FROM reservations WHERE expires <= ? RETURNING id', Date.now())
      .toArray()
    for (const { id } of expired) {
      for (const { ws, data } of this.entries())
        if (data.reserved === id) {
          delete data.reserved
          ws.serializeAttachment(data)
          send(ws, 'error', {
            code: 'MATCH_START_FAILED',
            message: 'Match handoff expired. Try again.',
          })
        }
      await this.env.GAME_ROOMS.get(this.env.GAME_ROOMS.idFromName(id)).cancel()
    }
    this.ctx.storage.sql.exec('DELETE FROM returns WHERE expires <= ?', Date.now())
    await this.scheduleAlarm()
    this.broadcast()
  }
}
