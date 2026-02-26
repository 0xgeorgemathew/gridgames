'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { AnimatePresence, m } from 'framer-motion'
import { GridScanBackground } from '@/platform/ui/GridScanBackground'
import { usePrivy } from '@privy-io/react-auth'
import { ActionButton } from '@/platform/ui/ActionButton'
import { PlayerName } from '@/platform/ui/PlayerName'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { cn } from '@/platform/utils/classNames.utils'
import { OnboardingModal } from '@/domains/tap-dancer/client/components/modals/OnboardingModal'

type AuthMatchState = 'login' | 'ready'
type UserMatchState = 'lobby' | 'entering'
type MatchState = AuthMatchState | UserMatchState

interface MatchmakingAuthPanelProps {
  matchState: MatchState
  isInMiniApp: boolean
  isConnected: boolean
  isMatching: boolean
  isRefreshingLobby: boolean
  selectedGameDuration: number
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
  lobbyPlayers,
  onEnter,
  onOpenLobby,
  onBackFromLobby,
  onRefreshLobby,
  onSelectOpponent,
}: MatchmakingAuthPanelProps) {
  const formatDuration = (ms: number) => `${ms / 60000}MIN`

  return (
    <div className="flex flex-col items-center">
      <div className="min-h-[200px] w-full max-w-md">
        {matchState === 'login' && (
          <div key="login" className="flex flex-col items-center gap-4">
            <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan/80 text-sm tracking-[0.2em] animate-pulse">
              {isInMiniApp ? 'CONNECTING TO GRID...' : 'VERIFYING CREDENTIALS...'}
            </p>
          </div>
        )}

        {matchState === 'ready' && (
          <div key="ready" className="flex flex-col items-center gap-3">
            <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan text-xs tracking-[0.2em] drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
              SYSTEM READY
            </p>

            <div className="flex flex-col gap-2 w-full min-w-[200px]">
              <ActionButton onClick={onEnter} disabled={!isConnected || isMatching} color="cyan">
                {isMatching ? 'ENTERING...' : 'AUTO-MATCH'}
              </ActionButton>
              <ActionButton onClick={onOpenLobby} disabled={!isConnected} color="cyan">
                SELECT OPPONENT
              </ActionButton>
            </div>
          </div>
        )}

        {matchState === 'entering' && (
          <div key="entering" className="flex flex-col items-center gap-3">
            <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan text-xs tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
              SEARCHING GRID...
            </p>
          </div>
        )}

        {matchState === 'lobby' && (
          <div key="lobby" className="flex flex-col items-center gap-4 w-full max-w-md">
            <button
              onClick={onBackFromLobby}
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan/60 hover:text-tron-cyan transition-colors text-xs tracking-[0.2em] mb-2"
            >
              ← BACK
            </button>

            <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan/80 text-[10px] tracking-[0.3em] drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
              AVAILABLE TARGETS
            </p>

            {lobbyPlayers.length === 0 ? (
              <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan/50 text-xs tracking-[0.1em] mt-4 mb-4">
                GRID EMPTY
              </p>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <AnimatePresence mode="popLayout">
                  {lobbyPlayers.map((player) => {
                    const hasMatchingSettings = player.gameDuration === selectedGameDuration

                    return (
                      <m.button
                        key={player.socketId}
                        onClick={() => onSelectOpponent(player.socketId)}
                        disabled={isMatching}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'relative px-4 py-3 bg-tron-black/80 border rounded-sm overflow-hidden min-w-[200px] hologram group transition-all duration-300',
                          hasMatchingSettings
                            ? 'border-tron-cyan/50 hover:border-tron-cyan hover:bg-tron-cyan/10 shadow-[0_0_10px_rgba(0,243,255,0.1)] hover:shadow-[0_0_20px_rgba(0,243,255,0.3)]'
                            : 'border-tron-cyan/20 hover:border-tron-cyan/40 opacity-70'
                        )}
                      >
                        <div className="relative z-10 flex flex-col items-center gap-1">
                          <PlayerName
                            username={player.name}
                            className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.1em] text-tron-cyan group-hover:text-white transition-colors"
                          />
                          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] font-mono">
                            <span
                              className={
                                hasMatchingSettings ? 'text-tron-cyan' : 'text-tron-cyan/50'
                              }
                            >
                              {formatDuration(player.gameDuration)}
                            </span>
                          </div>
                        </div>
                      </m.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}

            <ActionButton
              onClick={onRefreshLobby}
              isLoading={isRefreshingLobby}
              disabled={isMatching}
              color="cyan"
            >
              REFRESH
            </ActionButton>
          </div>
        )}
      </div>
    </div>
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
  } = useTradingStore()

  const [userState, setUserState] = useState<UserMatchState | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Only check localStorage on client-side
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('tap_dancer_onboarded')
  })

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

  const matchState = userState || authState

  useEffect(() => {
    const shouldRedirectMiniApp =
      isInMiniApp && !miniAppAuthenticating && !miniAppConnected && !miniAppUser
    const shouldRedirectWeb = !isInMiniApp && ready && !authenticated

    if (shouldRedirectMiniApp || shouldRedirectWeb) {
      router.push('/')
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

  const handleCloseOnboarding = useCallback(() => {
    localStorage.setItem('tap_dancer_onboarded', 'true')
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

    setUserState('entering')

    findMatch(displayName || 'Grid Runner', walletAddress)
  }, [displayName, findMatch, isConnected, isMatching, walletAddress])

  const handleSelectOpponent = useCallback(
    (opponentSocketId: string) => {
      if (!isConnected || isMatching || !walletAddress) return

      setUserState('entering')
      selectOpponent(opponentSocketId)
    },
    [isConnected, isMatching, walletAddress, selectOpponent]
  )

  if (!ready || miniAppAuthenticating) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        <GridScanBackground
          scanDirection={0}
          scanRange={[2.0, 2.0]}
          scanOpacity={0.0}
          scanDuration={4.0}
          scanGlow={0.0}
        />
        <m.p
          className="relative z-20 font-[family-name:var(--font-orbitron)] text-tron-cyan tracking-[0.3em] font-medium drop-shadow-[0_0_10px_var(--color-tron-cyan)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {miniAppAuthenticating ? 'AUTHENTICATING...' : 'INITIALIZING...'}
        </m.p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black">
      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />

      <m.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-0 z-50 bg-black pointer-events-none"
      />

      <GridScanBackground
        scanDirection={matchState === 'entering' ? 1 : 0}
        scanRange={matchState === 'entering' ? [0.0, 2.0] : [2.0, 2.0]}
        scanOpacity={matchState === 'entering' ? 0.8 : 0.0}
        scanDuration={matchState === 'entering' ? 0.8 : 4.0}
        scanGlow={matchState === 'entering' ? 1.0 : 0.0}
      />

      <div className="fixed top-0 left-0 right-0 z-30 flex items-start justify-between px-4 pt-4 pointer-events-none">
        <button
          onClick={() => router.push('/')}
          className="pointer-events-auto px-4 py-2 font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/80 hover:text-tron-cyan hover:shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all border border-tron-cyan/40 hover:border-tron-cyan hover:bg-tron-cyan/10 rounded-sm bg-tron-black/80 backdrop-blur-md hologram"
        >
          ← BACK
        </button>

        <AnimatePresence>
          {displayName && matchState !== 'login' && (
            <div className="pointer-events-auto glass-panel-vibrant px-3 py-2 border border-tron-cyan/30 rounded-sm shadow-[0_0_15px_rgba(0,243,255,0.1)] bg-tron-black/80 backdrop-blur-md">
              <UserProfileBadge
                displayName={displayName}
                pfpUrl={isInMiniApp ? miniAppUser?.pfpUrl : null}
                compact={true}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-20 flex flex-col items-center gap-4 px-4 mt-16 w-full max-w-[400px]">
        <div className="text-center relative">
          <h1 className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-[0.3em] text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] mb-1">
            ENTER THE GRID
          </h1>
          <div className="relative inline-block mb-4">
            <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.3em] text-tron-cyan drop-shadow-[0_0_20px_var(--color-tron-cyan)]">
              TAPDANCER
            </h2>
          </div>
        </div>

        <MatchmakingAuthPanel
          matchState={matchState}
          isInMiniApp={isInMiniApp}
          isConnected={isConnected}
          isMatching={isMatching}
          isRefreshingLobby={isRefreshingLobby}
          selectedGameDuration={selectedGameDuration}
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
    </div>
  )
}
