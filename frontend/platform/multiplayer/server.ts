import { parseFrame, type EventListener } from './protocol'

export class ServerSocket {
  connected = true
  readonly rooms = new Set<string>()
  private listeners = new Map<string, EventListener[]>()
  constructor(
    readonly id: string,
    private send: (frame: string) => void
  ) {
    this.rooms.add(id)
  }
  on(event: string, listener: EventListener): this {
    this.listeners.set(event, [...(this.listeners.get(event) || []), listener])
    return this
  }
  emit(event: string, ...args: unknown[]): this {
    this.send(JSON.stringify({ event, args }))
    return this
  }
  join(room: string): void {
    this.rooms.add(room)
  }
  async dispatch(event: string, args: unknown[]): Promise<void> {
    for (const listener of this.listeners.get(event) || []) await listener(...args)
  }
}

export class RealtimeServer {
  private sockets = new Map<string, ServerSocket>()
  private connectionListeners: Array<(socket: ServerSocket) => void> = []
  constructor(
    private beforeEmit?: (target: string | null, event: string, args: unknown[]) => void
  ) {}
  on(event: 'connection', listener: (socket: ServerSocket) => void): void {
    this.connectionListeners.push(listener)
  }
  of(_namespace: '/'): { sockets: Map<string, ServerSocket> } {
    return { sockets: this.sockets }
  }
  connect(id: string, send: (frame: string) => void): ServerSocket {
    const socket = new ServerSocket(id, send)
    this.sockets.set(id, socket)
    this.connectionListeners.forEach((listener) => listener(socket))
    return socket
  }
  async receive(id: string, data: unknown): Promise<void> {
    const frame = parseFrame(data, true)
    const socket = this.sockets.get(id)
    if (!socket) return
    if (!frame) {
      socket.emit('error', { message: 'Invalid event frame' })
      return
    }
    // Handlers with destructured payloads must never receive null or primitives.
    if (
      frame.args.length &&
      (!frame.args[0] || typeof frame.args[0] !== 'object' || Array.isArray(frame.args[0]))
    ) {
      socket.emit('error', { message: 'Invalid event payload' })
      return
    }
    try {
      await socket.dispatch(frame.event, frame.args)
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'handler_failed',
          name: frame.event,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      )
      socket.emit('error', { message: 'Unable to process event' })
    }
  }
  async disconnect(id: string): Promise<void> {
    const socket = this.sockets.get(id)
    if (!socket) return
    this.sockets.delete(id)
    socket.connected = false
    await socket.dispatch('disconnect', [])
  }
  emit(event: string, ...args: unknown[]): void {
    this.broadcast(null, event, args)
  }
  to(target: string): { emit: (event: string, ...args: unknown[]) => void } {
    return { emit: (event, ...args) => this.broadcast(target, event, args) }
  }
  private broadcast(target: string | null, event: string, args: unknown[]): void {
    this.beforeEmit?.(target, event, args)
    for (const socket of this.sockets.values()) {
      if (target === null || socket.rooms.has(target)) socket.emit(event, ...args)
    }
  }
}
