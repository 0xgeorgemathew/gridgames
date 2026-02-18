'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTradingStore } from '@/game/stores/trading-store'
import { HowToPlayModal } from '@/components/HowToPlayModal'
import { SettlementFlash } from '@/components/SettlementFlash'
import { CountUp } from '@/components/CountUp'
import { Info, Volume2, VolumeX, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { CryptoSymbol } from '@/game/stores/trading-store'

// Import extracted components and helpers
import {
  ConnectionStatusDot,
  PlayerHealthBar,
  RoundHeader,
  PriceLoadingState,
  CRYPTO_SYMBOLS,
  getPriceColor,
  getPlayerSlots,
  containerVariants,
  itemVariants,
} from './GameHUD-modules'

export const GameHUD = React.memo(function GameHUD() {
  const {
    players,
    localPlayerId,
    isPlayer1,
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

  const { color: priceColor, glow: priceGlow } = getPriceColor(priceData?.changePercent ?? 0)

  const localPlayer = players.find((p) => p.id === localPlayerId)
  const opponent = players.find((p) => p.id !== localPlayerId)

  const isGameReady = isPriceConnected && priceData !== null && isPlaying && gameTimeRemaining > 0
  const isShowingLoading = !isPriceConnected || priceData === null

  return (
    <>
      <SettlementFlash />
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

      {/* Price Feed Loading Overlay */}
      <AnimatePresence>
        {isPlaying && isShowingLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-panel-vibrant rounded-2xl p-8 border border-tron-cyan/30"
                style={{
                  boxShadow: '0 0 40px rgba(0,243,255,0.2), inset 0 0 40px rgba(0,243,255,0.05)',
                }}
              >
                <div className="flex flex-col items-center gap-6">
                  {/* Dual spinning rings */}
                  <div className="relative w-20 h-20">
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-tron-cyan/20 border-t-tron-cyan"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-2 rounded-full border-4 border-transparent border-r-tron-orange/30"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-4 rounded-full border-4 border-tron-cyan/10 border-b-tron-cyan/50"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-tron-cyan animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <motion.h2
                      className="text-xl font-black text-tron-cyan tracking-widest"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      INITIALIZING MARKET DATA
                    </motion.h2>
                    <motion.p
                      className="text-sm text-tron-white-dim font-mono"
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    >
                      Connecting to real-time BTC price feed...
                    </motion.p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <motion.div
                      className="flex items-center gap-2 text-tron-cyan/60"
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <div className="w-2 h-2 rounded-full bg-tron-cyan animate-pulse" />
                      <span>ESTABLISHING CONNECTION</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute top-0 left-0 right-0 z-10 p-1.5 sm:p-2 lg:p-3 pointer-events-none"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-3xl sm:max-w-4xl mx-auto space-y-2 sm:space-y-3">
          <motion.div
            className="glass-panel-vibrant rounded-xl overflow-hidden"
            animate={{
              boxShadow: [
                '0 0 20px rgba(0,243,255,0.1), inset 0 0 20px rgba(0,243,255,0.03)',
                '0 0 30px rgba(0,243,255,0.15), inset 0 0 30px rgba(0,243,255,0.05)',
                '0 0 20px rgba(0,243,255,0.1), inset 0 0 20px rgba(0,243,255,0.03)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {/* Price Bar - Top Section */}
            <motion.div
              variants={itemVariants}
              className="p-2 sm:p-3"
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center gap-4"
                initial="hidden"
                animate="visible"
              >
                <div className="w-6 flex justify-center shrink-0">
                  <ConnectionStatusDot
                    isPriceConnected={isPriceConnected}
                    priceError={priceError}
                  />
                </div>

                {priceData ? (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-sm sm:text-base text-tron-white-dim uppercase tracking-[0.2em] font-bold shrink-0">
                      {CRYPTO_SYMBOLS[selectedCrypto as CryptoSymbol]}
                    </span>

                    <CountUp
                      value={priceData.price}
                      className={cn(
                        'text-2xl sm:text-4xl font-black font-mono tracking-tight',
                        priceColor
                      )}
                      style={{ textShadow: priceGlow }}
                    />

                    <motion.span
                      className={cn(
                        'text-sm sm:text-lg font-bold font-mono shrink-0 px-2 py-0.5 rounded',
                        priceData.changePercent >= 0
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      )}
                      style={{ textShadow: priceGlow }}
                      animate={{ opacity: [1, 0.8, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {priceData.changePercent >= 0 ? '+' : ''}
                      {priceData.changePercent.toFixed(2)}%
                    </motion.span>
                  </div>
                ) : (
                  <PriceLoadingState />
                )}

                <button
                  onClick={() => setShowHowToPlay(true)}
                  className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-tron-cyan/10 rounded transition-colors pointer-events-auto shrink-0"
                >
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tron-cyan" />
                </button>

                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).phaserEvents) {
                      ;(window as any).phaserEvents.emit('unlock_audio')
                    }
                    toggleSound()
                  }}
                  className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-tron-cyan/10 rounded transition-colors pointer-events-auto shrink-0"
                  title={isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
                >
                  {isSoundMuted ? (
                    <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tron-orange" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tron-cyan" />
                  )}
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              className="h-px bg-gradient-to-r from-transparent via-tron-cyan/50 to-transparent"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Main Game Area */}
            {isGameReady && (
              <>
                <RoundHeader
                  gameTimeRemaining={gameTimeRemaining}
                />

                <motion.div
                  className="h-px bg-gradient-to-r from-transparent via-tron-cyan/30 to-transparent mx-2"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Health Bars Section */}
                <motion.div
                  variants={itemVariants}
                  className="p-2 sm:p-3"
                  initial="hidden"
                  animate="visible"
                >
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {getPlayerSlots(localPlayer, opponent).map(
                      (slot, index) =>
                        slot.player && (
                          <PlayerHealthBar
                            key={slot.player.id}
                            name={slot.player.name}
                            dollars={slot.player.dollars}
                            color={slot.label === 'YOU' ? 'green' : 'red'}
                            index={index}
                            label={slot.label}
                          />
                        )
                    )}
                  </div>
                </motion.div>

                {/* End Game Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center pt-1"
                >
                  <button
                    onClick={endGame}
                    className="px-3 py-1 text-[10px] font-[family-name:var(--font-orbitron)] tracking-[0.1em] text-white/40 hover:text-white/60 border border-white/10 hover:border-white/20 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    END GAME
                  </button>
                </motion.div>
              </>
            )}

            {/* Game Over - Play Again Button */}
            <AnimatePresence>
              {isGameOver && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex justify-center p-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={playAgain}
                    className="px-6 py-2 bg-tron-cyan/20 border border-tron-cyan/40 rounded-lg backdrop-blur-sm"
                  >
                    <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-tron-cyan font-medium">
                      PLAY AGAIN
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </>
  )
})
