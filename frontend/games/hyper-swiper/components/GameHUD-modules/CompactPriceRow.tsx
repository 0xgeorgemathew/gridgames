'use client'

import React from 'react'
import { motion } from 'framer-motion'
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

            <motion.span
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
            </motion.span>
          </div>
        ) : (
          <span className="text-xs text-tron-white-dim animate-pulse">Loading...</span>
        )}
      </div>

      {/* Center: Timer (only when game is ready) */}
      {isGameReady && (
        <div className="flex items-center gap-1 shrink-0 px-2">
          <span
            className={cn(
              'text-sm sm:text-base font-black font-numeric tracking-wider',
              isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
            )}
            style={{
              textShadow: isLowTime
                ? '0 0 10px rgba(248,113,113,0.5)'
                : '0 0 10px rgba(255,255,255,0.3)',
            }}
          >
            {formatTime(gameTimeRemaining)}
          </span>
        </div>
      )}

      {/* Right: Action icons */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          onClick={onShowHowToPlay}
          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-tron-cyan/10 rounded transition-colors"
          title="How to play"
        >
          <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tron-cyan" />
        </button>

        <button
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).phaserEvents) {
              ;(window as any).phaserEvents.emit('unlock_audio')
            }
            onToggleSound()
          }}
          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-tron-cyan/10 rounded transition-colors"
          title={isSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isSoundMuted ? (
            <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tron-orange" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tron-cyan" />
          )}
        </button>

        {isGameReady && (
          <button
            onClick={onEndGame}
            className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-tron-orange/10 rounded transition-colors"
            title="End game early"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tron-orange/70 hover:text-tron-orange" />
          </button>
        )}
      </div>
    </div>
  )
})
