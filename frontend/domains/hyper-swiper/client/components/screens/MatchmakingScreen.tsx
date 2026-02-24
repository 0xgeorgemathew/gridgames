'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { AnimatePresence, m } from 'framer-motion'
import { GridScanBackground } from '@/platform/ui/GridScanBackground'
import { usePrivy } from '@privy-io/react-auth'
import { ActionButton } from '@/platform/ui/ActionButton'
import { PlayerName } from '@/platform/ui/PlayerName'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { GameSettingsSelector } from '@/domains/hyper-swiper/client/components/settings/GameSettingsSelector'
import { OnboardingModal } from '@/domains/hyper-swiper/client/components/modals/OnboardingModal'
import { cn } from '@/platform/utils/classNames.utils'

type AuthMatchState = 'login' | 'ready'
type UserMatchState = 'lobby' | 'entering'
type MatchState = AuthMatchState | UserMatchState

interface PlayingAsPanelProps {
  displayName: string | null
  matchState: MatchState
  isInMiniApp: boolean
  miniAppPfpUrl?: string
}

function PlayingAsPanel({
  displayName,
  matchState,
  isInMiniApp,
  miniAppPfpUrl,
}: PlayingAsPanelProps) {
  return (
    <div className="mt-4 min-h-[100px]">
      <AnimatePresence>
        {displayName && matchState !== 'login' && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-2">
              <m.p className="font-[family-name:var(--font-orbitron)] text-tron-cyan/70 text-[9px] tracking-[0.3em] font-medium drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
                PLAYING AS
              </m.p>
            </div>

            <m.div
              className="relative flex flex-row items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {isInMiniApp && miniAppPfpUrl && (
                <div className="relative">
                  <div className="absolute -inset-1 rounded-sm bg-tron-cyan/20 blur-md" />
                  <m.div
                    className="absolute -inset-2 rounded-sm border border-tron-cyan/60 hologram"
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.6, 0.3, 0.6],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <Image
                    src={miniAppPfpUrl}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="relative rounded-sm border-2 border-tron-cyan/80 object-cover"
                  />
                </div>
              )}
              <div className="relative z-10 glass-panel-vibrant px-6 py-2 border border-tron-cyan/30 rounded-sm shadow-[0_0_15px_rgba(0,243,255,0.1)] flex items-center justify-center">
                <PlayerName
                  username={displayName}
                  className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg tracking-[0.1em] text-tron-cyan drop-shadow-[0_0_10px_var(--color-tron-cyan)]"
                />
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

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

    setUserState('entering')

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

      setUserState('entering')
      selectOpponent(opponentSocketId)
    },
    [isConnected, isMatching, walletAddress, selectOpponent]
  )

  if (!ready || miniAppAuthenticating) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        <GridScanBackground
          scanDirection={0} // 0 = away from user.
          scanRange={[2.0, 2.0]} // Lock it exactly at max depth
          scanOpacity={0.0} // Hide entirely
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
      {/* Route Fade Overlay - preserves backdrop filter blurs on children by avoiding opacity animations on them */}
      <m.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="absolute inset-0 z-50 bg-black pointer-events-none"
      />

      <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />

      <GridScanBackground
        scanDirection={matchState === 'entering' ? 1 : 0} // 1 = towards user, 0 = away from user.
        scanRange={matchState === 'entering' ? [0.0, 2.0] : [2.0, 2.0]} // Lock it exactly at max depth
        scanOpacity={matchState === 'entering' ? 0.8 : 0.0} // Hide entirely except on enter
        scanDuration={matchState === 'entering' ? 0.8 : 4.0}
        scanGlow={matchState === 'entering' ? 1.0 : 0.0}
      />

      <div className="fixed inset-0 pointer-events-none z-10 opacity-20">
        <div className="absolute inset-0 tron-grid opacity-30" />
        <m.div
          className="w-full h-[2px] bg-tron-cyan shadow-[0_0_15px_var(--color-tron-cyan)]"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-30 px-4 py-2 font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/80 hover:text-tron-cyan hover:shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all border border-tron-cyan/40 hover:border-tron-cyan hover:bg-tron-cyan/10 rounded-sm bg-tron-black/80 backdrop-blur-md hologram"
      >
        ← BACK
      </button>

      <div className="relative z-20 flex flex-col items-center gap-4 px-4 mt-6 w-full max-w-[400px]">
        <div className="text-center relative">
          <h1 className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-[0.3em] text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] mb-1">
            ENTER THE GRID
          </h1>
          <div className="relative inline-block mb-2">
            <h2 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.3em] text-tron-cyan drop-shadow-[0_0_20px_var(--color-tron-cyan)]">
              HYPER SWIPER
            </h2>
          </div>

          <PlayingAsPanel
            displayName={displayName}
            matchState={matchState}
            isInMiniApp={isInMiniApp}
            miniAppPfpUrl={miniAppUser?.pfpUrl}
          />
        </div>

        {/* We place MatchmakingAuthPanel FIRST so the action buttons are above the subsetting */}
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

        {matchState !== 'login' && matchState !== 'entering' && (
          <GameSettingsSelector
            selectedDuration={selectedGameDuration}
            onDurationChange={setSelectedGameDuration}
            disabled={isMatching}
          />
        )}
      </div>
    </div>
  )
}
