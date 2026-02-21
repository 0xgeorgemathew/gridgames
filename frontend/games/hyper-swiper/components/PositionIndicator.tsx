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

  // Auto minimize after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(true)
    }, 3500)
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

  // Very slow, buttery smooth spring config
  const smoothSpring = {
    type: 'spring' as const,
    stiffness: 50,
    damping: 20,
    mass: 0.8,
  }

  return (
    <m.div
      layout
      key={position.id}
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
        layout: smoothSpring,
      }}
      className={cn(
        'glass-panel-vibrant mb-1.5 relative flex-shrink-0 transition-shadow',
        'pointer-events-auto cursor-pointer rounded-xl p-2',
        borderStyle,
      )}
      onClick={() => onClose(position.id)}
    >
      {/* Animated glow effect for profit/loss */}
      {!isNearZero && (
        <m.div
          className="absolute inset-0 pointer-events-none"
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

      {/* Relative container for proper sizing */}
      <div className="relative">
        {/* Full content - position changes instantly via className, only opacity animates */}
        <m.div
          animate={{
            opacity: isMinimized ? 0 : 1,
          }}
          transition={smoothSpring}
          className={isMinimized ? 'absolute top-0 left-0 flex items-center justify-between gap-2' : 'flex items-center justify-between gap-2'}
          style={{ visibility: isMinimized ? 'hidden' : 'visible' }}
        >
          {/* Left: Entry Point & Direction */}
          <div className="flex items-center gap-2">
            {/* Direction indicator */}
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center relative shrink-0',
                position.isLong ? 'bg-green-500/20' : 'bg-red-500/20',
              )}
            >
              {position.isLong ? (
                <span className="text-green-400 text-base">▲</span>
              ) : (
                <span className="text-red-400 text-base">▼</span>
              )}
            </div>

            {/* Entry price */}
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-[9px] text-tron-white-dim uppercase tracking-wider truncate leading-none mb-0.5">
                Entry
              </span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[14px] font-mono font-bold text-tron-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.5)] leading-none">
                  ${formatPrice(position.openPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Position type badge with leverage */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Leverage badge */}
            {position.leverage > 1 && (
              <div
                className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-bold',
                  position.leverage === 2 &&
                    'bg-green-500/30 border border-green-500/50 text-green-300',
                  position.leverage === 5 &&
                    'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300',
                  position.leverage === 10 &&
                    'bg-red-500/30 border border-red-500/50 text-red-300',
                  ![2, 5, 10].includes(position.leverage) &&
                    'bg-cyan-500/30 border border-cyan-500/50 text-cyan-200',
                )}
              >
                {position.leverage}X
              </div>
            )}

            <div
              className={cn(
                'px-1.5 py-1 rounded-lg text-[10px] font-bold font-mono',
                position.isLong &&
                  'bg-green-500/20 text-green-400 border border-green-500/30',
                !position.isLong && 'bg-red-500/20 text-red-400 border border-red-500/30',
              )}
            >
              {position.isLong ? 'LONG' : 'SHORT'}
            </div>
          </div>
        </m.div>

        {/* Minimized content - position changes instantly via className, only opacity animates */}
        <m.div
          animate={{
            opacity: isMinimized ? 1 : 0,
          }}
          transition={smoothSpring}
          className={isMinimized ? 'flex items-center gap-1' : 'absolute top-0 left-0 flex items-center gap-1'}
          style={{ visibility: isMinimized ? 'visible' : 'hidden' }}
        >
          {/* Direction indicator - smaller */}
          <div
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center relative shrink-0',
              position.isLong ? 'bg-green-500/20' : 'bg-red-500/20',
            )}
          >
            {position.isLong ? (
              <span className="text-green-400 text-sm">▲</span>
            ) : (
              <span className="text-red-400 text-sm">▼</span>
            )}
          </div>

          {/* PnL percentage - fixed min-width to prevent size changes */}
          <span
            className={cn(
              'text-[11px] font-black font-mono leading-none inline-block text-right ml-0.5',
              'min-w-[48px]',
              isNearZero
                ? 'text-tron-cyan'
                : isInProfit
                  ? 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]'
                  : 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]',
            )}
          >
            {isInProfit ? '+' : ''}
            {pnlPercent.toFixed(2)}%
          </span>
        </m.div>
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
  )
}
