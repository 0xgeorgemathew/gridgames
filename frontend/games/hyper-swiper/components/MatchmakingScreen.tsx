'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTradingStore } from '../game/stores/trading-store'
import { motion, AnimatePresence } from 'framer-motion'
import { GridScanBackground } from '@/components/GridScanBackground'
import { usePrivy } from '@privy-io/react-auth'
import { ActionButton } from '@/components/ui/ActionButton'
import { PlayerName } from '@/components/ens/PlayerName'
import { useBaseMiniAppAuth } from '@/hooks/useBaseMiniAppAuth'
import { useBaseName } from '@/hooks/useBaseName'

const BOTTOM_DOTS_COUNT = 7

type AuthMatchState = 'login' | 'ready'
type UserMatchState = 'lobby' | 'entering'
type MatchState = AuthMatchState | UserMatchState

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
    connect,
    lobbyPlayers,
    isRefreshingLobby,
    getLobbyPlayers,
    joinWaitingPool,
    leaveWaitingPool,
    selectOpponent,
  } = useTradingStore()

  // User-initiated state (lobby, entering)
  const [userState, setUserState] = useState<UserMatchState | null>(null)

  // Resolve Base Name for Mini App users
  const { name: baseName, isLoading: isBaseNameLoading } = useBaseName(
    isInMiniApp ? miniAppWallet : undefined
  )

  // Connect to Socket.IO when component mounts
  useEffect(() => {
    connect()
  }, [connect])

  // Get display name based on auth method
  const getDisplayName = useCallback(() => {
    if (isInMiniApp) {
      // Base Mini App: Use Base Name or fallback to Farcaster username
      if (baseName) return baseName
      if (miniAppUser?.username) return miniAppUser.username
      if (miniAppUser?.fid) return `fid:${miniAppUser.fid}`
      if (miniAppWallet) return miniAppWallet
      return null
    } else {
      // Web/Privy: Use Google display name
      const googleName = (user as any)?.google?.name
      if (googleName) return googleName
      if (user?.wallet?.address) return user.wallet.address
      return null
    }
  }, [isInMiniApp, baseName, miniAppUser, miniAppWallet, user])

  const displayName = getDisplayName()

  // Derive auth state from props (no useEffect needed)
  const authState = useMemo((): AuthMatchState => {
    if (isInMiniApp) {
      // Base App path: Use Farcaster identity, skip Privy entirely
      if (miniAppConnected && miniAppUser && !isBaseNameLoading) {
        return 'ready'
      }
      return 'login'
    } else {
      // Web browser path: Privy flow
      if (authenticated && user?.wallet) {
        return 'ready'
      }
      return 'login'
    }
  }, [isInMiniApp, miniAppConnected, miniAppUser, isBaseNameLoading, authenticated, user?.wallet])

  // Final match state: user state takes precedence, otherwise use auth state
  const matchState = userState || authState

  // Initial lobby fetch when entering lobby state
  useEffect(() => {
    if (matchState === 'lobby') {
      // Determine wallet address based on auth method
      const walletAddress = isInMiniApp ? miniAppWallet : user?.wallet?.address
      // Join waiting pool first so we can be seen by others
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

  const handleEnter = async () => {
    if (!isConnected || isMatching) return

    // Determine wallet address based on auth method
    const walletAddress = isInMiniApp ? miniAppWallet : user?.wallet?.address
    if (!walletAddress) return

    setUserState('entering')

    // CRITICAL: Unlock mobile audio before entering game
    // Mobile browsers require user gesture to resume AudioContext
    if (typeof window !== 'undefined' && (window as any).phaserEvents) {
      ;(window as any).phaserEvents.emit('unlock_audio')
    }

    // Proceed with matchmaking - pass username or wallet address
    const playerName = displayName || walletAddress
    findMatch(playerName, walletAddress)
  }

  const handleSelectOpponent = useCallback(
    (opponentSocketId: string) => {
      if (!isConnected || isMatching) return

      // Determine wallet address based on auth method
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
        <motion.p
          className="relative z-20 font-[family-name:var(--font-orbitron)] text-cyan-400 tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          INITIALIZING...
        </motion.p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <GridScanBackground />

      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-15">
        <motion.div
          className="w-full h-px bg-cyan-400"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-30 px-3 py-2 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors border border-cyan-400/30 hover:border-cyan-400/60 rounded-lg bg-black/40 backdrop-blur-sm"
      >
        ← BACK
      </button>

      {/* Main Content */}
      <div className="relative z-20 flex flex-col items-center gap-12 px-6">
        {/* Title */}
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="font-[family-name:var(--font-orbitron)] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-[0.25em] text-white"
          >
            ENTER THE GRID
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-[0.2em] text-cyan-400 glow-text-grid"
          >
            GRID
          </motion.h2>

          {/* Reserved space for "PLAYING AS" section (100px min-height prevents layout shift) */}
          <div className="mt-4 min-h-[100px]">
            <AnimatePresence>
              {displayName && matchState !== 'login' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  {/* Enhanced label row with better visibility */}
                  <div className="flex items-center gap-3 mb-3">
                    <motion.p className="text-cyan-400/70 text-[10px] tracking-[0.25em] font-medium glow-text-label">
                      PLAYING AS
                    </motion.p>
                  </div>

                  {/* Username display with Farcaster profile for Base App */}
                  <motion.div
                    className="relative flex flex-col items-center gap-3"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {/* Farcaster avatar for Base App - positioned above name */}
                    {isInMiniApp && miniAppUser?.pfpUrl && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="relative"
                      >
                        {/* Outer glow ring */}
                        <div className="absolute -inset-1 rounded-full bg-cyan-400/20 blur-md" />
                        {/* Animated pulse ring */}
                        <motion.div
                          className="absolute -inset-2 rounded-full border border-cyan-400/40"
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.4, 0.2, 0.4],
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <Image
                          src={miniAppUser.pfpUrl}
                          alt=""
                          width={56}
                          height={56}
                          unoptimized
                          className="relative rounded-full border-2 border-cyan-400/50 object-cover"
                        />
                      </motion.div>
                    )}
                    <PlayerName
                      username={displayName}
                      className="text-2xl tracking-wider relative z-10"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Auth Section - reserved space (200px min-height) prevents layout shift */}
        <div className="flex flex-col items-center">
          <div className="min-h-[200px] w-full max-w-md">
            <AnimatePresence mode="wait">
              {matchState === 'login' && (
                <motion.div
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
                    <ActionButton onClick={login} color="cyan">
                      LOGIN WITH GOOGLE
                    </ActionButton>
                  )}
                </motion.div>
              )}

              {matchState === 'ready' && (
                <motion.div
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
                    <ActionButton
                      onClick={handleEnter}
                      disabled={!isConnected || isMatching}
                      color="cyan"
                    >
                      {isMatching ? 'ENTERING...' : 'AUTO-MATCH'}
                    </ActionButton>
                    <ActionButton
                      onClick={() => {
                        getLobbyPlayers()
                        setUserState('lobby')
                      }}
                      disabled={!isConnected}
                      color="cyan"
                    >
                      SELECT OPPONENT
                    </ActionButton>
                  </div>

                  {/* Logout button - only for Privy users */}
                  {!isInMiniApp && (
                    <button
                      onClick={logout}
                      className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      LOGOUT
                    </button>
                  )}
                </motion.div>
              )}

              {matchState === 'entering' && (
                <motion.div
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
                </motion.div>
              )}

              {matchState === 'lobby' && (
                <motion.div
                  key="lobby"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  layout
                  className="flex flex-col items-center gap-4 w-full max-w-md"
                >
                  <button
                    onClick={() => {
                      leaveWaitingPool()
                      setUserState(null) // Reset to auth-derived state
                    }}
                    className="text-cyan-400/60 hover:text-cyan-400 transition-colors text-xs"
                  >
                    ← BACK
                  </button>

                  <p className="text-cyan-400/70 text-[10px] tracking-[0.25em]">
                    AVAILABLE OPPONENTS
                  </p>

                  {lobbyPlayers.length === 0 ? (
                    <p className="text-cyan-400/60 text-xs">NO PLAYERS WAITING</p>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      <AnimatePresence mode="popLayout">
                        {lobbyPlayers.map((player) => (
                          <motion.button
                            key={player.socketId}
                            onClick={() => handleSelectOpponent(player.socketId)}
                            disabled={isMatching}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative px-4 py-3 bg-black/40 border border-cyan-400/20 hover:border-cyan-400/40 rounded-lg overflow-hidden scale-pulse-button min-w-[200px]"
                          >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                              <PlayerName username={player.name} className="text-sm" />
                            </div>
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  <ActionButton
                    onClick={getLobbyPlayers}
                    isLoading={isRefreshingLobby}
                    disabled={isMatching}
                    color="cyan"
                  >
                    REFRESH
                  </ActionButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom dots */}
      <div className="fixed bottom-12 left-0 right-0 z-20 flex justify-center gap-2">
        {[...Array(BOTTOM_DOTS_COUNT)].map((_, i) => (
          <motion.div
            key={i}
            className="w-0.5 h-0.5 bg-cyan-400/40"
            animate={{ opacity: [0.2, 1, 0.2], scaleY: [1, 2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}
