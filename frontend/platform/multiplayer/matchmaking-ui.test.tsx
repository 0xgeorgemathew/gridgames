import { expect, mock, test } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// No external identity provider is called. Screens consume real game store events.
let signedIn = true
mock.module('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: signedIn,
    user: signedIn ? { wallet: { address: 'test-wallet' } } : null,
  }),
}))
mock.module('next/navigation', () => ({ useRouter: () => ({ push() {} }) }))
mock.module('@/platform/auth/mini-app.hook', () => ({
  useBaseMiniAppAuth: () => ({ isInMiniApp: false, isAuthenticating: false }),
}))
mock.module('@/platform/ui/UserProfileBadge', () => ({ UserProfileBadge: () => null }))
mock.module('@/platform/ui/PlayerName', () => ({
  PlayerName: ({ username }: { username: string }) => <span>{username}</span>,
}))
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
  '%s waiting screen follows requests and recovery events',
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
    const store = module.useTradingStore as unknown as typeof import('@/domains/hyper-swiper/client/state/slices').useTradingStore
    // SSR normally reads Zustand's initial snapshot. Read the current real store for each event snapshot.
    mock.module(`@/domains/${game}/client/state/trading.store`, () => ({
      useTradingStore: () => store.getState(),
    }))
    const { MatchmakingScreen } =
      game === 'hyper-swiper'
        ? await import('@/domains/hyper-swiper/client/components/screens/MatchmakingScreen')
        : await import('@/domains/tap-dancer/client/components/screens/MatchmakingScreen')
    const readyLabel = game === 'hyper-swiper' ? 'FIND A RIVAL' : 'FIND A MATCH'
    const waitingLabel = game === 'hyper-swiper' ? 'Finding your rival.' : 'FINDING YOUR RIVAL'
    const render = () => renderToStaticMarkup(<MatchmakingScreen />)
    const addToast = store.getState().addToast
    store.setState({ addToast: () => {} })
    try {
      store.getState().connect()
      const socket = Socket.all.at(-1)!
      socket.frame('connect', { id: 'seat' })
      expect(render()).toContain(readyLabel)
      store.getState().findMatch('Diagnostic')
      expect(store.getState().isMatching).toBe(true)
      expect(render()).toContain(waitingLabel)
      expect(render()).toContain('same game and round length')
      socket.frame('waiting_for_match')
      expect(render()).toContain(waitingLabel)
      socket.frame('error', { code: 'MATCH_START_FAILED', message: 'Failed to start' })
      expect(store.getState().isMatching).toBe(false)
      expect(render()).toContain(readyLabel)
      expect(render()).not.toContain(waitingLabel)
      store.getState().findMatch('Diagnostic')
      socket.frame('transport_handoff', { path: '/api/socket/room/pending?ticket=opaque' })
      const room = Socket.all.at(-1)!
      room.frame('connect', { id: 'seat' })
      room.frame('match_aborted', { matchId: 'pending', reason: 'join_timeout' })
      expect(render()).toContain(readyLabel)
      room.frame('transport_handoff', { path: '/api/socket?return=opaque' })
      const returned = Socket.all.at(-1)!
      returned.frame('connect', { id: 'seat' })
      store.getState().findMatch('Diagnostic')
      returned.close()
      expect(store.getState().isMatching).toBe(false)
      expect(render()).not.toContain(waitingLabel)
      signedIn = false
      expect(render()).not.toContain(readyLabel)
    } finally {
      signedIn = true
      store.getState().disconnect()
      store.setState({ addToast })
      globalThis.WebSocket = previousWS
      globalThis.window = previousWindow
      globalThis.localStorage = previousStorage
    }
  }
)
