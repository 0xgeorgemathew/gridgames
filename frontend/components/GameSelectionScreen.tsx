'use client'

import { useRouter } from 'next/navigation'
import { m, AnimatePresence } from 'framer-motion'
import { GridScanBackground } from '@/components/GridScanBackground'
import { games } from '@/games'
import { useBaseMiniAppAuth } from '@/hooks/useBaseMiniAppAuth'
import { useBaseName } from '@/hooks/useBaseName'
import { PlayerName } from '@/components/ens/PlayerName'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useCallback, useMemo } from 'react'
import { Zap, Sparkles } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { ActionButton } from '@/components/ui/ActionButton'

export function GameSelectionScreen() {
  const router = useRouter()
  const { ready, authenticated, login, logout, user } = usePrivy()
  const {
    isInMiniApp,
    user: miniAppUser,
    walletAddress: miniAppWallet,
    isConnected: miniAppConnected,
    isAuthenticated: miniAppAuthenticated,
    isAuthenticating: miniAppAuthenticating,
  } = useBaseMiniAppAuth()
  
  const { name: baseName, isLoading: isBaseNameLoading } = useBaseName(
    isInMiniApp ? miniAppWallet : undefined
  )

  const getDisplayName = useCallback(() => {
    if (isInMiniApp) {
      if (baseName) return baseName
      if (miniAppUser?.username) return miniAppUser.username
      if (miniAppUser?.fid) return `fid:${miniAppUser.fid}`
      if (miniAppWallet) return 'Grid Runner'
      return null
    }

    const googleName = (user as { google?: { name?: string } } | null)?.google?.name
    if (googleName) return googleName
    if (user?.wallet?.address) return 'Grid Runner'
    return null
  }, [isInMiniApp, baseName, miniAppUser, miniAppWallet, user])

  const displayName = getDisplayName()

  const [isEntering, setIsEntering] = useState(false)

  const isInitializing = isInMiniApp && isBaseNameLoading

  const authState = useMemo(() => {
    if (isInMiniApp) {
      if (miniAppUser) {
        return 'ready'
      }
      return 'login'
    }

    if (authenticated && user?.wallet) {
      return 'ready'
    }
    return 'login'
  }, [isInMiniApp, miniAppUser, authenticated, user?.wallet])

  if (isInitializing) {
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <GridScanBackground
        scanDirection={isEntering ? 1 : 0}
        scanRange={isEntering ? [0.0, 2.0] : [2.0, 2.0]}
        scanOpacity={isEntering ? 0.8 : 0.0}
        scanDuration={isEntering ? 0.8 : 4.0}
        scanGlow={isEntering ? 1.0 : 0.0}
      />

      <div className="fixed inset-0 pointer-events-none z-10 opacity-15">
        <m.div
          className="w-full h-px bg-cyan-400"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 tron-grid opacity-30" />
      </div>

      <div className="relative z-20 flex flex-col items-center gap-8 py-12 px-6 w-full max-w-xl">
        <div className="text-center">
          <m.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-[family-name:var(--font-orbitron)] text-3xl sm:text-4xl md:text-5xl font-bold tracking-[0.25em] text-white"
          >
            GRID GAMES
          </m.h1>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-2 text-sm text-tron-white-dim tracking-widest font-[family-name:var(--font-orbitron)]"
          >
            SELECT YOUR GAME
          </m.p>
        </div>

        {/* Player Profile / Auth Section */}
        <AnimatePresence mode="popLayout">
          {authState === 'login' && !isInMiniApp && (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3 w-full max-w-xs justify-center z-20"
            >
              <ActionButton onClick={login} color="cyan">
                LOGIN WITH GOOGLE
              </ActionButton>
            </m.div>
          )}

          {authState === 'ready' && displayName && (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-2 z-20 w-full max-w-xs"
            >
              <div className="flex flex-row items-center gap-3 glass-panel-vibrant px-4 py-2 border border-tron-cyan/30 rounded-sm shadow-[0_0_15px_rgba(0,243,255,0.1)] w-full justify-center">
                <div className="flex items-center gap-4">
                  {miniAppUser?.pfpUrl && (
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-sm bg-tron-cyan/20 blur-sm" />
                      <Image
                        src={miniAppUser.pfpUrl}
                        alt=""
                        width={32}
                        height={32}
                        unoptimized
                        className="relative rounded-sm border border-tron-cyan/80 object-cover"
                      />
                    </div>
                  )}
                  <PlayerName
                    username={displayName}
                    className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.1em] text-tron-cyan drop-shadow-[0_0_10px_var(--color-tron-cyan)]"
                  />
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-4 w-full max-w-md mt-4">
          {games.map((game, index) => (
            <Link
              key={game.slug}
              href={game.status === 'available' ? `/${game.slug}` : '#'}
              aria-disabled={game.status !== 'available' || authState !== 'ready'}
              onClick={(e) => {
                if (game.status !== 'available' || authState !== 'ready') {
                  e.preventDefault()
                } else {
                  e.preventDefault()
                  setIsEntering(true)
                  setTimeout(() => {
                    router.push(`/${game.slug}`)
                  }, 400) // Keep standard navigation delay slightly longer for visual effect
                }
              }}
              className={`
                relative px-6 py-5 rounded-sm overflow-hidden hologram group
                border transition-all duration-300
                ${
                  game.status === 'available' && authState === 'ready'
                    ? 'border-cyan-400/30 hover:border-cyan-400 bg-black/40 hover:bg-cyan-400/10 cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.05)] hover:shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                    : 'border-white/10 bg-black/20 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <span className="text-2xl dropdown-shadow flex items-center justify-center">
                    {game.status === 'available' ? (
                      <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    )}
                  </span>
                </div>

                <div className="flex-1 text-left">
                  <h2
                    className={`
                      font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-[0.15em]
                      ${game.status === 'available' ? 'text-tron-cyan group-hover:text-white transition-colors' : 'text-white/50'}
                    `}
                  >
                    {game.name}
                    {game.status === 'coming-soon' && (
                      <span className="ml-2 text-[10px] tracking-widest text-tron-cyan/60 border border-tron-cyan/30 px-1 py-0.5 rounded-sm bg-tron-cyan/10">COMING SOON</span>
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-tron-white-dim mt-1">{game.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-tron-cyan/60 font-mono tracking-widest">
                    <span>
                      {game.players.min}-{game.players.max} PLAYERS
                    </span>
                    {game.duration && (
                      <>
                        <span className="text-tron-cyan/30">•</span>
                        <span>{game.duration}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {authState === 'ready' && !isInMiniApp && (
          <button
            onClick={logout}
            className="text-xs text-tron-cyan/50 hover:text-tron-cyan transition-colors font-[family-name:var(--font-orbitron)] tracking-widest mt-4"
          >
            LOGOUT
          </button>
        )}
      </div>
    </div>
  )
}
