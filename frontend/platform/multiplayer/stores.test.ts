import { expect, test } from 'bun:test'
class Socket extends EventTarget {
  static all: Socket[] = []
  readyState = 1
  constructor(readonly url: string) {
    super()
    Socket.all.push(this)
  }
  send() {}
  close() {
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }
  frame(event: string, ...args: unknown[]) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ event, args }) }))
  }
}
test.each(['hyper-swiper', 'tap-dancer'] as const)(
  '%s store clears partial abort and failure, protects completed and newer matches',
  async (game) => {
    const previousWS = globalThis.WebSocket,
      previousWindow = globalThis.window,
      previousStorage = globalThis.localStorage
    globalThis.WebSocket = Socket as unknown as typeof WebSocket
    globalThis.window = {
      location: { origin: 'https://example.com' },
      innerWidth: 500,
      innerHeight: 800,
    } as any
    globalThis.localStorage = { getItem: () => null, setItem: () => {} } as any
    const module =
      game === 'hyper-swiper'
        ? await import('@/domains/hyper-swiper/client/state/slices')
        : await import('@/domains/tap-dancer/client/state/slices')
    const store =
      module.useTradingStore as unknown as typeof import('@/domains/hyper-swiper/client/state/slices').useTradingStore
    const addToast = store.getState().addToast
    store.setState({ addToast: () => {} })
    try {
      store.getState().connect()
      const lobby = Socket.all.at(-1)!
      lobby.frame('connect', { id: 'seat' })
      store.getState().findMatch('A')
      expect(store.getState().isMatching).toBe(true)
      lobby.frame('transport_handoff', { path: '/api/socket/room/pending?ticket=opaque' })
      const room = Socket.all.at(-1)!
      room.frame('connect', { id: 'seat' })
      room.frame('match_aborted', { matchId: 'pending', reason: 'join_timeout' })
      expect(store.getState().isMatching).toBe(false)
      expect(store.getState().localPlayerId).toBe('seat')
      expect(store.getState().socket?.connected).toBe(true)
      room.frame('transport_handoff', { path: '/api/socket?return=opaque' })
      const returned = Socket.all.at(-1)!
      returned.frame('connect', { id: 'seat' })
      store.getState().findMatch('A')
      returned.frame('error', { code: 'MATCH_START_FAILED', message: 'Match failed' })
      expect(store.getState().isMatching).toBe(false)
      store.getState().findMatch('A')
      returned.frame('transport_handoff', { path: '/api/socket/room/newer?ticket=opaque' })
      const newer = Socket.all.at(-1)!
      newer.frame('connect', { id: 'seat' })
      newer.frame('match_aborted', { matchId: 'pending', reason: 'late_old_abort' })
      expect(store.getState().isMatching).toBe(true)
      newer.frame('match_found', {
        roomId: 'newer',
        players: [
          { id: 'seat', name: 'A', dollars: 10 },
          { id: 'other', name: 'B', dollars: 10 },
        ],
      })
      newer.frame('game_over', {
        winnerId: 'seat',
        winnerName: 'A',
        reason: 'forfeit',
        playerResults: [],
      })
      const result = store.getState().gameOverData
      newer.frame('match_aborted', { matchId: 'newer', reason: 'late_terminal_abort' })
      expect(store.getState().isGameOver).toBe(true)
      expect(store.getState().gameOverData).toBe(result)
    } finally {
      store.getState().disconnect()
      store.setState({ addToast, isGameOver: false, gameOverData: null })
      globalThis.WebSocket = previousWS
      globalThis.window = previousWindow
      globalThis.localStorage = previousStorage
    }
  }
)
