import { DurableObject } from 'cloudflare:workers'
import { StockMatch } from '@/domains/stock-arcade/server/match'
import { valueBags } from '@/domains/stock-arcade/server/valuation'
import { RealtimeServer } from '@/platform/multiplayer/server'
import { parseFrame } from '@/platform/multiplayer/protocol'
import { setupGameEvents } from '@/app/api/socket/multiplayer'
import { handoff, send, upgradeDenied, type RoomProvision } from './session'

const actions = new Set([
  'scene_ready',
  'catch_stock',
  'set_catch_cost',
  'end_game',
  'slice_coin',
  'open_position',
  'close_position',
  'set_leverage',
  'match_action',
  'coin_expired',
])
type Status = 'waiting' | 'active' | 'completed' | 'aborted' | 'interrupted'
/** One object owns one match. No gameplay state is restored after an active restart. */
export class GameRoom extends DurableObject<Cloudflare.Env> {
  private config: RoomProvision | null = null
  private status: Status | null = null
  private peers = new Map<string, WebSocket>()
  private runtime: ReturnType<typeof setupGameEvents> | null = null
  private io: RealtimeServer | null = null
  private queue = Promise.resolve()
  private finishing = false
  private arcade: StockMatch | null = null
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS lifecycle (id INTEGER PRIMARY KEY CHECK(id=1), status TEXT NOT NULL, config TEXT NOT NULL, result TEXT NOT NULL, updated_at INTEGER NOT NULL)'
    )
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS tickets (token TEXT PRIMARY KEY, player_id TEXT NOT NULL)'
    )
    const row = ctx.storage.sql
      .exec<{ status: Status; config: string }>('SELECT status,config FROM lifecycle WHERE id=1')
      .toArray()[0]
    if (row) {
      this.config = JSON.parse(row.config)
      this.status = row.status
      if (row.status === 'active') {
        this.status = 'interrupted'
        ctx.storage.sql.exec(
          "UPDATE lifecycle SET status='interrupted',updated_at=? WHERE id=1",
          Date.now()
        )
        ctx.storage.sql.exec('DELETE FROM tickets')
      }
    }
  }
  async provision(config: RoomProvision): Promise<void> {
    if (this.config) throw new Error('Room already provisioned')
    this.config = config
    this.status = 'waiting'
    this.ctx.storage.sql.exec(
      'INSERT INTO lifecycle VALUES (1,?,?,?,?)',
      'waiting',
      JSON.stringify(config),
      '{}',
      Date.now()
    )
    for (const player of config.players)
      this.ctx.storage.sql.exec('INSERT INTO tickets VALUES (?,?)', player.ticket, player.id)
    await this.ctx.storage.setAlarm(Date.now() + 15000)
  }
  async cancel(): Promise<void> {
    await this.finish('aborted', 'handoff_failed')
  }
  async fetch(request: Request): Promise<Response> {
    const denied = upgradeDenied(request, this.env.ALLOWED_ORIGINS)
    if (denied) return denied
    if (!this.config || this.status !== 'waiting')
      return new Response('Room is closed', { status: 410 })
    const created = this.ctx.storage.sql
      .exec<{ updated_at: number }>('SELECT updated_at FROM lifecycle WHERE id=1')
      .toArray()[0]
    if (Date.now() - created.updated_at >= 15000) {
      await this.finish('aborted', 'join_timeout')
      return new Response('Seat tickets expired', { status: 410 })
    }
    const token = new URL(request.url).searchParams.get('ticket') ?? ''
    const row = this.ctx.storage.sql
      .exec<{ player_id: string }>('DELETE FROM tickets WHERE token=? RETURNING player_id', token)
      .toArray()[0]
    if (!row || this.peers.has(row.player_id))
      return new Response('Invalid seat ticket', { status: 403 })
    const pair = new WebSocketPair()
    const ws = pair[1]
    ws.accept()
    this.peers.set(row.player_id, ws)
    let count = 0
    let windowStart = Date.now()
    ws.addEventListener('message', (event) => {
      if (Date.now() - windowStart > 1000) {
        count = 0
        windowStart = Date.now()
      }
      if (++count > 100) {
        ws.close(1008, 'Message rate exceeded')
        return
      }
      this.enqueue(async () => {
        const frame = parseFrame(event.data, true)
        if (!frame || !actions.has(frame.event) || this.status !== 'active') {
          send(ws, 'error', { message: 'Action is not allowed in this room' })
          return
        }
        if (this.arcade) this.arcade.handle(row.player_id, frame.event, frame.args[0])
        else await this.io?.receive(row.player_id, event.data)
      })
    })
    const disconnected = () =>
      this.enqueue(async () => {
        if (!this.peers.delete(row.player_id) || this.finishing) return
        this.arcade?.cancel('player_disconnected')
        await this.io?.disconnect(row.player_id)
        if (!this.finishing && (this.status === 'waiting' || this.status === 'active'))
          await this.finish('aborted', 'player_disconnected')
      })
    ws.addEventListener('close', disconnected)
    ws.addEventListener('error', disconnected)
    send(ws, 'connect', { id: row.player_id, recovery: 'handoff' })
    if (this.peers.size === 2) {
      this.status = 'active'
      this.ctx.storage.sql.exec(
        "UPDATE lifecycle SET status='active',updated_at=? WHERE id=1",
        Date.now()
      )
      await this.ctx.storage.deleteAlarm()
      if (this.config.gameSlug === 'stock-arcade') {
        this.arcade = new StockMatch(this.config, {
          now: () => Date.now(),
          quote: (symbol, requestId, swapper, cost) =>
            this.env.QUOTE_GATE.get(this.env.QUOTE_GATE.idFromName('uniswap-key-v1')).quote(
              symbol,
              requestId,
              swapper,
              cost
            ),
          value: (bags, cutoffAt) => valueBags(bags, cutoffAt, this.env.ROBINHOOD_RPC_URL),
          emit: (event, payload) => {
            // Persist ledger/lifecycle before broadcasting acknowledgements.
            if (event === 'arcade_state')
              this.ctx.storage.sql.exec(
                'UPDATE lifecycle SET result=?,updated_at=? WHERE id=1',
                JSON.stringify({ arcade_state: payload }),
                Date.now()
              )
            for (const peer of this.peers.values()) send(peer, event, payload)
          },
          waitUntil: (task) => this.ctx.waitUntil(task),
          terminal: (reason) =>
            this.enqueue(() => this.finish(reason ? 'aborted' : 'completed', reason)),
        })
        this.arcade.initialize()
      } else {
        this.io = new RealtimeServer((target, event, args) => {
          if (!target || !['game_settlement', 'game_over', 'match_aborted'].includes(event)) return
          const previous = this.ctx.storage.sql
            .exec<{ result: string }>('SELECT result FROM lifecycle WHERE id=1')
            .toArray()[0]
          const result = { ...JSON.parse(previous.result), [event]: args[0] }
          this.ctx.storage.sql.exec(
            'UPDATE lifecycle SET result=?,updated_at=? WHERE id=1',
            JSON.stringify(result),
            Date.now()
          )
          if (event === 'game_over' || event === 'match_aborted') {
            this.status = event === 'game_over' ? 'completed' : 'aborted'
            this.ctx.storage.sql.exec('UPDATE lifecycle SET status=? WHERE id=1', this.status)
            // Finish after the runtime sends its terminal event to both peers.
            this.enqueue(() => this.finish(event === 'game_over' ? 'completed' : 'aborted'))
          }
        })
        this.runtime = setupGameEvents(this.io, async (url) => {
          const response = await fetch(url.replace('wss:', 'https:'), {
            headers: { Upgrade: 'websocket' },
          })
          if (!response.webSocket) throw new Error(`Market upgrade failed (${response.status})`)
          response.webSocket.accept()
          return response.webSocket
        })
        for (const [id, peer] of this.peers)
          this.io.connect(id, (frame) => {
            if (peer.readyState === 1) peer.send(frame)
          })
        await this.runtime.startMatch(this.config)
      }
    }
    return new Response(null, { status: 101, webSocket: pair[0] })
  }
  async alarm(): Promise<void> {
    if (this.status === 'waiting') await this.finish('aborted', 'join_timeout')
  }
  private async finish(status: 'completed' | 'aborted', reason?: string): Promise<void> {
    if (
      this.finishing ||
      !this.config ||
      !this.status ||
      this.status === 'interrupted' ||
      (this.status === 'completed' && status === 'aborted')
    )
      return
    this.finishing = true
    this.status = status
    this.ctx.storage.sql.exec(
      'UPDATE lifecycle SET status=?,updated_at=? WHERE id=1',
      status,
      Date.now()
    )
    if (reason)
      this.ctx.storage.sql.exec(
        'UPDATE lifecycle SET result=? WHERE id=1',
        JSON.stringify({
          ...JSON.parse(
            this.ctx.storage.sql
              .exec<{ result: string }>('SELECT result FROM lifecycle WHERE id=1')
              .toArray()[0].result
          ),
          match_aborted: { matchId: this.config.roomId, reason },
        })
      )
    const retained = {
      ...this.config,
      players: this.config.players.map((player) => ({ ...player, ticket: '', returnToken: '' })),
    }
    this.ctx.storage.sql.exec('UPDATE lifecycle SET config=? WHERE id=1', JSON.stringify(retained))
    this.ctx.storage.sql.exec('DELETE FROM tickets')
    await this.ctx.storage.deleteAlarm()
    this.arcade?.cleanup()
    this.arcade = null
    this.runtime?.cleanup()
    this.runtime = null
    for (const [id, ws] of this.peers) {
      if (reason) send(ws, 'match_aborted', { matchId: this.config.roomId, reason })
      const player = this.config.players.find((player) => player.id === id)!
      handoff(ws, `/api/socket?return=${player.returnToken}`)
      ws.close(1000, 'Return to lobby')
    }
    this.peers.clear()
    this.io = null
    console.log(JSON.stringify({ event: 'room_stopped', roomId: this.config.roomId, status }))
  }
  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue
      .then(task)
      .catch((error) =>
        console.error(JSON.stringify({ event: 'room_task_failed', message: String(error) }))
      )
    this.ctx.waitUntil(this.queue)
  }
}
