'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { HowToPlayModal } from '@/domains/hyper-swiper/client/components/modals/HowToPlayModal'
import { AnimatePresence, m } from 'framer-motion'

import { CompactPriceRow, PriceLoadingState, SinglePlayerHealth, containerVariants } from './index'

export const GameHUD = React.memo(function GameHUD() {
  const {
    players,
    localPlayerId,
    priceData,
    isPriceConnected,
    selectedCrypto,
    connectPriceFeed,
    isPlaying,
    isGameOver,
    playAgain,
    endGame,
    priceError,
    gameTimeRemaining,
    isSoundMuted,
    toggleSound,
  } = useTradingStore()

  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const hasAttemptedConnectionRef = useRef(false)

  useEffect(() => {
    if (!hasAttemptedConnectionRef.current && !isPriceConnected) {
      connectPriceFeed(selectedCrypto)
      hasAttemptedConnectionRef.current = true
    }
  }, [isPriceConnected, selectedCrypto, connectPriceFeed])

  const localPlayer = players.find((p) => p.id === localPlayerId)

  const isGameReady = isPriceConnected && priceData !== null && isPlaying && gameTimeRemaining > 0
  const isShowingLoading = !isPriceConnected || priceData === null

  return (
    <>
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

      {/* Price Feed Loading Overlay - Full screen when connecting */}
      <AnimatePresence>
        {isPlaying && isShowingLoading && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"
          >
            <div className="text-center">
              <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-panel-vibrant rounded-2xl p-8 border border-tron-cyan/30"
                style={{
                  boxShadow: '0 0 40px rgba(0,243,255,0.2), inset 0 0 40px rgba(0,243,255,0.05)',
                }}
              >
                <PriceLoadingState />
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay with improved design */}
      <AnimatePresence>
        {isGameOver && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
          >
            <m.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="pointer-events-auto text-center"
            >
              {/* Game Over Panel */}
              <div className="glass-panel-vibrant rounded-xl p-6 border border-tron-cyan/40 relative overflow-hidden">
                {/* Animated border glow */}
                <m.div
                  className="absolute inset-0 rounded-xl border-2 border-tron-cyan/30"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.02, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                <h3 className="font-[family-name:var(--font-orbitron)] text-lg tracking-[0.2em] text-tron-cyan mb-4 drop-shadow-[0_0_10px_var(--color-tron-cyan)]">
                  GAME OVER
                </h3>

                {localPlayer && (
                  <div className="mb-4">
                    <p className="text-tron-white-dim text-xs tracking-wider mb-1">FINAL BALANCE</p>
                    <p className="font-numeric text-2xl font-bold text-white">
                      ${localPlayer.dollars.toLocaleString()}
                    </p>
                  </div>
                )}

                <m.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0,243,255,0.5)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={playAgain}
                  className="px-8 py-3 hologram bg-tron-black/60 border border-tron-cyan relative overflow-hidden group rounded-sm"
                >
                  <div className="absolute inset-0 bg-tron-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-tron-cyan font-medium">
                    PLAY AGAIN
                  </span>
                </m.button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation HUD */}
      <m.div
        className="fixed bottom-0 left-0 right-0 z-30 bottom-nav-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="pb-safe">
          <m.div
            className="relative bg-tron-black/95 backdrop-blur-xl border-t border-tron-cyan/40"
            animate={{
              boxShadow: [
                '0 -8px 24px rgba(0,243,255,0.08), inset 0 1px 8px rgba(0,243,255,0.1)',
                '0 -8px 32px rgba(0,243,255,0.12), inset 0 1px 12px rgba(0,243,255,0.15)',
                '0 -8px 24px rgba(0,243,255,0.08), inset 0 1px 8px rgba(0,243,255,0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {/* Background Grid texture */}
            <div className="absolute inset-0 opacity-15 tron-grid pointer-events-none" />

            {/* Top accent line with gradient */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-tron-cyan to-transparent opacity-90" />

            {/* Secondary accent line */}
            <div className="absolute top-[2px] left-1/4 right-1/4 h-[1px] bg-tron-cyan/40" />

            <div className="relative z-10">
              {/* Compact Price Row - Always visible when playing */}
              {isPlaying && (
                <CompactPriceRow
                  priceData={priceData}
                  selectedCrypto={selectedCrypto}
                  isPriceConnected={isPriceConnected}
                  priceError={priceError}
                  gameTimeRemaining={gameTimeRemaining}
                  isSoundMuted={isSoundMuted}
                  onToggleSound={toggleSound}
                  onShowHowToPlay={() => setShowHowToPlay(true)}
                  onEndGame={endGame}
                  isGameReady={isGameReady}
                />
              )}

              {/* Animated Divider */}
              {isGameReady && (
                <m.div
                  className="h-[1px] bg-gradient-to-r from-transparent via-tron-cyan/40 to-transparent mx-2"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* Single Player Health - Only when game is ready */}
              {isGameReady && localPlayer && (
                <div className="px-3 py-2 sm:py-3">
                  <SinglePlayerHealth dollars={localPlayer.dollars} />
                </div>
              )}

              {/* Game Over indicator in HUD (shown briefly before overlay) */}
              {isGameOver && !isPlaying && (
                <div className="py-2 text-center">
                  <p className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan/60">
                    VIEWING RESULTS
                  </p>
                </div>
              )}
            </div>
          </m.div>
        </div>
      </m.div>
    </>
  )
})
