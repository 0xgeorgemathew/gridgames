'use client'

import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { m, AnimatePresence, type Variants } from 'framer-motion'

const GridScanBackground = dynamic(
  () => import('@/platform/ui/GridScanBackground').then((mod) => mod.GridScanBackground),
  { ssr: false }
)

const HyperSwiperOnboarding = dynamic(
  () =>
    import('@/domains/hyper-swiper/client/components/modals/OnboardingModal').then(
      (mod) => mod.OnboardingModal
    ),
  { ssr: false }
)

const TapDancerOnboarding = dynamic(
  () =>
    import('@/domains/tap-dancer/client/components/modals/OnboardingModal').then(
      (mod) => mod.OnboardingModal
    ),
  { ssr: false }
)

import { games } from '@/domains'
import { useBaseMiniAppAuth } from '@/platform/auth/mini-app.hook'
import { UserProfileBadge } from '@/platform/ui/UserProfileBadge'
import { useState, useCallback, useMemo } from 'react'
import { Zap, Sparkles, ChevronRight, Info } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'

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

export function GameSelectionScreen() {
  const router = useRouter()
  const { authenticated, login, logout, user } = usePrivy()
  const {
    isInMiniApp,
    user: miniAppUser,
    walletAddress: miniAppWallet,
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
  const [onboardingGame, setOnboardingGame] = useState<string | null>(null)

  const authState = useMemo(() => {
    if (isInMiniApp) {
      return 'ready'
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
          className="relative z-20 font-[family-name:var(--font-orbitron)] text-tron-cyan text-sm tracking-[0.25em] font-medium drop-shadow-[0_0_8px_var(--color-tron-cyan)]"
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

      <div className="fixed inset-0 pointer-events-none z-10 opacity-10">
        <m.div
          className="w-full h-[2px] bg-tron-cyan"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
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
              pfpUrl={isInMiniApp ? miniAppUser?.pfpUrl : null}
              compact={true}
            />
          </m.div>
        )}
      </AnimatePresence>

      <m.div
        className="relative z-20 flex flex-col items-center gap-4 py-6 px-4 w-full max-w-lg"
        initial="hidden"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 w-full max-w-xs z-20"
              variants={itemVariants}
            >
              <m.button
                onClick={login}
                className="relative w-full px-8 py-3 bg-tron-black/60 backdrop-blur-sm border border-tron-cyan/50 rounded-sm overflow-hidden"
                whileTap={{ scale: 0.98 }}
              >
                <m.div
                  className="absolute inset-0 border border-tron-cyan/60 rounded-sm"
                  animate={{
                    opacity: [0.4, 0.8, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <span className="relative z-10 font-[family-name:var(--font-orbitron)] text-[10px] sm:text-[11px] tracking-[0.25em] font-medium text-tron-cyan">
                  LOGIN WITH GOOGLE
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
            const isAvailable = game.status === 'available' && authState === 'ready'

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
                      backgroundColor: 'rgba(10, 10, 10, 0.6)',
                      borderColor: 'rgba(0, 243, 255, 0.25)',
                    }}
                  />

                  <div className="absolute inset-0 tron-grid opacity-[0.02] pointer-events-none" />

                  <m.div
                    className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-tron-cyan/50 to-transparent"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
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
                      <button
                        onClick={(e) => {
                          if (!isAvailable) {
                            e.preventDefault()
                            e.stopPropagation()
                          } else {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsEntering(true)
                            setTimeout(() => {
                              router.push(`/${game.slug}`)
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
          <m.button
            onClick={logout}
            className="text-[10px] text-tron-cyan/40 hover:text-tron-cyan transition-colors font-[family-name:var(--font-orbitron)] tracking-[0.15em]"
            whileTap={{ scale: 0.98 }}
          >
            LOGOUT
          </m.button>
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
