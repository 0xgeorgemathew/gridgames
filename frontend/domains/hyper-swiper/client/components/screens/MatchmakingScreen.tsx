'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { AnimatePresence, m } from 'framer-motion'
import { GridScanBackground } from '@/platform/ui/GridScanBackground'
import { usePrivy } from '@privy-io/react-auth'
import { MatchmakingAuthPanel } from '@/platform/ui/MatchmakingAuthPanel'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { GameSettingsSelector } from '@/domains/hyper-swiper/client/components/settings/GameSettingsSelector'
import { OnboardingModal } from '@/domains/hyper-swiper/client/components/modals/OnboardingModal'

type AuthMatchState = 'login' | 'ready'
type UserMatchState = 'lobby' | 'entering'
type MatchState = AuthMatchState | UserMatchState

export function MatchmakingScreen() {
  const navigate = useNavigate()
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

  const matchState: MatchState =
    authState === 'login'
      ? 'login'
      : isMatching
        ? 'entering'
        : userState === 'lobby'
          ? 'lobby'
          : 'ready'

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
    navigate,
  ])

  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('hyper_swiper_onboarded')
    if (!hasOnboarded) {
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
          style={{ opacity: 1, textShadow: '0 0 20px rgba(0, 243, 255, 0.6)' }}
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
        scanOpacity={0} // Hide entirely except on enter
        scanDuration={matchState === 'entering' ? 0.8 : 4.0}
        scanGlow={matchState === 'entering' ? 1.0 : 0.0}
      />

      {/* Top Bar: Back button (left) + Profile badge (right) */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-start justify-between px-4 pt-4 pointer-events-none">
        <button
          onClick={() => navigate({ to: '/' })}
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
                animateIdle={false}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-20 flex flex-col items-center gap-4 px-4 mt-16 w-full max-w-[400px]">
        <div className="text-center relative">
          <m.h1
            className="font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-[0.3em] text-white/90 mb-1"
            style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.2)' }}
          >
            ENTER THE GRID
          </m.h1>
          <div className="relative inline-block mb-4">
            {/* Title glow effect */}
            <m.div
              className="absolute -inset-4 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(0, 243, 255, 0.15) 0%, transparent 70%)',
              }}
            />
            <m.h2
              className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.3em] text-tron-cyan relative"
              style={{ textShadow: '0 0 40px rgba(0, 243, 255, 0.8)' }}
            >
              HYPER SWIPER
            </m.h2>
            {/* Underline accent */}
            <m.div
              className="absolute -bottom-2 left-0 right-0 h-[2px] bg-tron-cyan/60 mx-auto w-3/4"
              style={{ opacity: 0.8, boxShadow: '0 0 20px rgba(0, 243, 255, 0.5)' }}
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
          settings={
            <GameSettingsSelector
              selectedDuration={selectedGameDuration}
              onDurationChange={setSelectedGameDuration}
              disabled={isMatching}
            />
          }
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
