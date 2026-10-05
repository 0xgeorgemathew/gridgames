'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { HowToPlayModal } from '@/domains/hyper-swiper/client/components/modals/HowToPlayModal'
import { CountUp } from '@/platform/ui/CountUp'
import { Settings, Volume2, VolumeX, LogOut } from 'lucide-react'

import { CompactPriceRow } from './CompactPriceRow'
import { PriceLoadingState } from './PriceLoadingState'
import { CRYPTO_SYMBOLS } from './types'

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

  const positive = (priceData?.changePercent ?? 0) >= 0
  const toggleAudio = () => {
    if (typeof window !== 'undefined') {
      ;(window as { phaserEvents?: { emit: (event: string) => void } }).phaserEvents?.emit(
        'unlock_audio'
      )
    }
    toggleSound()
  }

  return (
    <>
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      {isPlaying && (
        <header className="hyper-hud-top">
          <div className="hyper-hud-brand">
            <div>
              <p className="arena-label">Orbital arena / LIVE ROUND</p>
              <strong>
                HYPER <span style={{ color: 'var(--arena-accent)' }}>SWIPER</span>
              </strong>
            </div>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="arena-icon-button"
              aria-label="Round settings"
              aria-expanded={showMenu}
            >
              <Settings size={18} />
            </button>
          </div>
          {priceData && (
            <div className="hyper-price-rail">
              <span className="arena-label">{CRYPTO_SYMBOLS[selectedCrypto]}</span>
              <CountUp value={priceData.price} className="font-numeric text-lg font-bold" />
              <span
                className="font-numeric text-xs font-bold"
                style={{ color: positive ? 'var(--arena-long)' : 'var(--arena-short)' }}
              >
                {positive ? '+' : ''}
                {priceData.changePercent.toFixed(2)}%
              </span>
            </div>
          )}
          {showMenu && (
            <>
              <button
                className="fixed inset-0 z-10 pointer-events-auto cursor-default"
                onClick={() => setShowMenu(false)}
                aria-label="Close settings"
              />
              <div className="arena-panel absolute right-3 top-full mt-2 p-2 flex flex-col gap-1 pointer-events-auto z-20 min-w-44">
                <button className="arena-button flex items-center gap-2" onClick={toggleAudio}>
                  {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {isSoundMuted ? 'Unmute sound' : 'Mute sound'}
                </button>
                <button
                  className="arena-button"
                  onClick={() => {
                    setShowMenu(false)
                    setShowHowToPlay(true)
                  }}
                >
                  How to play
                </button>
                {isGameReady && (
                  <button
                    className="arena-button flex items-center gap-2"
                    style={{ color: 'var(--arena-short)' }}
                    onClick={() => {
                      setShowMenu(false)
                      endGame()
                    }}
                  >
                    <LogOut size={16} />
                    End round
                  </button>
                )}
              </div>
            </>
          )}
        </header>
      )}
      {isPlaying && isShowingLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080b1b]/90 pointer-events-none">
          <div className="arena-panel p-8">
            <PriceLoadingState />
          </div>
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
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
        {isGameOver && !isPlaying && (
          <p className="arena-label text-center py-3">Round complete / Results</p>
        )}
      </div>
    </>
  )
})
