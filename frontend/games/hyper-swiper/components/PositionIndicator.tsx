'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, m } from 'framer-motion'
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

  // Shared spring config for smooth morphing - high damping prevents overshoot/squeeze
  const morphSpring = {
    type: 'spring' as const,
    stiffness: 100,
    damping: 20,
    mass: 1,
  }

  return (
    <m.div
      layout
      key={position.id}
      initial={{ y: 80, opacity: 0, borderRadius: 26 }}
      animate={{
        y: 0,
        opacity: 1,
        borderRadius: isMinimized ? 28 : 26,
        width: isMinimized ? 56 : '100%',
      }}
      exit={{ y: 40, opacity: 0, scale: 0.9 }}
      transition={{
        y: {
          type: 'spring',
          damping: 20,
          stiffness: 200,
          delay: isMinimized ? 0 : index * 0.08,
        },
        opacity: {
          duration: 0.3,
          delay: isMinimized ? 0 : index * 0.08,
        },
        layout: morphSpring,
        borderRadius: morphSpring,
        width: morphSpring,
      }}
      className={cn(
        'glass-panel-vibrant mb-1.5 relative overflow-hidden flex-shrink-0 transition-shadow',
        'pointer-events-auto cursor-pointer',
        borderStyle,
        isMinimized ? 'h-14 p-0 ml-auto' : 'h-auto p-2',
      )}
      style={{ width: '100%' }}
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

      <AnimatePresence mode="popLayout">
        {!isMinimized ? (
          <m.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
            transition={{ duration: 0.25 }}
            className="relative flex items-center justify-between gap-2 w-full"
          >
            {/* Left: Entry Point & Direction */}
            <div className="flex items-center gap-2">
              {/* Direction indicator with layoutId for smooth morphing */}
              <m.div
                layoutId={`direction-icon-${position.id}`}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center relative shrink-0',
                  position.isLong ? 'bg-green-500/20' : 'bg-red-500/20',
                )}
                animate={{ y: [0, -3, 0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {position.isLong ? (
                  <span className="text-green-400 text-lg">▲</span>
                ) : (
                  <span className="text-red-400 text-lg">▼</span>
                )}

                {/* Pulse ring */}
                <m.div
                  className={cn(
                    'absolute inset-0 rounded-lg',
                    position.isLong ? 'border border-green-400' : 'border border-red-400',
                  )}
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                />
              </m.div>

              {/* Entry price with current price */}
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-tron-white-dim uppercase tracking-wider truncate">
                  Entry
                </span>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-sm font-mono font-bold text-tron-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.5)]">
                    ${formatPrice(position.openPrice)}
                  </span>
                  {/* Current price indicator */}
                  <m.span
                    className={cn(
                      'text-[10px] font-mono font-medium',
                      isInProfit
                        ? 'text-green-400'
                        : isNearZero
                          ? 'text-tron-white-dim'
                          : 'text-red-400',
                    )}
                    animate={
                      isInProfit
                        ? {
                            scale: [1, 1.05, 1],
                            opacity: [1, 0.8, 1],
                          }
                        : {}
                    }
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {isInProfit ? '↑' : isNearZero ? '→' : '↓'}
                  </m.span>
                  <span
                    className={cn(
                      'text-xs font-mono',
                      isInProfit
                        ? 'text-green-400'
                        : isNearZero
                          ? 'text-tron-white-dim'
                          : 'text-red-400',
                    )}
                  >
                    ${formatPrice(currentPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Real-time PnL (percentage only) */}
            <div className="flex-1 flex items-center justify-center min-w-0">
              <m.div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg shrink-0',
                  isNearZero
                    ? 'bg-black/30 border border-tron-cyan/20'
                    : isInProfit
                      ? 'bg-green-500/20 border border-green-500/40'
                      : 'bg-red-500/20 border border-red-500/40',
                )}
                animate={
                  !isNearZero
                    ? {
                        scale: [1, 1.02, 1],
                      }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span
                  className={cn(
                    'text-lg font-black font-mono relative',
                    isNearZero
                      ? 'text-tron-cyan'
                      : isInProfit
                        ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                        : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.7)]',
                  )}
                >
                  {isInProfit ? '+' : ''}
                  {pnlPercent.toFixed(1)}%
                </span>
              </m.div>
            </div>

            {/* Right: Position type badge with leverage */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Leverage badge */}
              {position.leverage > 1 && (
                <m.div
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
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                >
                  {position.leverage}X
                </m.div>
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
        ) : (
          <m.div
            key="minimized"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 15,
              delay: 0.1,
            }}
            className="flex flex-col items-center justify-center w-full h-full relative z-10"
          >
            {/* Direction indicator - smaller version with same layoutId for smooth morphing */}
            <m.div
              layoutId={`direction-icon-${position.id}`}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center relative',
                position.isLong ? 'bg-green-500/20' : 'bg-red-500/20',
              )}
              transition={morphSpring}
            >
              {position.isLong ? (
                <span className="text-green-400 text-xs">▲</span>
              ) : (
                <span className="text-red-400 text-xs">▼</span>
              )}
            </m.div>

            {/* PnL percentage */}
            <span
              className={cn(
                'text-[10px] font-black font-mono leading-none mt-0.5',
                isNearZero
                  ? 'text-tron-cyan'
                  : isInProfit
                    ? 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]'
                    : 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]',
              )}
            >
              {isInProfit ? '+' : ''}
              {pnlPercent.toFixed(0)}%
            </span>
          </m.div>
        )}
      </AnimatePresence>
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
        <AnimatePresence mode="popLayout">
          {localPositions.map((position, index) => (
            <PositionCard
              key={position.id}
              position={position}
              index={index}
              priceData={priceData}
              onClose={closePosition}
            />
          ))}
        </AnimatePresence>


      </div>
    </div>
  )
}
