'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { GameCanvasBackground } from '@/platform/ui/GameCanvasBackground'
import { usePrivy } from '@privy-io/react-auth'
import { PlayerName } from '@/platform/ui/PlayerName'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { GameSettingsSelector } from '@/domains/hyper-swiper/client/components/settings/GameSettingsSelector'
import { OnboardingModal } from '@/domains/hyper-swiper/client/components/modals/OnboardingModal'

type AuthMatchState = 'login' | 'ready'
type UserMatchState = 'lobby'
type MatchState = AuthMatchState | UserMatchState | 'entering'

interface MatchmakingAuthPanelProps {
  matchState: MatchState
  isInMiniApp: boolean
  isConnected: boolean
  isMatching: boolean
  isRefreshingLobby: boolean
  selectedGameDuration: number
  onDurationChange: (duration: number) => void
  lobbyPlayers: Array<{ socketId: string; name: string; gameDuration: number }>
  onEnter: () => void
  onOpenLobby: () => void
  onBackFromLobby: () => void
  onRefreshLobby: () => void
  onSelectOpponent: (opponentSocketId: string) => void
}

function MatchmakingAuthPanel({
  matchState,
  isInMiniApp,
  isConnected,
  isMatching,
  isRefreshingLobby,
  selectedGameDuration,
  onDurationChange,
  lobbyPlayers,
  onEnter,
  onOpenLobby,
  onBackFromLobby,
  onRefreshLobby,
  onSelectOpponent,
}: MatchmakingAuthPanelProps) {
  const formatDuration = (ms: number) => `${ms / 60000}MIN`

  return (
    <section className="hyper-lobby__panel arena-panel">
      <div className="hyper-lobby__status">
        <span className="arena-label">
          <i className="hyper-lobby__dot" />
          {isConnected ? 'Arena online' : 'Connecting'}
        </span>
        <span className="arena-label">500× leverage</span>
      </div>
      {matchState === 'login' && (
        <p className="arena-meta">
          {isInMiniApp ? 'Connecting your mini app…' : 'Verifying your credentials…'}
        </p>
      )}
      {matchState === 'ready' && (
        <div className="flex flex-col gap-3">
          <button
            className="arena-button arena-button--primary w-full"
            onClick={onEnter}
            disabled={!isConnected || isMatching}
          >
            {isMatching ? 'ENTERING ARENA…' : 'FIND A RIVAL ↗'}
          </button>
          <button className="arena-button w-full" onClick={onOpenLobby} disabled={!isConnected}>
            CHOOSE YOUR OPPONENT
          </button>
          <div className="arena-label mt-4 mb-1">Round length</div>
          <GameSettingsSelector
            selectedDuration={selectedGameDuration}
            onDurationChange={onDurationChange}
            disabled={isMatching}
          />
        </div>
      )}
      {matchState === 'entering' && (
        <div className="text-center py-3">
          <div className="hyper-pending-orbit" aria-hidden="true">
            <span className="text-3xl">↗</span>
          </div>
          <h2 className="text-xl font-bold mt-6">Finding your rival.</h2>
          <p className="arena-meta mt-2">
            Waiting for another real player in Hyper Swiper with a {selectedGameDuration / 60000}
            -minute round. Both players must choose the same game and round length.
          </p>
        </div>
      )}
      {matchState === 'lobby' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <button className="arena-button" onClick={onBackFromLobby}>
              ← BACK
            </button>
            <span className="arena-label">{lobbyPlayers.length} rivals</span>
          </div>
          {lobbyPlayers.length === 0 ? (
            <div className="py-8">
              <h2 className="text-xl font-bold">The floor is yours.</h2>
              <p className="arena-meta mt-2">No rivals are waiting yet. Refresh to check again.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {lobbyPlayers.map((player) => (
                <button
                  key={player.socketId}
                  onClick={() => onSelectOpponent(player.socketId)}
                  disabled={isMatching}
                  className="arena-button flex items-center justify-between gap-3 text-left"
                >
                  <PlayerName username={player.name} className="truncate" />
                  <span
                    className="arena-label shrink-0"
                    style={{
                      color:
                        player.gameDuration === selectedGameDuration
                          ? 'var(--arena-long)'
                          : 'var(--arena-muted)',
                    }}
                  >
                    {formatDuration(player.gameDuration)} ↗
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            className="arena-button"
            onClick={onRefreshLobby}
            disabled={isMatching || isRefreshingLobby}
          >
            {isRefreshingLobby ? 'REFRESHING…' : 'REFRESH RIVALS'}
          </button>
        </div>
      )}
    </section>
  )
}

export function MatchmakingScreen() {
  const router = useRouter()
  const { ready, authenticated, user } = usePrivy()
  const {
    isInMiniApp,
    user: miniAppUser,
    walletAddress: miniAppWallet,
    isConnected: miniAppConnected,
    isAuthenticating: miniAppAuthenticating,
  } = useBaseMiniAppAuth()
  const {
    isConnected,
    isMatching,
    findMatch,
    lobbyPlayers,
    isRefreshingLobby,
    getLobbyPlayers,
    joinWaitingPool,
    leaveWaitingPool,
    selectOpponent,
    selectedGameDuration,
    setSelectedGameDuration,
  } = useTradingStore()

  const [userState, setUserState] = useState<UserMatchState | null>(null)

  const walletAddress = isInMiniApp ? miniAppWallet : user?.wallet?.address

  const displayName = useMemo(() => {
    if (isInMiniApp) {
      if (miniAppUser?.username) return miniAppUser.username
      if (miniAppUser?.fid) return `fid:${miniAppUser.fid}`
      if (miniAppWallet) return 'Grid Runner'
      return null
    }

    const googleName = (user as { google?: { name?: string } } | null)?.google?.name
    if (googleName) return googleName
    if (user?.wallet?.address) return 'Grid Runner'
    return null
  }, [isInMiniApp, miniAppUser, miniAppWallet, user])

  const authState = useMemo((): AuthMatchState => {
    if (isInMiniApp) {
      if (miniAppConnected && miniAppUser) {
        return 'ready'
      }
      return 'login'
    }

    if (authenticated && user?.wallet) {
      return 'ready'
    }
    return 'login'
  }, [isInMiniApp, miniAppConnected, miniAppUser, authenticated, user?.wallet])

  // Waiting belongs to the live request, not a local state that outlives an error.
  const matchState: MatchState =
    authState === 'login' ? 'login' : isMatching ? 'entering' : userState || authState

  useEffect(() => {
    const shouldRedirectMiniApp =
      isInMiniApp && !miniAppAuthenticating && !miniAppConnected && !miniAppUser
    const shouldRedirectWeb = !isInMiniApp && ready && !authenticated

    if (shouldRedirectMiniApp || shouldRedirectWeb) {
      window.location.href = '/'
    }
  }, [
    isInMiniApp,
    miniAppAuthenticating,
    miniAppConnected,
    miniAppUser,
    ready,
    authenticated,
    router,
  ])

  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('hyper_swiper_onboarded')
    if (!hasOnboarded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(true)
    }
  }, [])

  const handleCloseOnboarding = useCallback(() => {
    localStorage.setItem('hyper_swiper_onboarded', 'true')
    setShowOnboarding(false)
  }, [])

  useEffect(() => {
    if (matchState !== 'lobby') return
    if (displayName && walletAddress) {
      joinWaitingPool(displayName, walletAddress)
    }
    getLobbyPlayers()
  }, [matchState, joinWaitingPool, getLobbyPlayers, displayName, walletAddress])

  const handleEnter = useCallback(() => {
    if (!isConnected || isMatching || !walletAddress) return

    if (
      typeof window !== 'undefined' &&
      (window as { phaserEvents?: { emit: (event: string) => void } }).phaserEvents
    ) {
      ;(window as { phaserEvents?: { emit: (event: string) => void } }).phaserEvents?.emit(
        'unlock_audio'
      )
    }

    findMatch(displayName || 'Grid Runner', walletAddress)
  }, [displayName, findMatch, isConnected, isMatching, walletAddress])

  const handleSelectOpponent = useCallback(
    (opponentSocketId: string) => {
      if (!isConnected || isMatching || !walletAddress) return

      selectOpponent(opponentSocketId)
    },
    [isConnected, isMatching, walletAddress, selectOpponent]
  )

  if (!ready || miniAppAuthenticating) {
    return (
      <div className="hyper-lobby justify-center">
        <GameCanvasBackground />
        <div className="relative z-10 text-center">
          <div className="hyper-pending-orbit" />
          <p className="arena-label">
            {miniAppAuthenticating ? 'Authenticating…' : 'Preparing the arena…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="hyper-lobby">
      <GameCanvasBackground />
      <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />
      <div
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 gap-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <button onClick={() => router.push('/')} className="arena-button">
          ← ARCADE
        </button>
        {displayName && matchState !== 'login' && (
          <div className="arena-panel px-3 py-2">
            <UserProfileBadge
              displayName={displayName}
              pfpUrl={isInMiniApp ? miniAppUser?.pfpUrl : null}
              compact={true}
            />
          </div>
        )}
      </div>
      <header className="hyper-lobby__hero">
        <p className="arena-label">Grid Games / Orbital trading arena</p>
        <h1 className="arena-display">
          HYPER
          <br />
          <span>SWIPER.</span>
        </h1>
        <p className="hyper-lobby__intro">
          Read the market. Cut your position.
          <br />
          One rival. Every swipe counts.
        </p>
        <div className="hyper-direction-key">
          <span>↗ LONG / MINT</span>
          <span>↘ SHORT / CORAL</span>
        </div>
      </header>
      <MatchmakingAuthPanel
        matchState={matchState}
        isInMiniApp={isInMiniApp}
        isConnected={isConnected}
        isMatching={isMatching}
        isRefreshingLobby={isRefreshingLobby}
        selectedGameDuration={selectedGameDuration}
        onDurationChange={setSelectedGameDuration}
        lobbyPlayers={lobbyPlayers}
        onEnter={handleEnter}
        onOpenLobby={() => {
          getLobbyPlayers()
          setUserState('lobby')
        }}
        onBackFromLobby={() => {
          leaveWaitingPool()
          setUserState(null)
        }}
        onRefreshLobby={getLobbyPlayers}
        onSelectOpponent={handleSelectOpponent}
      />
    </div>
  )
}
