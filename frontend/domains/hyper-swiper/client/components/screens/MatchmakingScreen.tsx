'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { AnimatePresence, m } from 'framer-motion'
import { GridScanBackground } from '@/platform/ui/GridScanBackground'
import { usePrivy } from '@privy-io/react-auth'
import { ActionButton } from '@/platform/ui/ActionButton'
import { PlayerName } from '@/platform/ui/PlayerName'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { GameSettingsSelector } from '@/domains/hyper-swiper/client/components/settings/GameSettingsSelector'
import { OnboardingModal } from '@/domains/hyper-swiper/client/components/modals/OnboardingModal'
import { cn } from '@/platform/utils/classNames.utils'

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
    <div className="flex flex-col items-center">
      <div className="min-h-[200px] w-full max-w-md">
        {matchState === 'login' && (
          <div key="login" className="flex flex-col items-center gap-4">
            <m.p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan/80 text-sm tracking-[0.2em]"
              animate={{
                opacity: [0.5, 1, 0.5],
                textShadow: [
                  '0 0 10px rgba(0, 243, 255, 0.3)',
                  '0 0 20px rgba(0, 243, 255, 0.6)',
                  '0 0 10px rgba(0, 243, 255, 0.3)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {isInMiniApp ? 'CONNECTING TO GRID...' : 'VERIFYING CREDENTIALS...'}
            </m.p>
          </div>
        )}

        {matchState === 'ready' && (
          <m.div
            key="ready"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan text-xs tracking-[0.2em]"
              style={{ textShadow: '0 0 15px rgba(0, 243, 255, 0.6)' }}
            >
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
            <GameSettingsSelector
              selectedDuration={selectedGameDuration}
              onDurationChange={onDurationChange}
              disabled={isMatching}
            />
          </m.div>
        )}

        {matchState === 'entering' && (
          <div key="entering" className="flex flex-col items-center gap-3">
            <m.p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan text-xs tracking-[0.2em]"
              animate={{
                opacity: [0.6, 1, 0.6],
                textShadow: [
                  '0 0 10px rgba(0, 243, 255, 0.4)',
                  '0 0 25px rgba(0, 243, 255, 0.8)',
                  '0 0 10px rgba(0, 243, 255, 0.4)',
                ],
              }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              SEARCHING GRID...
            </m.p>
            {/* Loading dots animation */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <m.div
                  key={i}
                  className="w-2 h-2 bg-tron-cyan rounded-full"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{ boxShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}
                />
              ))}
            </div>
          </div>
        )}

        {matchState === 'lobby' && (
          <m.div
            key="lobby"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-md"
          >
            <button
              onClick={onBackFromLobby}
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan/60 hover:text-tron-cyan transition-colors text-xs tracking-[0.2em] mb-2"
              style={{ textShadow: '0 0 8px rgba(0, 243, 255, 0.3)' }}
            >
              ← BACK
            </button>

            <p
              className="font-[family-name:var(--font-orbitron)] text-tron-cyan/80 text-[10px] tracking-[0.3em]"
              style={{ textShadow: '0 0 15px rgba(0, 243, 255, 0.5)' }}
            >
              AVAILABLE TARGETS
            </p>

            {lobbyPlayers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <p
                  className="font-[family-name:var(--font-orbitron)] text-tron-cyan/50 text-xs tracking-[0.1em]"
                  style={{ textShadow: '0 0 8px rgba(0, 243, 255, 0.2)' }}
                >
                  GRID EMPTY
                </p>
                <div className="w-16 h-[1px] bg-tron-cyan/20" />
                <p className="text-[10px] text-white/30 tracking-widest">NO PLAYERS DETECTED</p>
              </div>
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
                          'relative px-4 py-3 bg-tron-black/80 border rounded-sm overflow-hidden min-w-[200px] group transition-all duration-300',
                          hasMatchingSettings
                            ? 'border-tron-cyan/50 hover:border-tron-cyan hover:bg-tron-cyan/10'
                            : 'border-tron-cyan/20 hover:border-tron-cyan/40 opacity-70'
                        )}
                      >
                        {/* Corner accents */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />

                        {/* Grid background */}
                        <div className="absolute inset-0 opacity-[0.04] tron-grid pointer-events-none" />

                        {/* Hover glow */}
                        <m.div
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          animate={{
                            boxShadow: hasMatchingSettings
                              ? '0 0 20px rgba(0, 243, 255, 0.2)'
                              : '0 0 10px rgba(0, 243, 255, 0.1)',
                          }}
                        />

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
                              style={{
                                textShadow: hasMatchingSettings
                                  ? '0 0 8px rgba(0, 243, 255, 0.4)'
                                  : 'none',
                              }}
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
          </m.div>
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
          className="relative z-20 font-[family-name:var(--font-orbitron)] text-tron-cyan tracking-[0.3em] font-medium"
          animate={{
            opacity: [0.5, 1, 0.5],
            textShadow: [
              '0 0 10px rgba(0, 243, 255, 0.3)',
              '0 0 20px rgba(0, 243, 255, 0.6)',
              '0 0 10px rgba(0, 243, 255, 0.3)',
            ],
          }}
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

      {/* Top Bar: Back button (left) + Profile badge (right) */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-start justify-between px-4 pt-4 pointer-events-none">
        <button
          onClick={() => router.push('/')}
          className="pointer-events-auto px-4 py-2 font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/80 hover:text-tron-cyan transition-all border border-tron-cyan/40 hover:border-tron-cyan hover:bg-tron-cyan/10 rounded-sm bg-tron-black/80 backdrop-blur-md relative overflow-hidden group"
        >
          {/* Button corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />

          <span style={{ textShadow: '0 0 10px rgba(0, 243, 255, 0.3)' }}>← BACK</span>
        </button>

        {/* User Profile Badge - Top Right */}
        <AnimatePresence>
          {displayName && matchState !== 'login' && (
            <div className="pointer-events-auto glass-panel-vibrant px-3 py-2 border border-tron-cyan/30 rounded-sm bg-tron-black/80 backdrop-blur-md relative overflow-hidden">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tron-cyan/40" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tron-cyan/40" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tron-cyan/40" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tron-cyan/40" />
              <div className="absolute inset-0 opacity-[0.04] tron-grid pointer-events-none" />
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
          <m.h1
            className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-[0.3em] text-white/90 mb-1"
            animate={{
              textShadow: [
                '0 0 10px rgba(255, 255, 255, 0.1)',
                '0 0 20px rgba(255, 255, 255, 0.2)',
                '0 0 10px rgba(255, 255, 255, 0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            ENTER THE GRID
          </m.h1>
          <div className="relative inline-block mb-4">
            {/* Title glow effect */}
            <m.div
              className="absolute -inset-4 pointer-events-none"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(0, 243, 255, 0.15) 0%, transparent 70%)',
              }}
            />
            <m.h2
              className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.3em] text-tron-cyan relative"
              animate={{
                textShadow: [
                  '0 0 20px rgba(0, 243, 255, 0.5)',
                  '0 0 40px rgba(0, 243, 255, 0.8)',
                  '0 0 20px rgba(0, 243, 255, 0.5)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              HYPER SWIPER
            </m.h2>
            {/* Underline accent */}
            <m.div
              className="absolute -bottom-2 left-0 right-0 h-[2px] bg-tron-cyan/60 mx-auto w-3/4"
              animate={{
                opacity: [0.4, 0.8, 0.4],
                boxShadow: [
                  '0 0 10px rgba(0, 243, 255, 0.3)',
                  '0 0 20px rgba(0, 243, 255, 0.5)',
                  '0 0 10px rgba(0, 243, 255, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* We place MatchmakingAuthPanel FIRST so the action buttons are above the subsetting */}
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
