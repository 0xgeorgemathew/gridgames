'use client'

import React, { useEffect, useRef } from 'react'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { AnimatePresence, m } from 'framer-motion'

import { CompactPriceRow } from './CompactPriceRow'
import { PriceLoadingState } from './PriceLoadingState'
import { containerVariants } from './types'

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
    endGame,
    priceError,
    gameTimeRemaining,
    isSoundMuted,
    toggleSound,
  } = useTradingStore()

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
      {/* Price Feed Loading Overlay */}
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
                className="glass-panel-vibrant p-8 border border-tron-cyan/30"
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

      {/* Bottom Navigation HUD - Minimal TRON style */}
      <m.div
        className="fixed bottom-0 left-0 right-0 z-30 bottom-nav-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="pb-safe">
          <m.div
            className="relative bg-tron-black/95 backdrop-blur-xl"
            animate={{
              boxShadow: [
                '0 -5px 20px rgba(0,243,255,0.1)',
                '0 -5px 30px rgba(0,243,255,0.15)',
                '0 -5px 20px rgba(0,243,255,0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {/* Top accent line - TRON style */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-tron-cyan/80" />

            {/* Corner accents */}
            <div className="absolute top-[2px] left-0 w-4 h-[1px] bg-tron-cyan/50" />
            <div className="absolute top-[2px] right-0 w-4 h-[1px] bg-tron-cyan/50" />

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
                  onShowHowToPlay={() => {}}
                  onEndGame={endGame}
                  isGameReady={isGameReady}
                  playerBalance={localPlayer?.dollars}
                />
              )}

              {/* Game Over indicator in HUD */}
              {isGameOver && !isPlaying && (
                <div className="py-2 text-center">
                  <p
                    className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.25em] text-tron-cyan/50"
                    style={{ textShadow: '0 0 8px rgba(0,243,255,0.3)' }}
                  >
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
