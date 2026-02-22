'use client'

import { useRouter } from 'next/navigation'
import { m, AnimatePresence } from 'framer-motion'
import { GridScanBackground } from '@/components/GridScanBackground'
import { games } from '@/games'
import { useBaseMiniAppAuth } from '@/hooks/useBaseMiniAppAuth'
import { useBaseName } from '@/hooks/useBaseName'
import { PlayerName } from '@/components/ens/PlayerName'
import Image from 'next/image'

export function GameSelectionScreen() {
  const router = useRouter()
  const {
    isInMiniApp,
    user: miniAppUser,
    walletAddress: miniAppWallet,
    isAuthenticated,
    isAuthenticating,
  } = useBaseMiniAppAuth()
  
  const { name: baseName, isLoading: isBaseNameLoading } = useBaseName(
    isInMiniApp ? miniAppWallet : undefined
  )

  const getDisplayName = () => {
    if (baseName) return baseName
    if (miniAppUser?.username) return miniAppUser.username
    if (miniAppUser?.fid) return `fid:${miniAppUser.fid}`
    if (miniAppWallet) return miniAppWallet
    return null
  }

  const displayName = getDisplayName()

  const isInitializing = isInMiniApp && (isAuthenticating || isBaseNameLoading || (!isAuthenticated && miniAppWallet !== undefined))

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
          {isAuthenticating ? 'AUTHENTICATING...' : 'INITIALIZING...'}
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

        {/* Player Profile Section */}
        <AnimatePresence>
          {displayName && isInMiniApp && (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center gap-3 glass-panel-vibrant px-8 py-4 border border-tron-cyan/30 rounded-sm shadow-[0_0_15px_rgba(0,243,255,0.1)] w-full max-w-sm"
            >
              <p className="font-[family-name:var(--font-orbitron)] text-tron-cyan/70 text-[10px] tracking-[0.3em] font-medium drop-shadow-[0_0_8px_var(--color-tron-cyan)]">
                AUTHENTICATED AS
              </p>
              
              <div className="flex items-center gap-4">
                {miniAppUser?.pfpUrl && (
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-sm bg-tron-cyan/20 blur-md" />
                    <Image
                      src={miniAppUser.pfpUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="relative rounded-sm border-2 border-tron-cyan/80 object-cover shadow-[0_0_10px_rgba(0,243,255,0.3)]"
                    />
                  </div>
                )}
                <PlayerName
                  username={displayName}
                  className="font-[family-name:var(--font-orbitron)] text-xl tracking-[0.1em] text-tron-cyan drop-shadow-[0_0_10px_var(--color-tron-cyan)]"
                />
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-4 w-full max-w-md mt-4">
          {games.map((game, index) => (
            <m.button
              key={game.slug}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              onClick={() => router.push(`/${game.slug}`)}
              disabled={game.status !== 'available'}
              className={`
                relative px-6 py-5 rounded-sm overflow-hidden hologram group
                border transition-all duration-300
                ${
                  game.status === 'available'
                    ? 'border-cyan-400/30 hover:border-cyan-400 bg-black/40 hover:bg-cyan-400/10 cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.05)] hover:shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                    : 'border-white/10 bg-black/20 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <span className="text-2xl dropdown-shadow">{game.status === 'available' ? '⚡' : '🔮'}</span>
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
            </m.button>
          ))}
        </div>
      </div>
    </div>
  )
}
