import { parseFrame, type EventListener } from './protocol'

/** Socket event API backed by native WebSocket. Reconnect starts a fresh session. */
export class RealtimeSocket {
  id: string | undefined
  roomId: string | null = null
  connected = false
  private ws: WebSocket | null = null
  private listeners = new Map<string, Set<EventListener>>()
  private pending: string[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = false
  private attempts = 0
  private hasConnected = false
  private transferring = false
  private url: string
  constructor(baseUrl = '') {
    const url = new URL('/api/socket', baseUrl || window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    this.url = url.toString()
    this.open()
  }
  on(event: string, listener: EventListener): this {
    const listeners = this.listeners.get(event) || new Set<EventListener>()
    listeners.add(listener)
    this.listeners.set(event, listeners)
    return this
  }
  off(event: string, listener: EventListener): this {
    this.listeners.get(event)?.delete(listener)
    return this
  }
  removeAllListeners(): this {
    this.listeners.clear()
    return this
  }
  emit(event: string, ...args: unknown[]): this {
    const frame = JSON.stringify({ event, args })
    if (this.connected && this.ws?.readyState === 1) this.ws.send(frame)
    // Never replay game actions from a disconnected match into a new session.
    else if (
      (!this.hasConnected || this.transferring) &&
      !this.stopped &&
      ['find_match', 'join_waiting_pool', 'get_lobby_players'].includes(event) &&
      this.pending.length < 16
    )
      this.pending.push(frame)
    return this
  }
  disconnect(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.pending = []
    this.connected = false
    this.id = undefined
    this.ws?.close(1000, 'Client disconnect')
    this.ws = null
  }
  private dispatch(event: string, args: unknown[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      void listener(...args)
    })
  }
  private open(target = this.url): void {
    if (this.stopped) return
    const ws = new WebSocket(target)
    this.ws = ws
    ws.addEventListener('message', (event) => {
      if (this.ws !== ws || this.stopped) return
      const frame = parseFrame(event.data)
      if (!frame) return
      if (frame.event === 'transport_handoff') {
        const payload = frame.args[0] as { path?: string }
        if (
          typeof payload?.path !== 'string' ||
          !/^\/api\/socket(?:\?|\/room\/)/.test(payload.path)
        )
          return
        const next = new URL(payload.path, this.url)
        if (next.origin !== new URL(this.url).origin) return
        this.roomId = /^\/api\/socket\/room\/([^/]+)$/.exec(next.pathname)?.[1] ?? null
        this.transferring = true
        this.connected = false
        this.ws = null
        ws.close(1000, 'Transport handoff')
        this.open(next.toString())
        return
      }
      if (frame.event === 'connect') {
        const handshake = frame.args[0] as { id?: string }
        if (this.connected || !handshake || typeof handshake.id !== 'string') return
        const handoff = this.transferring
        if (handoff && this.id !== handshake.id) {
          ws.close(1008, 'Identity changed during handoff')
          return
        }
        this.transferring = false
        this.id = handshake.id
        this.connected = true
        this.attempts = 0
        this.hasConnected = true
        if (!handoff) this.dispatch('connect', [])
        this.pending.splice(0).forEach((value) => ws.send(value))
      } else this.dispatch(frame.event, frame.args)
    })
    ws.addEventListener('error', () => {
      if (this.ws === ws && !this.stopped)
        this.dispatch('connect_error', [new Error('Realtime connection failed')])
    })
    ws.addEventListener('close', () => {
      if (this.ws !== ws || this.stopped) return
      const wasConnected = this.connected || this.transferring
      this.transferring = false
      this.connected = false
      this.id = undefined
      this.roomId = null
      this.pending = []
      if (wasConnected) this.dispatch('disconnect', ['transport close'])
      this.reconnectTimer = setTimeout(
        () => this.open(),
        Math.min(1000 * 2 ** this.attempts++, 10000)
      )
    })
  }
}

export function io(baseUrl = ''): RealtimeSocket {
  return new RealtimeSocket(baseUrl)
}
