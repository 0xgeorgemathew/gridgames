'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { CountUp } from '@/platform/ui/CountUp'
import { Settings, Volume2, VolumeX, LogOut } from 'lucide-react'
import { CompactPriceRow } from './CompactPriceRow'
import { PriceLoadingState } from './PriceLoadingState'
import { CRYPTO_SYMBOLS } from './types'
import styles from '../stage.module.css'

export const GameHUD = React.memo(function GameHUD() {
  const {
    players, localPlayerId, priceData, isPriceConnected, selectedCrypto,
    connectPriceFeed, isPlaying, isGameOver, endGame, priceError,
    gameTimeRemaining, isSoundMuted, toggleSound,
  } = useTradingStore()
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
  return (
    <>
      {isPlaying && priceData && (
        <header className={styles.ticker}>
          <div className={styles.tickerMarket}>
            <span className="arena-label">Tap Dancer</span>
            <span className={styles.live}>LIVE MARKET</span>
          </div>
          <div className={styles.tickerPrice}>
            <span className="arena-label">{CRYPTO_SYMBOLS[selectedCrypto as keyof typeof CRYPTO_SYMBOLS]}</span>
            <CountUp value={priceData.price} className={styles.price} />
            <span className={priceData.changePercent >= 0 ? styles.positive : styles.negative}>
              {priceData.changePercent >= 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
            </span>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="arena-icon-button" aria-label="Settings" aria-expanded={showMenu}>
            <Settings size={18} />
          </button>
          {showMenu && (
            <>
              <button className={styles.menuBackdrop} onClick={() => setShowMenu(false)} aria-label="Close settings" />
              <div className={styles.menu}>
                <button className="arena-button" onClick={() => {
                  window.phaserEvents?.emit('unlock_audio')
                  toggleSound()
                }}>
                  {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {isSoundMuted ? 'Unmute' : 'Mute'}
                </button>
                {isGameReady && (
                  <button className="arena-button" onClick={() => { setShowMenu(false); endGame() }}>
                    <LogOut size={16} /> Exit match
                  </button>
                )}
              </div>
            </>
          )}
        </header>
      )}
      {isPlaying && isShowingLoading && (
        <div className={styles.loading}><div className="arena-panel p-8"><PriceLoadingState /></div></div>
      )}
      <footer className={styles.scoreboard}>
        {isPlaying && (
          <CompactPriceRow
            priceData={priceData} selectedCrypto={selectedCrypto}
            isPriceConnected={isPriceConnected} priceError={priceError}
            gameTimeRemaining={gameTimeRemaining} isSoundMuted={isSoundMuted}
            onToggleSound={toggleSound} onShowHowToPlay={() => {}}
            onEndGame={endGame} isGameReady={isGameReady}
            playerBalance={localPlayer?.dollars} opponentBalance={opponent?.dollars}
            playerName={localPlayer?.name} opponentName={opponent?.name}
          />
        )}
        {isGameOver && !isPlaying && <p className="arena-label text-center py-3">Round complete</p>}
      </footer>
    </>
  )
})
