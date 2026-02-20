'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GridScanBackground } from '@/components/GridScanBackground'
import { games } from '@/games'

export function GameSelectionScreen() {
  const router = useRouter()

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <GridScanBackground />

      <div className="fixed inset-0 pointer-events-none z-10 opacity-15">
        <motion.div
          className="w-full h-px bg-cyan-400"
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-20 flex flex-col items-center gap-12 px-6">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="font-[family-name:var(--font-orbitron)] text-3xl sm:text-4xl md:text-5xl font-bold tracking-[0.25em] text-white"
          >
            GRID GAMES
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-2 text-sm text-tron-white-dim tracking-widest"
          >
            SELECT YOUR GAME
          </motion.p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md">
          {games.map((game, index) => (
            <motion.button
              key={game.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              onClick={() => router.push(`/${game.slug}`)}
              disabled={game.status !== 'available'}
              className={`
                relative px-6 py-5 rounded-xl overflow-hidden
                border transition-all duration-200
                ${
                  game.status === 'available'
                    ? 'border-cyan-400/30 hover:border-cyan-400/60 bg-black/40 hover:bg-black/60 cursor-pointer'
                    : 'border-white/10 bg-black/20 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <span className="text-2xl">{game.status === 'available' ? '⚡' : '🔮'}</span>
                </div>

                <div className="flex-1 text-left">
                  <h2
                    className={`
                      font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-bold tracking-wider
                      ${game.status === 'available' ? 'text-tron-cyan' : 'text-white/50'}
                    `}
                  >
                    {game.name}
                    {game.status === 'coming-soon' && (
                      <span className="ml-2 text-xs text-white/40">COMING SOON</span>
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-tron-white-dim mt-1">{game.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
                    <span>
                      {game.players.min}-{game.players.max} players
                    </span>
                    {game.duration && (
                      <>
                        <span>•</span>
                        <span>{game.duration}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {game.status === 'available' && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  whileHover={{
                    boxShadow: '0 0 30px rgba(0,243,255,0.2)',
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-12 left-0 right-0 z-20 flex justify-center gap-2">
        {[...Array(7)].map((_, i) => (
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
