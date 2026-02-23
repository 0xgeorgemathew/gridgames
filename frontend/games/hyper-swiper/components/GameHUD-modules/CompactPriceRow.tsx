'use client'

import React from 'react'
import { m } from 'framer-motion'
import { Info, Volume2, VolumeX, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CountUp } from '@/components/CountUp'
import type { CryptoSymbol } from '../../game/stores/trading-store'
import type { PriceData } from '../../game/types/trading'
import { ConnectionStatusDot } from './ConnectionStatusDot'
import { CRYPTO_SYMBOLS, getPriceColor, formatTime } from './types'

interface CompactPriceRowProps {
  priceData: PriceData | null
  selectedCrypto: CryptoSymbol
  isPriceConnected: boolean
  priceError: string | null
  gameTimeRemaining: number
  isSoundMuted: boolean
  onToggleSound: () => void
  onShowHowToPlay: () => void
  onEndGame: () => void
  isGameReady: boolean
}

/**
 * CompactPriceRow - Single-row layout for price, timer, and action icons.
 * Designed for bottom navigation on mobile.
 *
 * Layout: [●] [BTC $94,123 +2.34%] [1:23] [?] [🔊] [✕]
 */
export const CompactPriceRow = React.memo(function CompactPriceRow({
  priceData,
  selectedCrypto,
  isPriceConnected,
  priceError,
  gameTimeRemaining,
  isSoundMuted,
  onToggleSound,
  onShowHowToPlay,
  onEndGame,
  isGameReady,
}: CompactPriceRowProps) {
  const { color: priceColor, glow: priceGlow } = getPriceColor(priceData?.changePercent ?? 0)
  const isLowTime = gameTimeRemaining <= 30000 // Red when <= 30 seconds

  return (
    <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2">
      {/* Left: Connection dot + Price */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Connection status dot */}
        <div className="shrink-0">
          <ConnectionStatusDot isPriceConnected={isPriceConnected} priceError={priceError} />
        </div>

        {/* Price display */}
        {priceData ? (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[10px] sm:text-xs text-tron-white-dim uppercase tracking-wider font-bold shrink-0">
              {CRYPTO_SYMBOLS[selectedCrypto as CryptoSymbol]}
            </span>

            <CountUp
              value={priceData.price}
              className={cn(
                'text-base sm:text-xl font-black font-numeric tracking-tight truncate',
                priceColor
              )}
              style={{ textShadow: priceGlow }}
            />

            <m.span
              className={cn(
                'text-[10px] sm:text-xs font-bold font-numeric shrink-0 px-1.5 py-0.5 rounded',
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
            </m.span>
          </div>
        ) : (
          <span className="text-xs text-tron-white-dim animate-pulse">Loading...</span>
        )}
      </div>

      {/* Center: Timer (only when game is ready) */}
      {isGameReady && (
        <div className="flex items-center justify-center min-w-[70px] px-3 py-1 my-1 bg-tron-black/80 border border-tron-cyan/30 rounded-sm hologram shrink-0 relative overflow-hidden">
          {/* Subtle repeating scanline effect for timer */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,243,255,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />
          <span
            className={cn(
              'text-sm sm:text-base font-black font-numeric tracking-wider z-10',
              isLowTime ? 'text-red-400 animate-pulse' : 'text-tron-cyan'
            )}
            style={{
              textShadow: isLowTime
                ? '0 0 10px rgba(248,113,113,0.5)'
                : '0 0 8px rgba(0,243,255,0.6)',
            }}
          >
            {formatTime(gameTimeRemaining)}
          </span>
        </div>
      )}

      {/* Right: Action icons */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2 ml-1 border-l border-tron-cyan/30">
        <button
          onClick={onShowHowToPlay}
          className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center bg-tron-black/60 border border-tron-cyan/30 hover:border-tron-cyan hover:bg-tron-cyan/20 rounded-sm transition-all hologram group"
          title="How to play"
        >
          <Info className="w-4 h-4 text-tron-cyan/80 group-hover:text-tron-cyan group-hover:drop-shadow-[0_0_8px_var(--color-tron-cyan)] transition-colors" />
        </button>

        <button
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).phaserEvents) {
              // Always attempt unlock when toggling sound - this fixes mobile audio
              ;(window as any).phaserEvents.emit('unlock_audio')
            }
            onToggleSound()
          }}
          className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center bg-tron-black/60 border border-tron-cyan/30 hover:border-tron-cyan hover:bg-tron-cyan/20 rounded-sm transition-all hologram group"
          title={isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isSoundMuted ? (
            <VolumeX className="w-4 h-4 text-tron-orange/80 group-hover:text-tron-orange transition-colors" />
          ) : (
            <Volume2 className="w-4 h-4 text-tron-cyan/80 group-hover:text-tron-cyan group-hover:drop-shadow-[0_0_8px_var(--color-tron-cyan)] transition-colors" />
          )}
        </button>

        {isGameReady && (
          <button
            onClick={onEndGame}
            className="w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center bg-tron-black/60 border border-tron-orange/30 hover:border-tron-orange hover:bg-tron-orange/20 rounded-sm transition-all shadow-[0_0_10px_rgba(255,107,0,0.1)] group"
            title="End game early"
          >
            <LogOut className="w-4 h-4 text-tron-orange/70 group-hover:text-tron-orange group-hover:drop-shadow-[0_0_8px_var(--color-tron-orange)] transition-colors" />
          </button>
        )}
      </div>
    </div>
  )
})
