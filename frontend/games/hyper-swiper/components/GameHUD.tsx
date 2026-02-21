'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTradingStore } from '../game/stores/trading-store'
import { HowToPlayModal } from './HowToPlayModal'
import { AnimatePresence, m } from 'framer-motion'

// Import extracted components
import {
  CompactPriceRow,
  PriceLoadingState,
  SinglePlayerHealth,
  containerVariants,
} from './GameHUD-modules'

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

      {/* Bottom Navigation HUD */}
      <m.div
        className="fixed bottom-0 left-0 right-0 z-30 pt-3 pb-safe pb-6 bottom-nav-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div>
          <m.div
            className="glass-panel-vibrant rounded-t-xl overflow-hidden"
            animate={{
              boxShadow: [
                '0 0 20px rgba(0,243,255,0.1), inset 0 0 20px rgba(0,243,255,0.03)',
                '0 0 30px rgba(0,243,255,0.15), inset 0 0 30px rgba(0,243,255,0.05)',
                '0 0 20px rgba(0,243,255,0.1), inset 0 0 20px rgba(0,243,255,0.03)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
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

            {/* Divider */}
            {isGameReady && (
              <m.div
                className="h-px bg-gradient-to-r from-transparent via-tron-cyan/50 to-transparent"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            {/* Single Player Health - Only when game is ready */}
            {isGameReady && localPlayer && (
              <div className="p-2 sm:p-3">
                <SinglePlayerHealth dollars={localPlayer.dollars} />
              </div>
            )}

            {/* Game Over - Play Again Button */}
            <AnimatePresence>
              {isGameOver && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex justify-center p-3"
                >
                  <m.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={playAgain}
                    className="px-6 py-2 bg-tron-cyan/20 border border-tron-cyan/40 rounded-lg backdrop-blur-sm"
                  >
                    <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-tron-cyan font-medium">
                      PLAY AGAIN
                    </span>
                  </m.button>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        </div>
      </m.div>
    </>
  )
})
