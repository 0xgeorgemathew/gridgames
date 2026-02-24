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

      {/* Game Over Overlay - TRON styled */}
      <AnimatePresence>
        {isGameOver && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none"
          >
            <m.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="pointer-events-auto text-center"
            >
              {/* Game Over Panel - Angular TRON design */}
              <div className="relative">
                {/* Outer glow frame */}
                <m.div
                  className="absolute -inset-3 bg-tron-cyan/10"
                  style={{ clipPath: 'polygon(0 10%, 10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%)' }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Main panel */}
                <div
                  className="relative glass-panel-vibrant p-6 border-2 border-tron-cyan/60 bg-tron-black/90"
                  style={{ clipPath: 'polygon(0 8%, 8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%)' }}
                >
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-tron-cyan" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-tron-cyan" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-tron-cyan" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-tron-cyan" />

                  {/* Scanline effect */}
                  <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,243,255,0.03)_50%)] bg-[length:100%_4px] pointer-events-none" />

                  <h3
                    className="font-[family-name:var(--font-orbitron)] text-xl tracking-[0.3em] text-tron-cyan mb-5"
                    style={{ textShadow: '0 0 20px rgba(0,243,255,0.8), 0 0 40px rgba(0,243,255,0.4)' }}
                  >
                    GAME OVER
                  </h3>

                  {localPlayer && (
                    <div className="mb-5 py-3 px-6 border border-tron-cyan/30 bg-tron-black/50">
                      <p className="text-tron-cyan/60 text-[10px] tracking-[0.3em] mb-2 font-[family-name:var(--font-orbitron)]">
                        FINAL BALANCE
                      </p>
                      <p
                        className="font-numeric text-3xl font-bold text-tron-cyan"
                        style={{ textShadow: '0 0 15px rgba(0,243,255,0.6)' }}
                      >
                        ${localPlayer.dollars.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <m.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={playAgain}
                    className="relative px-10 py-3 bg-tron-black border border-tron-cyan group overflow-hidden"
                    style={{
                      clipPath: 'polygon(5% 0, 95% 0, 100% 50%, 95% 100%, 5% 100%, 0 50%)',
                    }}
                  >
                    {/* Hover glow effect */}
                    <m.div
                      className="absolute inset-0 bg-tron-cyan/20"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />

                    {/* Animated edge lines */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-tron-cyan to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-tron-cyan to-transparent" />

                    <span
                      className="relative font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-tron-cyan font-medium"
                      style={{ textShadow: '0 0 10px rgba(0,243,255,0.5)' }}
                    >
                      PLAY AGAIN
                    </span>
                  </m.button>
                </div>
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
