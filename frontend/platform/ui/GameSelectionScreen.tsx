'use client'

import { clientLazy } from '@/platform/ui/client-lazy'
import { m, AnimatePresence, type Variants } from 'framer-motion'
import { LandingGridBackground } from '@/platform/ui/LandingGridBackground'

const HyperSwiperOnboarding = clientLazy(() =>
  import('@/domains/hyper-swiper/client/components/modals/OnboardingModal').then(
    (mod) => mod.OnboardingModal
  )
)

const TapDancerOnboarding = clientLazy(() =>
  import('@/domains/tap-dancer/client/components/modals/OnboardingModal').then(
    (mod) => mod.OnboardingModal
  )
)

import { games } from '@/domains'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { useEffect, useRef, useState } from 'react'
import { Zap, Sparkles, ChevronRight, Fingerprint, Info } from 'lucide-react'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

interface GameSelectionProps {
  authPending?: boolean
  authState?: 'login' | 'ready'
  isInMiniApp?: boolean
  miniAppAuthenticating?: boolean
  displayName?: string | null
  pfpUrl?: string | null
  onLogin?: () => void
  onLogout?: () => void
  hasPasskey?: boolean
  onLinkPasskey?: () => void
  onNavigate?: (slug: string) => void
}

// The public menu can paint before the wallet/auth SDKs are available.
export function GameSelectionScreen({
  authPending = false,
  authState = 'login',
  isInMiniApp = false,
  miniAppAuthenticating = false,
  displayName,
  pfpUrl,
  onLogin,
  onLogout,
  hasPasskey = false,
  onLinkPasskey,
  onNavigate,
}: GameSelectionProps) {
  const [isEntering, setIsEntering] = useState(false)
  const [onboardingGame, setOnboardingGame] = useState<string | null>(null)
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (navigationTimer.current !== null) clearTimeout(navigationTimer.current)
    },
    []
  )

  if (miniAppAuthenticating) {
    return (
      <div className="pivot-grid-palette min-h-screen relative flex items-center justify-center overflow-hidden">
        <LandingGridBackground />
        <m.p
          className="relative z-20 font-[family-name:var(--font-orbitron)] text-tron-cyan text-sm tracking-[0.25em] font-medium drop-shadow-[0_0_8px_var(--color-tron-cyan)]"
          style={{ opacity: 1 }}
        >
          AUTHENTICATING...
        </m.p>
      </div>
    )
  }

  return (
    <div className="pivot-grid-palette min-h-screen relative flex items-center justify-center overflow-hidden">
      <LandingGridBackground active={isEntering} />

      <div className="fixed inset-0 pointer-events-none z-10 opacity-10">
        <m.div
          className="w-full h-[2px] bg-tron-cyan"
          style={{ boxShadow: '0 0 15px rgba(0, 243, 255, 0.5)' }}
        />
        <div className="absolute inset-0 tron-grid opacity-15" />
      </div>

      <AnimatePresence>
        {authState === 'ready' && displayName && (
          <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-3 right-3 z-30 glass-panel-vibrant px-2.5 py-2 border border-tron-cyan/30 rounded-sm shadow-[0_0_10px_rgba(0,243,255,0.1)]"
          >
            <UserProfileBadge
              displayName={displayName}
              pfpUrl={pfpUrl}
              compact={true}
              animateIdle={false}
            />
          </m.div>
        )}
      </AnimatePresence>

      <m.div
        className="relative z-20 flex flex-col items-center gap-4 py-6 px-4 w-full max-w-lg"
        initial={false}
        animate="visible"
        variants={containerVariants}
      >
        <m.div className="text-center mb-6" variants={itemVariants}>
          <h1 className="font-[family-name:var(--font-orbitron)] text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.15em] text-white drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]">
            GRID GAMES
          </h1>
          <div className="mt-3 h-[2px] w-40 sm:w-56 mx-auto bg-gradient-to-r from-transparent via-tron-cyan to-transparent" />
          <div className="flex items-center justify-center gap-3 mt-3">
            <p className="text-xs sm:text-sm text-tron-white-dim tracking-[0.25em] font-[family-name:var(--font-orbitron)] uppercase">
              Select Your Game
            </p>
          </div>
        </m.div>

        <AnimatePresence mode="popLayout">
          {authState === 'login' && !isInMiniApp && (
            <m.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 w-full max-w-xs z-20"
              variants={itemVariants}
            >
              <m.button
                onClick={onLogin}
                disabled={authPending || !onLogin}
                aria-busy={authPending}
                className="pivot-login-button relative w-full px-8 py-3 backdrop-blur-sm border border-tron-cyan/50 rounded-sm overflow-hidden"
                whileTap={{ scale: 0.98 }}
              >
                <m.div
                  className="absolute inset-0 border border-tron-cyan/60 rounded-sm"
                  style={{ opacity: 0.8 }}
                />
                <span className="relative z-10 font-[family-name:var(--font-orbitron)] text-[10px] sm:text-[11px] tracking-[0.25em] font-medium text-tron-cyan">
                  LOG IN / SIGN UP
                </span>
              </m.button>
              <p className="text-[9px] sm:text-[10px] text-tron-white-dim/60 tracking-wider text-center max-w-[180px]">
                Connect to compete in real-time trading battles
              </p>
            </m.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2.5 sm:gap-3 w-full max-w-sm">
          {games.map((game) => {
            const isAvailable = game.status === 'available' && authState === 'ready' && !authPending

            return (
              <m.div key={game.slug} variants={itemVariants}>
                <div
                  className={`relative block px-4 py-3.5 sm:px-5 sm:py-4 rounded overflow-hidden ${
                    isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div
                    className="absolute inset-0 rounded border backdrop-blur-md transition-colors duration-200"
                    style={{
                      backgroundColor: 'rgba(8, 27, 42, 0.75)',
                      borderColor: 'rgba(0, 243, 255, 0.25)',
                    }}
                  />

                  <div className="absolute inset-0 tron-grid opacity-[0.02] pointer-events-none" />

                  <m.div
                    className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-tron-cyan/50 to-transparent"
                    style={{ opacity: 0.7 }}
                  />

                  <m.div
                    className="relative z-10 flex items-center gap-3"
                    whileTap={isAvailable ? { scale: 0.98 } : undefined}
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded bg-tron-cyan/10 border border-tron-cyan/30 flex items-center justify-center shrink-0">
                      {game.status === 'available' ? (
                        game.lucideIcon ? (
                          <game.lucideIcon className="w-5 h-5 text-tron-cyan" />
                        ) : (
                          <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        )
                      ) : (
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-[family-name:var(--font-orbitron)] text-sm sm:text-base font-bold tracking-[0.1em] text-tron-cyan">
                          {game.name}
                        </h2>
                        {game.status === 'coming-soon' && (
                          <span className="text-[8px] tracking-widest text-tron-cyan/70 border border-tron-cyan/40 px-1.5 py-0.5 rounded-sm bg-tron-cyan/10">
                            SOON
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-tron-white-dim/70 mt-0.5 line-clamp-2">
                        {game.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] sm:text-[10px] text-tron-cyan/50 font-mono tracking-widest">
                        <span>
                          {game.players.min}-{game.players.max}P
                        </span>
                        {game.duration && (
                          <>
                            <span className="text-tron-cyan/30">·</span>
                            <span>{game.duration}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {game.slug !== 'stock-arcade' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOnboardingGame(game.slug)
                          }}
                          className="p-1.5 rounded hover:bg-tron-cyan/10 transition-colors"
                        >
                          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-tron-cyan/40 hover:text-tron-cyan/70" />
                        </button>
                      )}
                      <button
                        disabled={!isAvailable || isEntering}
                        aria-label={`Play ${game.name}`}
                        onClick={(e) => {
                          if (!isAvailable) {
                            e.preventDefault()
                            e.stopPropagation()
                          } else {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsEntering(true)
                            navigationTimer.current = setTimeout(() => {
                              onNavigate?.(game.slug)
                            }, 500)
                          }
                        }}
                        className="p-1"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-tron-cyan/40" />
                      </button>
                    </div>
                  </m.div>
                </div>
              </m.div>
            )
          })}
        </div>

        {authState === 'ready' && !isInMiniApp && (
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {onLinkPasskey && (
              <m.button
                aria-label={hasPasskey ? 'Add another passkey' : 'Add passkey'}
                disabled={authPending || isEntering}
                onClick={onLinkPasskey}
                className="flex items-center gap-2 text-[10px] text-tron-cyan/70 hover:text-tron-cyan disabled:opacity-50 transition-colors font-[family-name:var(--font-orbitron)] tracking-[0.15em]"
                whileTap={{ scale: 0.98 }}
              >
                <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
                {hasPasskey ? 'ADD ANOTHER PASSKEY' : 'ADD PASSKEY'}
              </m.button>
            )}
            <m.button
              onClick={onLogout}
              className="text-[10px] text-tron-cyan/40 hover:text-tron-cyan transition-colors font-[family-name:var(--font-orbitron)] tracking-[0.15em]"
              whileTap={{ scale: 0.98 }}
            >
              LOGOUT
            </m.button>
          </div>
        )}
      </m.div>

      {onboardingGame === 'hyper-swiper' && HyperSwiperOnboarding && (
        <HyperSwiperOnboarding isOpen={true} onClose={() => setOnboardingGame(null)} />
      )}

      {onboardingGame === 'tap-dancer' && TapDancerOnboarding && (
        <TapDancerOnboarding isOpen={true} onClose={() => setOnboardingGame(null)} />
      )}
    </div>
  )
}
