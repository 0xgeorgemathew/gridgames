'use client'

import { useState, useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { cn } from '@/platform/utils/classNames.utils'
import { formatPrice } from '@/platform/utils/price.utils'
import type { Position } from '@/domains/hyper-swiper/shared/trading.types'

function PositionCard({
  position,
  index,
  priceData,
  onClose,
  isClosing,
  closingReason,
  realizedPnl,
}: {
  position: Position
  index: number
  priceData: any
  onClose: (id: string) => void
  isClosing: boolean
  closingReason?: 'manual' | 'liquidated'
  realizedPnl?: number
}) {
  const [isMinimized, setIsMinimized] = useState(false)
  const hasAnimatedClose = useRef(false)

  // Auto minimize faster
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // When closing starts, ensure we show the close animation
  useEffect(() => {
    if (isClosing) {
      hasAnimatedClose.current = true
    }
  }, [isClosing])

  // Real-time PnL calculation
  const currentPrice = priceData?.price ?? position.openPrice
  const priceChangePercent = (currentPrice - position.openPrice) / position.openPrice
  const directionMultiplier = position.isLong ? 1 : -1
  const pnlPercent = priceChangePercent * directionMultiplier * position.leverage * 100

  // Border and glow styles based on PnL
  const isInProfit = (realizedPnl ?? pnlPercent) > 0
  const isNearZero = Math.abs(pnlPercent) < 0.5
  const isLiquidated = closingReason === 'liquidated'

  function getBorderStyle(): string {
    if (isLiquidated) {
      return 'border-2 border-red-500/80 shadow-[0_0_25px_rgba(248,113,113,0.5)]'
    }
    if (isClosing) {
      return 'border-2 border-tron-cyan/60 shadow-[0_0_20px_rgba(0,243,255,0.4)]'
    }
    if (isNearZero) {
      return 'border border-tron-cyan/30'
    }
    if (isInProfit) {
      return 'border-2 border-green-500/60 shadow-[0_0_18px_rgba(74,222,128,0.35)]'
    }
    return 'border-2 border-red-500/60 shadow-[0_0_18px_rgba(248,113,113,0.35)]'
  }

  function getPnlTextColor(nearZero: boolean, inProfit: boolean): string {
    if (nearZero) {
      return 'text-tron-cyan'
    }
    if (inProfit) {
      return 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]'
    }
    return 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]'
  }

  const borderStyle = getBorderStyle()

  // Faster, snappy spring config
  const smoothSpring = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
    mass: 0.5,
  }

  // Get PnL display values
  const displayPnl = realizedPnl ?? pnlPercent
  const pnlText = isClosing
    ? `${displayPnl >= 0 ? '+' : ''}$${Math.abs(displayPnl).toFixed(2)}`
    : `${isInProfit ? '+' : ''}${displayPnl.toFixed(2)}%`

  // When closing, always show minimized state (collapsed content)
  const showCollapsedContent = isMinimized || isClosing

  return (
    <m.div
      key={position.id}
      layout
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{
        y: -20,
        opacity: 0,
        scale: 0.9,
        filter: 'blur(4px)',
      }}
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
        exit: {
          duration: 0.4,
          ease: 'easeOut',
        },
      }}
      className={cn(
        'glass-panel-vibrant mb-1.5 relative flex-shrink-0 pointer-events-auto overflow-hidden',
        borderStyle
      )}
      style={{ willChange: 'transform, opacity' }}
      onClick={() => !isClosing && onClose(position.id)}
    >
      {/* Animated glow effect for profit/loss */}
      {!isNearZero && !isClosing && (
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

      {/* Closing/Liquidation flash effect */}
      <AnimatePresence>
        {isClosing && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isLiquidated
                ? 'radial-gradient(circle at center, rgba(248,113,113,0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle at center, rgba(0,243,255,0.2) 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-center p-2 gap-2">
        {/* Single arrow indicator with scale animation */}
        <m.div
          animate={{ scale: showCollapsedContent ? 0.85 : 1 }}
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
        <div className="relative flex items-center flex-1 overflow-hidden">
          {/* Expanded content - width animation collapses layout space */}
          <m.div
            animate={{
              width: showCollapsedContent ? 0 : 'auto',
              opacity: showCollapsedContent ? 0 : 1,
            }}
            transition={smoothSpring}
            className="flex items-center gap-2 overflow-hidden origin-left"
            style={{
              visibility: showCollapsedContent ? 'hidden' : 'visible',
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

          {/* Collapsed content - shows PnL or Closing state */}
          <m.div
            animate={{
              width: showCollapsedContent ? 'auto' : 0,
              opacity: showCollapsedContent ? 1 : 0,
            }}
            transition={smoothSpring}
            className="flex items-center overflow-hidden"
            style={{
              visibility: showCollapsedContent ? 'visible' : 'hidden',
              willChange: 'width, opacity',
            }}
          >
            {/* Closing/Liquidation animated text */}
            <AnimatePresence mode="wait">
              {isClosing ? (
                <m.div
                  key="closing"
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'text-[11px] font-black font-mono leading-none tracking-wider',
                      isLiquidated ? 'text-red-400' : 'text-tron-cyan'
                    )}
                  >
                    {isLiquidated ? 'LIQUIDATED' : 'CLOSED'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold font-mono leading-none',
                      realizedPnl !== undefined && realizedPnl >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    )}
                  >
                    {realizedPnl !== undefined
                      ? `${realizedPnl >= 0 ? '+' : ''}$${Math.abs(realizedPnl).toFixed(2)}`
                      : pnlText}
                  </span>
                </m.div>
              ) : (
                <m.span
                  key="pnl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'text-[11px] font-black font-mono leading-none inline-block text-right ml-0.5',
                    'min-w-[48px]',
                    getPnlTextColor(isNearZero, isInProfit)
                  )}
                >
                  {pnlText}
                </m.span>
              )}
            </AnimatePresence>
          </m.div>
        </div>
      </div>
    </m.div>
  )
}

export function PositionIndicator() {
  const { openPositions, localPlayerId, priceData, closePosition, closingPositions } =
    useTradingStore()

  // Get local player's open positions - positions in closing state are still in openPositions
  // until the animation completes
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
          <AnimatePresence mode="popLayout">
            {localPositions.map((position, index) => {
              const closingState = closingPositions.get(position.id)
              return (
                <PositionCard
                  key={position.id}
                  position={position}
                  index={index}
                  priceData={priceData}
                  onClose={closePosition}
                  isClosing={!!closingState}
                  closingReason={closingState?.reason}
                  realizedPnl={closingState?.realizedPnl}
                />
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
