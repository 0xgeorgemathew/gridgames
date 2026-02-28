'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { cn } from '@/platform/utils/classNames.utils'
import { formatPrice } from '@/platform/utils/price.utils'
import type { Position, PriceData } from '@/domains/hyper-swiper/shared/trading.types'

const SMOOTH_SPRING = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
  mass: 0.5,
}

function formatPnlCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'exceptZero',
  }).format(value)
}

function formatPnlPercent(value: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
  return value >= 0 ? `+${formatted}` : formatted
}

function PositionExpandedInfo({
  position,
  showCollapsedContent,
}: {
  position: Position
  showCollapsedContent: boolean
}) {
  return (
    <m.div
      animate={{
        width: showCollapsedContent ? 0 : 'auto',
        opacity: showCollapsedContent ? 0 : 1,
      }}
      transition={SMOOTH_SPRING}
      className="flex items-center gap-2 overflow-hidden origin-left"
      style={{
        visibility: showCollapsedContent ? 'hidden' : 'visible',
      }}
    >
      <div className="flex flex-col min-w-0 justify-center">
        <span className="text-[9px] text-tron-white-dim uppercase tracking-wider truncate leading-none mb-0.5">
          Entry
        </span>
        <span className="text-[14px] font-mono font-bold text-tron-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.5)] leading-none">
          ${formatPrice(position.openPrice)}
        </span>
      </div>

      {position.leverage > 1 && (
        <div
          className={cn(
            'px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0',
            position.leverage === 2 && 'bg-green-500/30 border border-green-500/50 text-green-300',
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
  )
}

function PositionCollapsedInfo({
  isClosing,
  isLiquidated,
  realizedPnl,
  pnlText,
  pnlTextColor,
  showCollapsedContent,
  onClose,
}: any) {
  return (
    <m.div
      animate={{
        width: showCollapsedContent ? 'auto' : 0,
        opacity: showCollapsedContent ? 1 : 0,
      }}
      transition={SMOOTH_SPRING}
      className="flex items-center overflow-hidden"
      style={{
        visibility: showCollapsedContent ? 'visible' : 'hidden',
      }}
    >
      <AnimatePresence mode="wait">
        {isClosing ? (
          <m.div
            key="closing"
            initial={{ opacity: 0, scale: 0.8, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex items-center gap-1.5"
          >
            <span
              className={cn(
                'text-[11px] font-black font-mono leading-none tracking-wider',
                isLiquidated ? 'text-red-400' : 'text-tron-cyan'
              )}
            >
              {isLiquidated ? 'Liquidated' : 'Closed'}
            </span>
            <span
              className={cn(
                'text-[10px] font-bold font-mono leading-none tabular-nums',
                realizedPnl !== undefined && realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {realizedPnl !== undefined ? formatPnlCurrency(realizedPnl) : pnlText}
            </span>
          </m.div>
        ) : (
          <m.span
            key="pnl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              'text-[11px] font-black font-mono leading-none inline-block text-right ml-0.5 tabular-nums cursor-pointer min-w-[48px]',
              pnlTextColor
            )}
          >
            {pnlText}
          </m.span>
        )}
      </AnimatePresence>
    </m.div>
  )
}

function PositionEffects({
  isClosing,
  isNearZero,
  prefersReducedMotion,
  isInProfit,
  isLiquidated,
}: any) {
  return (
    <>
      {!isNearZero && !isClosing && (
        <m.div
          className="absolute inset-0 pointer-events-none rounded-xl"
          animate={{ opacity: [0.08, 0.16, 0.08] }}
          transition={{ duration: 1, repeat: prefersReducedMotion ? 0 : Infinity }}
          style={{
            background: isInProfit
              ? 'radial-gradient(circle at center, rgba(74,222,128,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(248,113,113,0.15) 0%, transparent 70%)',
          }}
        />
      )}
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
    </>
  )
}

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
  priceData: PriceData | null
  onClose: (id: string) => void
  isClosing: boolean
  closingReason?: 'manual' | 'liquidated'
  realizedPnl?: number
}) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Auto minimize after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Click arrow to expand
  const handleExpand = useCallback(() => {
    if (isClosing || !isMinimized) return
    setIsMinimized(false)
    setTimeout(() => setIsMinimized(true), 2000)
  }, [isClosing, isMinimized])

  // Click PnL to close position
  const handleClose = useCallback(() => {
    if (isClosing) return
    onClose(position.id)
  }, [isClosing, onClose, position.id])

  // Memoize PnL calculations to prevent recalculation on every render
  const pnlData = useMemo(() => {
    const currentPrice = priceData?.price ?? position.openPrice
    const priceChangePercent = (currentPrice - position.openPrice) / position.openPrice
    const directionMultiplier = position.isLong ? 1 : -1
    const pnlPercent = priceChangePercent * directionMultiplier * position.leverage * 100
    const isInProfit = (realizedPnl ?? pnlPercent) > 0
    const isNearZero = Math.abs(pnlPercent) < 0.5
    return { pnlPercent, isInProfit, isNearZero }
  }, [priceData?.price, position.openPrice, position.isLong, position.leverage, realizedPnl])

  const { pnlPercent, isInProfit, isNearZero } = pnlData
  const isLiquidated = closingReason === 'liquidated'

  // Memoize border style computation
  const borderStyle = useMemo(() => {
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
  }, [isLiquidated, isClosing, isNearZero, isInProfit])

  // Memoize PnL text color
  const pnlTextColor = useMemo(() => {
    if (isNearZero) return 'text-tron-cyan'
    if (isInProfit) return 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]'
    return 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]'
  }, [isNearZero, isInProfit])

  // Memoize text formatting
  const displayPnl = realizedPnl ?? pnlPercent
  const pnlText = useMemo(
    () => (isClosing ? formatPnlCurrency(displayPnl) : formatPnlPercent(displayPnl)),
    [displayPnl, isClosing]
  )

  // When closing, always show minimized state (collapsed content)
  const showCollapsedContent = isMinimized || isClosing

  return (
    <m.div
      key={position.id}
      layout="position"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{
        y: -20,
        opacity: 0,
        scale: 0.95,
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
      }}
      className={cn(
        'glass-panel-vibrant mb-1.5 relative flex-shrink-0 pointer-events-auto overflow-hidden',
        borderStyle
      )}
      style={{ touchAction: 'manipulation' }}
    >
      <PositionEffects
        isClosing={isClosing}
        isNearZero={isNearZero}
        prefersReducedMotion={prefersReducedMotion}
        isInProfit={isInProfit}
        isLiquidated={isLiquidated}
      />

      <div className="relative flex items-center p-2 gap-2">
        <m.div
          animate={{ scale: showCollapsedContent ? 0.85 : 1 }}
          transition={SMOOTH_SPRING}
          onClick={handleExpand}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer',
            position.isLong ? 'bg-green-500/20' : 'bg-red-500/20'
          )}
        >
          <span className={cn('text-base', position.isLong ? 'text-green-400' : 'text-red-400')}>
            {position.isLong ? '▲' : '▼'}
          </span>
        </m.div>

        <div className="relative flex items-center flex-1 overflow-hidden">
          <PositionExpandedInfo position={position} showCollapsedContent={showCollapsedContent} />

          <PositionCollapsedInfo
            isClosing={isClosing}
            isLiquidated={isLiquidated}
            realizedPnl={realizedPnl}
            pnlText={pnlText}
            pnlTextColor={pnlTextColor}
            showCollapsedContent={showCollapsedContent}
            onClose={handleClose}
          />
        </div>
      </div>
    </m.div>
  )
}

export function PositionIndicator() {
  const openPositions = useTradingStore((s) => s.openPositions)
  const localPlayerId = useTradingStore((s) => s.localPlayerId)
  const priceData = useTradingStore((s) => s.priceData)
  const closePosition = useTradingStore((s) => s.closePosition)
  const closingPositions = useTradingStore((s) => s.closingPositions)

  // Get local player's open positions - positions in closing state are still in openPositions
  // until the animation completes
  const localPositions = useMemo(
    () =>
      Array.from(openPositions.values())
        .filter((pos) => pos.playerId === localPlayerId && pos.status === 'open')
        .sort((a, b) => b.openedAt - a.openedAt),
    [openPositions, localPlayerId]
  )

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
          {localPositions.length === 0 && (
            <div className="text-tron-white-dim/60 text-xs text-right pr-2 py-2 italic">
              No open positions
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
