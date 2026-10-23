'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { HowToPlayModal } from '@/domains/hyper-swiper/client/components/modals/HowToPlayModal'
import { AnimatePresence, m } from 'framer-motion'
import { cn } from '@/platform/utils/classNames.utils'
import { CountUp } from '@/platform/ui/CountUp'
import { Settings, Volume2, VolumeX, LogOut } from 'lucide-react'

import { MatchStatusStrip } from '@/platform/ui/MatchStatusStrip'
import { CLIENT_GAME_CONFIG as CFG } from '../../game.config'
import { CompactPriceRow } from './CompactPriceRow'
import { PriceLoadingState } from './PriceLoadingState'
import { containerVariants, CRYPTO_SYMBOLS, getPriceColor } from './types'

export const GameHUD = React.memo(function GameHUD() {
  const players = useTradingStore((state) => state.players)
  const openPositions = useTradingStore((state) => state.openPositions)
  const localPlayerId = useTradingStore((state) => state.localPlayerId)
  const priceData = useTradingStore((state) => state.priceData)
  const isPriceConnected = useTradingStore((state) => state.isPriceConnected)
  const selectedCrypto = useTradingStore((state) => state.selectedCrypto)
  const connectPriceFeed = useTradingStore((state) => state.connectPriceFeed)
  const isPlaying = useTradingStore((state) => state.isPlaying)
  const isGameOver = useTradingStore((state) => state.isGameOver)
  const playAgain = useTradingStore((state) => state.playAgain)
  const endGame = useTradingStore((state) => state.endGame)
  const priceError = useTradingStore((state) => state.priceError)
  const gameTimeRemaining = useTradingStore((state) => state.gameTimeRemaining)
  const isSoundMuted = useTradingStore((state) => state.isSoundMuted)
  const toggleSound = useTradingStore((state) => state.toggleSound)

  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const hasAttemptedConnectionRef = useRef(false)

  useEffect(() => {
    if (!hasAttemptedConnectionRef.current && !isPriceConnected) {
      connectPriceFeed(selectedCrypto)
      hasAttemptedConnectionRef.current = true
    }
  }, [isPriceConnected, selectedCrypto, connectPriceFeed])

  const localPlayer = players.find((p) => p.id === localPlayerId)
  const opponent = players.find((p) => p.id !== localPlayerId)

  const isGameReady = isPriceConnected && priceData !== null && isPlaying && gameTimeRemaining > 0
  const isShowingLoading = !isPriceConnected || priceData === null

  const { color: priceColor, glow: priceGlow } = getPriceColor(priceData?.changePercent ?? 0)

  return (
    <>
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />

      {/* TOP: Floating BTC Price Display + Gear Menu */}
      <AnimatePresence>
        {isPlaying && priceData && (
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-30 pt-safe"
          >
            <div className="flex justify-start px-3 pt-3 relative">
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-tron-black/90 backdrop-blur-md border border-tron-cyan/30 rounded-full"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(0,243,255,0.1)',
                }}
              >
                <span
                  className="text-[10px] text-tron-cyan/60 uppercase tracking-[0.2em] font-bold"
                  style={{ textShadow: '0 0 6px rgba(0,243,255,0.4)' }}
                >
                  {CRYPTO_SYMBOLS[selectedCrypto as keyof typeof CRYPTO_SYMBOLS]}
                </span>
                <CountUp
                  value={priceData.price}
                  className={cn('text-sm font-bold font-numeric', priceColor)}
                  style={{ textShadow: priceGlow }}
                />
                <m.span
                  className={cn(
                    'text-[11px] font-bold font-numeric px-1.5 py-0.5 rounded-full',
                    priceData.changePercent >= 0
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-red-400 bg-red-500/10'
                  )}
                  style={{
                    textShadow:
                      priceData.changePercent >= 0
                        ? '0 0 8px rgba(74,222,128,0.6)'
                        : '0 0 8px rgba(248,113,113,0.6)',
                  }}
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {priceData.changePercent >= 0 ? '+' : ''}
                  {priceData.changePercent.toFixed(2)}%
                </m.span>
              </div>

              {/* Floating Gear Button */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-tron-black/80 border border-tron-cyan/30 rounded-full focus-visible:outline-2 focus-visible:outline-tron-cyan hover:bg-tron-cyan/10 active:bg-tron-cyan/20 transition-colors z-20"
                title="Settings"
                aria-label="Game settings"
                aria-expanded={showMenu}
              >
                <Settings className="w-4 h-4 text-tron-cyan/70" />
              </button>

              {/* Settings Menu Dropdown */}
              <AnimatePresence>
                {showMenu && (
                  <>
                    <m.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-2 mt-2 flex flex-col gap-1 bg-tron-black/95 border border-tron-cyan/30 rounded-lg overflow-hidden z-30 min-w-[120px]"
                      style={{
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 20px rgba(0,243,255,0.1)',
                      }}
                    >
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined' && (window as any).phaserEvents) {
                            ;(window as any).phaserEvents.emit('unlock_audio')
                          }
                          toggleSound()
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 hover:bg-tron-cyan/10 active:bg-tron-cyan/20 transition-colors"
                      >
                        {isSoundMuted ? (
                          <>
                            <VolumeX className="w-4 h-4 text-tron-orange/70" />
                            <span className="text-sm text-tron-orange/70">Unmute</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 text-tron-cyan/70" />
                            <span className="text-sm text-tron-cyan/70">Mute</span>
                          </>
                        )}
                      </button>

                      {isGameReady && (
                        <button
                          onClick={() => {
                            setShowMenu(false)
                            endGame()
                          }}
                          className="flex items-center gap-2 px-3 py-2.5 hover:bg-tron-orange/10 active:bg-tron-orange/20 transition-colors border-t border-tron-cyan/20"
                        >
                          <LogOut className="w-4 h-4 text-tron-orange/60" />
                          <span className="text-sm text-tron-orange/60">Exit</span>
                        </button>
                      )}
                    </m.div>

                    {/* Backdrop */}
                    <m.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                  </>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        )}
      </AnimatePresence>

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
          <m.div className="game-hud-dock">
            <div className="relative z-10">
              {isGameReady && localPlayer && opponent && (
                <MatchStatusStrip
                  playerBalance={localPlayer.dollars}
                  opponentBalance={opponent.dollars}
                  playerOpenPositions={
                    Array.from(openPositions.values()).filter(
                      (position) =>
                        position.playerId === localPlayerId && position.status === 'open'
                    ).length
                  }
                  opponentOpenPositions={
                    Array.from(openPositions.values()).filter(
                      (position) =>
                        position.playerId !== localPlayerId && position.status === 'open'
                    ).length
                  }
                  stakeAmount={CFG.STAKE_AMOUNT}
                  controlHint="SWIPE DISCS"
                />
              )}
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
                  playerBalance={localPlayer?.dollars}
                  opponentBalance={opponent?.dollars}
                  playerName={localPlayer?.name}
                  opponentName={opponent?.name}
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
