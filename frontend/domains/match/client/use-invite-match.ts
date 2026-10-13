import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { RealtimeSocket } from '@/platform/multiplayer/client'
import { buildInviteUrl, type InviteGameSlug } from '../invites'
import { InviteSession } from './invite-session'

export function useInviteMatch({
  socket,
  gameSlug,
  gameDuration,
  playerName,
  walletAddress,
}: {
  socket: RealtimeSocket | null
  gameSlug: InviteGameSlug
  gameDuration: number
  playerName: string
  walletAddress?: string
}) {
  const from = `/${gameSlug}` as const
  const navigate = useNavigate({ from })
  const { invite: incoming } = useSearch({ from })
  const session = useMemo(() => new InviteSession(socket, gameSlug), [socket, gameSlug])
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  const clearSearch = useCallback(() => {
    void navigate({ replace: true, search: (previous) => ({ ...previous, invite: undefined }) })
  }, [navigate])
  useEffect(() => session.attach(clearSearch), [session, clearSearch])
  const player = () => ({
    playerName,
    walletAddress,
    gameSlug,
    gameDuration,
    sceneWidth: window.sceneDimensions?.width || window.innerWidth,
    sceneHeight: window.sceneDimensions?.height || window.innerHeight,
  })
  return {
    state,
    incoming,
    active: incoming !== undefined || state.status !== 'idle',
    link: state.invite ? buildInviteUrl(window.location.origin, state.invite) : '',
    create: () => session.create(player()),
    join: () => {
      if (incoming !== undefined) session.join(incoming, player())
    },
    cancel: () => {
      session.cancel()
      clearSearch()
    },
  }
}
