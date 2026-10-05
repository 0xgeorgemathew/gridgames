'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { AnimatePresence, m } from 'framer-motion'
import styles from '../stage.module.css'
import { usePrivy } from '@privy-io/react-auth'
import { StageButton as ActionButton } from '../StageButton'
import { PlayerName } from '@/platform/ui/PlayerName'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { cn } from '@/platform/utils/classNames.utils'
import { OnboardingModal } from '@/domains/tap-dancer/client/components/modals/OnboardingModal'
import { GameSettingsSelector } from '@/domains/tap-dancer/client/components/settings/GameSettingsSelector'

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
    <div className="flex flex-col items-center w-full">
      <div className="min-h-[200px] w-full max-w-md">
        {matchState === 'login' && (
          <div key="login" className="flex flex-col items-center gap-4">
            <p className="font-mono text-[var(--arena-accent)]/80 text-sm tracking-[0.2em] ">
              {isInMiniApp ? 'CONNECTING TO GRID...' : 'VERIFYING CREDENTIALS...'}
            </p>
          </div>
        )}

        {matchState === 'ready' && (
          <div key="ready" className="flex flex-col items-center gap-3">
            <p className="font-mono text-[var(--arena-accent)] text-xs tracking-[0.2em]">
              READY TO PLAY
            </p>

            <div className="flex flex-col gap-2 w-full min-w-[200px]">
              <ActionButton onClick={onEnter} disabled={!isConnected || isMatching} color="cyan">
                {isMatching ? 'ENTERING...' : 'FIND A MATCH'}
              </ActionButton>
              <ActionButton onClick={onOpenLobby} disabled={!isConnected} color="cyan">
                SELECT OPPONENT
              </ActionButton>
            </div>
            <GameSettingsSelector
              selectedDuration={selectedGameDuration}
              onDurationChange={onDurationChange}
              disabled={isMatching}
            />
          </div>
        )}

        {matchState === 'entering' && (
          <div key="entering" className="flex flex-col items-center gap-3">
            <p className="font-mono text-[var(--arena-accent)] text-xs tracking-[0.2em] ">
              FINDING YOUR RIVAL...
            </p>
          </div>
        )}

        {matchState === 'lobby' && (
          <div key="lobby" className="flex flex-col items-center gap-4 w-full max-w-md">
            <button
              onClick={onBackFromLobby}
              className="font-mono text-[var(--arena-accent)]/60 hover:text-[var(--arena-accent)] transition-colors text-xs tracking-[0.2em] mb-2"
            >
              ← BACK
            </button>

            <p className="font-mono text-[var(--arena-accent)]/80 text-[10px] tracking-[0.3em]">
              CHOOSE YOUR OPPONENT
            </p>

            {lobbyPlayers.length === 0 ? (
              <p className="font-mono text-[var(--arena-accent)]/50 text-xs tracking-[0.1em] mt-4 mb-4">
                No players waiting. Try auto-match.
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
                          'relative px-4 py-3 bg-[var(--arena-panel)]/80 border rounded-sm overflow-hidden min-w-[200px]  group transition-all duration-300',
                          hasMatchingSettings
                            ? 'border-[var(--arena-line)]/50 hover:border-[var(--arena-line)] hover:bg-white/5'
                            : 'border-[var(--arena-line)]/20 hover:border-[var(--arena-line)]/40 opacity-70'
                        )}
                      >
                        <div className="relative z-10 flex flex-col items-center gap-1">
                          <PlayerName
                            username={player.name}
                            className="font-mono text-sm tracking-[0.1em] text-[var(--arena-accent)] group-hover:text-white transition-colors"
                          />
                          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] font-mono">
                            <span
                              className={
                                hasMatchingSettings ? 'text-[var(--arena-accent)]' : 'text-[var(--arena-accent)]/50'
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
    setSelectedGameDuration,
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
      <div className="min-h-[100dvh] relative flex items-center justify-center overflow-hidden">
        <m.p
          className="relative z-20 font-mono text-[var(--arena-accent)] tracking-[0.3em] font-medium"
        >
          {miniAppAuthenticating ? 'AUTHENTICATING...' : 'INITIALIZING...'}
        </m.p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center overflow-x-hidden">
      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />

      <m.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-0 z-50 bg-black pointer-events-none"
      />

      <div className="fixed top-0 left-0 right-0 z-30 flex items-start justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pointer-events-none">
        <button
          onClick={() => router.push('/')}
          className="pointer-events-auto px-4 py-2 font-mono text-xs tracking-[0.2em] text-[var(--arena-accent)]/80 hover:text-[var(--arena-accent)] transition-all border border-[var(--arena-line)]/40 hover:border-[var(--arena-line)] hover:bg-white/5 rounded-sm bg-[var(--arena-panel)]/80 backdrop-blur-md "
        >
          ← BACK
        </button>

        <AnimatePresence>
          {displayName && matchState !== 'login' && (
            <div className="pointer-events-auto arena-panel px-3 py-2 border border-[var(--arena-line)]/30 rounded-sm bg-[var(--arena-panel)]/80 backdrop-blur-md">
              <UserProfileBadge
                displayName={displayName}
                pfpUrl={isInMiniApp ? miniAppUser?.pfpUrl : null}
                compact={true}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.lobby}>
        <div className={styles.lobbyTitle}>
          <span className="arena-label">Head-to-head market arcade</span>
          <h1 className={styles.title}>TAP<br /><span>DANCER</span></h1>
          <p>Read the market. Pick a side.<br />Make every move count.</p>
          <div className={styles.padPreview} aria-hidden="true">
            <div><span>↑</span><strong>LONG</strong></div>
            <div><span>↓</span><strong>SHORT</strong></div>
          </div>
        </div>

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
    </div>
  )
}
