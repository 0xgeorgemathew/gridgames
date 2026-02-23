'use client'

import { useState, useEffect } from 'react'
import { m } from 'framer-motion'
import { useTradingStore } from '../game/stores/trading-store'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatPrice'
import type { Position } from '../game/types/trading'

function PositionCard({
  position,
  index,
  priceData,
  onClose,
}: {
  position: Position
  index: number
  priceData: any
  onClose: (id: string) => void
}) {
  const [isMinimized, setIsMinimized] = useState(false)

  // Auto minimize faster
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // Real-time PnL calculation
  const currentPrice = priceData?.price ?? position.openPrice
  const priceChangePercent = (currentPrice - position.openPrice) / position.openPrice
  const directionMultiplier = position.isLong ? 1 : -1
  const pnlPercent = priceChangePercent * directionMultiplier * position.leverage * 100

  // Border and glow styles based on PnL
  const isInProfit = pnlPercent > 0
  const isNearZero = Math.abs(pnlPercent) < 0.5
  const borderStyle = isNearZero
    ? 'border border-tron-cyan/30'
    : isInProfit
      ? 'border-2 border-green-500/60 shadow-[0_0_18px_rgba(74,222,128,0.35)]'
      : 'border-2 border-red-500/60 shadow-[0_0_18px_rgba(248,113,113,0.35)]'

  // Faster, snappy spring config
  const smoothSpring = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
    mass: 0.5,
  }

  return (
    <m.div
      key={position.id}
      layout
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.9 }}
      transition={{
        y: {
          type: 'spring',
          damping: 20,
          stiffness: 200,
          delay: index * 0.08,
        },
        opacity: {
          duration: 0.3,
          delay: index * 0.08,
        },
      }}
      className={cn(
        'glass-panel-vibrant mb-1.5 relative flex-shrink-0 pointer-events-auto',
        borderStyle
      )}
      style={{ willChange: 'transform, opacity' }}
      onClick={() => onClose(position.id)}
    >
      {/* Animated glow effect for profit/loss */}
      {!isNearZero && (
        <m.div
          className="absolute inset-0 pointer-events-none rounded-xl"
          animate={{
            opacity: [0.08, 0.16, 0.08],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
          style={{
            background: isInProfit
              ? 'radial-gradient(circle at center, rgba(74,222,128,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(248,113,113,0.15) 0%, transparent 70%)',
          }}
        />
      )}

      <div className="relative flex items-center p-2 gap-2">
        {/* Single arrow indicator with scale animation */}
        <m.div
          animate={{ scale: isMinimized ? 0.85 : 1 }}
          transition={smoothSpring}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
            position.isLong ? 'bg-green-500/20' : 'bg-red-500/20'
          )}
          style={{ willChange: 'transform' }}
        >
          <span className={cn('text-base', position.isLong ? 'text-green-400' : 'text-red-400')}>
            {position.isLong ? '▲' : '▼'}
          </span>
        </m.div>

        {/* Content wrapper */}
        <div className="relative flex items-center">
          {/* Expanded content - width animation collapses layout space */}
          <m.div
            animate={{
              width: isMinimized ? 0 : 'auto',
              opacity: isMinimized ? 0 : 1,
            }}
            transition={smoothSpring}
            className="flex items-center gap-2 overflow-hidden origin-left"
            style={{
              visibility: isMinimized ? 'hidden' : 'visible',
              willChange: 'width, opacity',
            }}
          >
            {/* Entry price */}
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-[9px] text-tron-white-dim uppercase tracking-wider truncate leading-none mb-0.5">
                Entry
              </span>
              <span className="text-[14px] font-mono font-bold text-tron-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.5)] leading-none">
                ${formatPrice(position.openPrice)}
              </span>
            </div>

            {/* Leverage badge */}
            {position.leverage > 1 && (
              <div
                className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0',
                  position.leverage === 2 &&
                    'bg-green-500/30 border border-green-500/50 text-green-300',
                  position.leverage === 5 &&
                    'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300',
                  position.leverage === 10 && 'bg-red-500/30 border border-red-500/50 text-red-300',
                  ![2, 5, 10].includes(position.leverage) &&
                    'bg-cyan-500/30 border border-cyan-500/50 text-cyan-200'
                )}
              >
                {position.leverage}X
              </div>
            )}

            {/* LONG/SHORT badge */}
            <div
              className={cn(
                'px-1.5 py-1 rounded-lg text-[10px] font-bold font-mono shrink-0',
                position.isLong && 'bg-green-500/20 text-green-400 border border-green-500/30',
                !position.isLong && 'bg-red-500/20 text-red-400 border border-red-500/30'
              )}
            >
              {position.isLong ? 'LONG' : 'SHORT'}
            </div>
          </m.div>

          {/* Collapsed content - in flow, expands when minimized */}
          <m.div
            animate={{
              width: isMinimized ? 'auto' : 0,
              opacity: isMinimized ? 1 : 0,
            }}
            transition={smoothSpring}
            className="flex items-center overflow-hidden"
            style={{
              visibility: isMinimized ? 'visible' : 'hidden',
              willChange: 'width, opacity',
            }}
          >
            <span
              className={cn(
                'text-[11px] font-black font-mono leading-none inline-block text-right ml-0.5',
                'min-w-[48px]',
                isNearZero
                  ? 'text-tron-cyan'
                  : isInProfit
                    ? 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]'
                    : 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]'
              )}
            >
              {isInProfit ? '+' : ''}
              {pnlPercent.toFixed(2)}%
            </span>
          </m.div>
        </div>
      </div>
    </m.div>
  )
}

export function PositionIndicator() {
  const { openPositions, localPlayerId, priceData, closePosition } = useTradingStore()

  // Get local player's open positions
  const localPositions = Array.from(openPositions.values())
    .filter((pos) => pos.playerId === localPlayerId && pos.status === 'open')
    .sort((a, b) => b.openedAt - a.openedAt)

  return (
    <div className="fixed left-0 right-0 z-20 px-3 pb-2 bottom-32 pointer-events-none">
      <div className="max-w-2xl mx-auto flex flex-col items-end">
        <div
          className="flex flex-col items-end overflow-y-auto pointer-events-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
          style={{
            maxHeight: '260px',
            scrollbarWidth: 'none',
          }}
        >
          {localPositions.map((position, index) => (
            <PositionCard
              key={position.id}
              position={position}
              index={index}
              priceData={priceData}
              onClose={closePosition}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
