'use client'

import { useRouter } from 'next/navigation'
import { m, AnimatePresence } from 'framer-motion'
import { GridScanBackground } from '@/platform/ui/GridScanBackground'
import { games } from '@/domains'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { PlayerName } from '@/platform/ui/PlayerName'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useCallback, useMemo } from 'react'
import { Zap, Sparkles } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { ActionButton } from '@/platform/ui/ActionButton'

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

  const getDisplayName = useCallback(() => {
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

  const displayName = getDisplayName()

  const [isEntering, setIsEntering] = useState(false)

  const authState = useMemo(() => {
    if (isInMiniApp) {
      return 'ready' // Mini App users can always access the game menu
    }

    if (authenticated && user?.wallet) {
      return 'ready'
    }
    return 'login'
  }, [isInMiniApp, authenticated, user?.wallet])

  if (miniAppAuthenticating) {
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
          AUTHENTICATING...
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
          className="w-full h-[2px] bg-tron-cyan"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ boxShadow: '0 0 20px rgba(0, 243, 255, 0.6), 0 0 40px rgba(0, 243, 255, 0.3)' }}
        />
        <div className="absolute inset-0 tron-grid opacity-30" />
      </div>

      {/* Top Right Profile Badge */}
      <AnimatePresence>
        {authState === 'ready' && displayName && (
          <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-4 right-4 z-30 glass-panel-vibrant px-3 py-2 border border-tron-cyan/30 rounded-sm shadow-[0_0_15px_rgba(0,243,255,0.1)] bg-tron-black/80 backdrop-blur-md"
          >
            <UserProfileBadge
              displayName={displayName}
              pfpUrl={isInMiniApp ? miniAppUser?.pfpUrl : null}
              compact={true}
            />
          </m.div>
        )}
      </AnimatePresence>

      <div className="relative z-20 flex flex-col items-center gap-8 py-12 px-6 w-full max-w-xl">
        <div className="text-center">
          <m.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: 1,
              y: 0,
              textShadow: [
                '0 0 10px rgba(255,255,255,0.1)',
                '0 0 25px rgba(0,243,255,0.4)',
                '0 0 10px rgba(255,255,255,0.1)',
              ],
            }}
            transition={{
              opacity: { duration: 0.6 },
              y: { duration: 0.6 },
              textShadow: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            }}
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

        {/* Login Button - Only for web users not authenticated */}
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
              {/* Grid background pattern */}
              <div className="absolute inset-0 tron-grid opacity-[0.03] pointer-events-none" />

              {/* Top glow line */}
              <m.div
                className="absolute top-0 left-0 right-0 h-[1px] bg-tron-cyan/50 z-40"
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  boxShadow: [
                    '0 0 10px rgba(0, 243, 255, 0.2)',
                    '0 0 20px rgba(0, 243, 255, 0.4)',
                    '0 0 10px rgba(0, 243, 255, 0.2)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors duration-300" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors duration-300" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors duration-300" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors duration-300" />
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
                      <span className="ml-2 text-[10px] tracking-widest text-tron-cyan/60 border border-tron-cyan/30 px-1 py-0.5 rounded-sm bg-tron-cyan/10">
                        COMING SOON
                      </span>
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
