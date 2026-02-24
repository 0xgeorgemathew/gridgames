'use client'

import React from 'react'
import { m } from 'framer-motion'
import { Volume2, VolumeX, LogOut } from 'lucide-react'
import { cn } from '@/platform/utils/classNames.utils'
import { CountUp } from '@/platform/ui/CountUp'
import type { CryptoSymbol } from '@/domains/hyper-swiper/client/state/trading.store'
import type { PriceData } from '@/domains/hyper-swiper/shared/trading.types'
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
  playerBalance?: number
}

/**
 * CompactPriceRow - Single-row minimal TRON layout.
 * Maximum play space with essential info only.
 *
 * Layout: [1:23] [BTC $94,123 +2.34%] [🔊] [✕]
 */
export const CompactPriceRow = React.memo(function CompactPriceRow({
  priceData,
  selectedCrypto,
  gameTimeRemaining,
  isSoundMuted,
  onToggleSound,
  onEndGame,
  isGameReady,
  playerBalance,
}: CompactPriceRowProps) {
  const { color: priceColor, glow: priceGlow } = getPriceColor(priceData?.changePercent ?? 0)
  const isLowTime = gameTimeRemaining <= 30000

  return (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2">
      {/* Left: Timer + Balance */}
      {isGameReady && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center min-w-[48px] px-2 py-1 border-l-2 border-tron-cyan/60 bg-tron-cyan/5">
            <span
              className={cn(
                'text-sm font-black font-numeric tracking-wider',
                isLowTime ? 'text-red-400' : 'text-tron-cyan'
              )}
              style={{
                textShadow: isLowTime
                  ? '0 0 10px rgba(248,113,113,0.6)'
                  : '0 0 10px rgba(0,243,255,0.6)',
              }}
            >
              {formatTime(gameTimeRemaining)}
            </span>
          </div>
          
          {/* Player Balance */}
          {playerBalance !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 border-l border-tron-cyan/30 bg-tron-cyan/5">
              <span className="text-[9px] text-tron-cyan/50 uppercase tracking-wider font-bold">
                $
              </span>
              <span
                className="text-sm font-black font-numeric text-tron-cyan"
                style={{ textShadow: '0 0 8px rgba(0,243,255,0.5)' }}
              >
                {playerBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Center: Price Display */}
      {priceData ? (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center min-w-0">
          <span
            className="text-[10px] text-tron-cyan/50 uppercase tracking-[0.15em] font-bold shrink-0 hidden sm:block"
            style={{ textShadow: '0 0 6px rgba(0,243,255,0.3)' }}
          >
            {CRYPTO_SYMBOLS[selectedCrypto as CryptoSymbol]}
          </span>

          <CountUp
            value={priceData.price}
            className={cn('text-base sm:text-lg font-black font-numeric', priceColor)}
            style={{ textShadow: priceGlow }}
          />

          <m.span
            className={cn(
              'text-[10px] font-bold font-numeric shrink-0 px-1 py-0.5 border-l-2',
              priceData.changePercent >= 0
                ? 'text-green-400 border-green-400/50 bg-green-400/5'
                : 'text-red-400 border-red-400/50 bg-red-400/5'
            )}
            style={{ textShadow: priceGlow }}
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {priceData.changePercent >= 0 ? '+' : ''}
            {priceData.changePercent.toFixed(1)}%
          </m.span>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-tron-cyan/40 animate-pulse">...</span>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).phaserEvents) {
              ;(window as any).phaserEvents.emit('unlock_audio')
            }
            onToggleSound()
          }}
          className="w-8 h-8 flex items-center justify-center border-l border-tron-cyan/30 hover:bg-tron-cyan/10 transition-colors"
          title={isSoundMuted ? 'Unmute' : 'Mute'}
        >
          {isSoundMuted ? (
            <VolumeX className="w-4 h-4 text-tron-orange/70" />
          ) : (
            <Volume2 className="w-4 h-4 text-tron-cyan/70" />
          )}
        </button>

        {isGameReady && (
          <button
            onClick={onEndGame}
            className="w-8 h-8 flex items-center justify-center border-l border-tron-orange/30 hover:bg-tron-orange/10 transition-colors"
            title="End"
          >
            <LogOut className="w-4 h-4 text-tron-orange/60" />
          </button>
        )}
      </div>
    </div>
  )
})
