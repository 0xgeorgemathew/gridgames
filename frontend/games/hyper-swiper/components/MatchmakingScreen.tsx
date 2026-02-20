'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '../game/stores/trading-store'
import { AnimatePresence, m } from 'framer-motion'
import { GridScanBackground } from '@/components/GridScanBackground'
import { usePrivy } from '@privy-io/react-auth'
import { ActionButton } from '@/components/ui/ActionButton'
import { PlayerName } from '@/components/ens/PlayerName'
import { useBaseMiniAppAuth } from '@/hooks/useBaseMiniAppAuth'
import { useBaseName } from '@/hooks/useBaseName'
import { GameSettingsSelector } from './GameSettingsSelector'
import { cn } from '@/lib/utils'

const BOTTOM_DOT_STEPS = [0, 1, 2, 3, 4, 5, 6] as const

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
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-3 mb-3">
              <m.p className="text-cyan-400/70 text-[10px] tracking-[0.25em] font-medium glow-text-label">
                PLAYING AS
              </m.p>
            </div>

            <m.div
              className="relative flex flex-col items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {isInMiniApp && miniAppPfpUrl && (
                <m.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="relative"
                >
                  <div className="absolute -inset-1 rounded-full bg-cyan-400/20 blur-md" />
                  <m.div
                    className="absolute -inset-2 rounded-full border border-cyan-400/40"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.4, 0.2, 0.4],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <Image
                    src={miniAppPfpUrl}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                    className="relative rounded-full border-2 border-cyan-400/50 object-cover"
                  />
                </m.div>
              )}
              <PlayerName
                username={displayName}
                className="text-2xl tracking-wider relative z-10"
              />
            </m.div>
          </m.div>
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
  onLogin: () => void
  onLogout: () => void
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
  onLogin,
  onLogout,
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
        <AnimatePresence mode="wait">
          {matchState === 'login' && (
            <m.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              layout
              className="flex flex-col items-center gap-4"
            >
              <p className="text-gray-400 text-sm tracking-wider">
                {isInMiniApp ? 'CONNECTING...' : 'CONNECT TO PLAY'}
              </p>
              {!isInMiniApp && (
                <ActionButton onClick={onLogin} color="cyan">
                  LOGIN WITH GOOGLE
                </ActionButton>
              )}
            </m.div>
          )}

          {matchState === 'ready' && (
            <m.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              layout
              className="flex flex-col items-center gap-3"
            >
              <p className="text-green-400 text-xs tracking-wider">READY TO PLAY</p>

              <div className="flex flex-col gap-3 w-full min-w-[200px]">
                <ActionButton onClick={onEnter} disabled={!isConnected || isMatching} color="cyan">
                  {isMatching ? 'ENTERING...' : 'AUTO-MATCH'}
                </ActionButton>
                <ActionButton onClick={onOpenLobby} disabled={!isConnected} color="cyan">
                  SELECT OPPONENT
                </ActionButton>
              </div>

              {!isInMiniApp && (
                <button
                  onClick={onLogout}
                  className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  LOGOUT
                </button>
              )}
            </m.div>
          )}

          {matchState === 'entering' && (
            <m.div
              key="entering"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              layout
              className="flex flex-col items-center gap-3"
            >
              <p className="text-cyan-400 text-xs tracking-wider animate-pulse">
                FINDING OPPONENT...
              </p>
            </m.div>
          )}

          {matchState === 'lobby' && (
            <m.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              layout
              className="flex flex-col items-center gap-4 w-full max-w-md"
            >
              <button
                onClick={onBackFromLobby}
                className="text-cyan-400/60 hover:text-cyan-400 transition-colors text-xs"
              >
                ← BACK
              </button>

              <p className="text-cyan-400/70 text-[10px] tracking-[0.25em]">AVAILABLE OPPONENTS</p>

              {lobbyPlayers.length === 0 ? (
                <p className="text-cyan-400/60 text-xs">NO PLAYERS WAITING</p>
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
                            'relative px-4 py-3 bg-black/40 border rounded-lg overflow-hidden scale-pulse-button min-w-[200px]',
                            hasMatchingSettings
                              ? 'border-cyan-400/40 hover:border-cyan-400/60'
                              : 'border-cyan-400/20 hover:border-cyan-400/40 opacity-60'
                          )}
                        >
                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <PlayerName username={player.name} className="text-sm" />
                            <div className="flex items-center gap-2 text-[9px] tracking-wider">
                              <span
                                className={
                                  hasMatchingSettings ? 'text-cyan-400' : 'text-cyan-400/50'
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
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function MatchmakingBottomDots() {
  return (
    <div className="fixed bottom-12 left-0 right-0 z-20 flex justify-center gap-2">
      {BOTTOM_DOT_STEPS.map((step) => (
        <m.div
          key={`dot-${step}`}
          className="w-0.5 h-0.5 bg-cyan-400/40"
          animate={{ opacity: [0.2, 1, 0.2], scaleY: [1, 2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: step * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export function MatchmakingScreen() {
  const router = useRouter()
  const { ready, authenticated, login, logout, user } = usePrivy()
  const {
    isInMiniApp,
    user: miniAppUser,
    walletAddress: miniAppWallet,
    isConnected: miniAppConnected,
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

  const { name: baseName, isLoading: isBaseNameLoading } = useBaseName(
    isInMiniApp ? miniAppWallet : undefined
  )

  const getDisplayName = useCallback(() => {
    if (isInMiniApp) {
      if (baseName) return baseName
      if (miniAppUser?.username) return miniAppUser.username
      if (miniAppUser?.fid) return `fid:${miniAppUser.fid}`
      if (miniAppWallet) return miniAppWallet
      return null
    }

    const googleName = (user as { google?: { name?: string } } | null)?.google?.name
    if (googleName) return googleName
    if (user?.wallet?.address) return user.wallet.address
    return null
  }, [isInMiniApp, baseName, miniAppUser, miniAppWallet, user])

  const displayName = getDisplayName()

  const authState = useMemo((): AuthMatchState => {
    if (isInMiniApp) {
      if (miniAppConnected && miniAppUser && !isBaseNameLoading) {
        return 'ready'
      }
      return 'login'
    }

    if (authenticated && user?.wallet) {
      return 'ready'
    }
    return 'login'
  }, [isInMiniApp, miniAppConnected, miniAppUser, isBaseNameLoading, authenticated, user?.wallet])

  const matchState = userState || authState

  useEffect(() => {
    if (matchState === 'lobby') {
      const walletAddress = isInMiniApp ? miniAppWallet : user?.wallet?.address
      if (displayName && walletAddress) {
        joinWaitingPool(displayName, walletAddress)
      }
      getLobbyPlayers()
    }
  }, [
    matchState,
    joinWaitingPool,
    getLobbyPlayers,
    displayName,
    user?.wallet,
    isInMiniApp,
    miniAppWallet,
  ])

  const handleEnter = useCallback(() => {
    if (!isConnected || isMatching) return

    const walletAddress = isInMiniApp ? miniAppWallet : user?.wallet?.address
    if (!walletAddress) return

    setUserState('entering')

    if (
      typeof window !== 'undefined' &&
      (window as { phaserEvents?: { emit: (event: string) => void } }).phaserEvents
    ) {
      ;(window as { phaserEvents?: { emit: (event: string) => void } }).phaserEvents?.emit(
        'unlock_audio'
      )
    }

    const playerName = displayName || walletAddress
    findMatch(playerName, walletAddress)
  }, [displayName, findMatch, isConnected, isInMiniApp, isMatching, miniAppWallet, user?.wallet])

  const handleSelectOpponent = useCallback(
    (opponentSocketId: string) => {
      if (!isConnected || isMatching) return

      const walletAddress = isInMiniApp ? miniAppWallet : user?.wallet?.address
      if (!walletAddress) return

      setUserState('entering')
      selectOpponent(opponentSocketId)
    },
    [isConnected, isMatching, isInMiniApp, miniAppWallet, user?.wallet, selectOpponent]
  )

  if (!ready) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        <GridScanBackground />
        <m.p
          className="relative z-20 font-[family-name:var(--font-orbitron)] text-cyan-400 tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          INITIALIZING...
        </m.p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <GridScanBackground />

      <div className="fixed inset-0 pointer-events-none z-10 opacity-15">
        <m.div
          className="w-full h-px bg-cyan-400"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-30 px-3 py-2 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors border border-cyan-400/30 hover:border-cyan-400/60 rounded-lg bg-black/40 backdrop-blur-sm"
      >
        ← BACK
      </button>

      <div className="relative z-20 flex flex-col items-center gap-12 px-6">
        <div className="text-center">
          <m.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="font-[family-name:var(--font-orbitron)] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-[0.25em] text-white"
          >
            ENTER THE GRID
          </m.h1>
          <m.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-[0.2em] text-cyan-400 glow-text-grid"
          >
            GRID
          </m.h2>

          <PlayingAsPanel
            displayName={displayName}
            matchState={matchState}
            isInMiniApp={isInMiniApp}
            miniAppPfpUrl={miniAppUser?.pfpUrl}
          />
        </div>

        {matchState !== 'login' && (
          <GameSettingsSelector
            selectedDuration={selectedGameDuration}
            onDurationChange={setSelectedGameDuration}
            disabled={isMatching}
          />
        )}

        <MatchmakingAuthPanel
          matchState={matchState}
          isInMiniApp={isInMiniApp}
          isConnected={isConnected}
          isMatching={isMatching}
          isRefreshingLobby={isRefreshingLobby}
          selectedGameDuration={selectedGameDuration}
          lobbyPlayers={lobbyPlayers}
          onLogin={login}
          onLogout={logout}
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

      <MatchmakingBottomDots />
    </div>
  )
}
