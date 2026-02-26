'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { cn } from '@/platform/utils/classNames.utils'
import { formatPrice } from '@/platform/utils/price.utils'

interface PositionSizes {
  bottomOffset: string
  maxHeight: string
  iconSize: string
  entryFontSize: string
  leverageFontSize: string
  labelFontSize: string
  pnlFontSize: string
  closedFontSize: string
}

const POSITION_SIZES_BY_HEIGHT: Record<number, PositionSizes> = {
  667: {
    bottomOffset: 'bottom-40',
    maxHeight: '200px',
    iconSize: 'w-5 h-5',
    entryFontSize: 'text-[11px]',
    leverageFontSize: 'text-[7px]',
    labelFontSize: 'text-[7px]',
    pnlFontSize: 'text-[9px]',
    closedFontSize: 'text-[9px]',
  },
  736: {
    bottomOffset: 'bottom-44',
    maxHeight: '220px',
    iconSize: 'w-6 h-6',
    entryFontSize: 'text-[12px]',
    leverageFontSize: 'text-[8px]',
    labelFontSize: 'text-[8px]',
    pnlFontSize: 'text-[10px]',
    closedFontSize: 'text-[10px]',
  },
  780: {
    bottomOffset: 'bottom-48',
    maxHeight: '240px',
    iconSize: 'w-6 h-6',
    entryFontSize: 'text-[13px]',
    leverageFontSize: 'text-[8px]',
    labelFontSize: 'text-[8px]',
    pnlFontSize: 'text-[10px]',
    closedFontSize: 'text-[10px]',
  },
  844: {
    bottomOffset: 'bottom-52',
    maxHeight: '260px',
    iconSize: 'w-7 h-7',
    entryFontSize: 'text-[14px]',
    leverageFontSize: 'text-[9px]',
    labelFontSize: 'text-[9px]',
    pnlFontSize: 'text-[11px]',
    closedFontSize: 'text-[11px]',
  },
  852: {
    bottomOffset: 'bottom-52',
    maxHeight: '260px',
    iconSize: 'w-7 h-7',
    entryFontSize: 'text-[14px]',
    leverageFontSize: 'text-[9px]',
    labelFontSize: 'text-[9px]',
    pnlFontSize: 'text-[11px]',
    closedFontSize: 'text-[11px]',
  },
  896: {
    bottomOffset: 'bottom-48',
    maxHeight: '250px',
    iconSize: 'w-6 h-6',
    entryFontSize: 'text-[13px]',
    leverageFontSize: 'text-[8px]',
    labelFontSize: 'text-[8px]',
    pnlFontSize: 'text-[10px]',
    closedFontSize: 'text-[10px]',
  },
  926: {
    bottomOffset: 'bottom-56',
    maxHeight: '280px',
    iconSize: 'w-7 h-7',
    entryFontSize: 'text-[14px]',
    leverageFontSize: 'text-[9px]',
    labelFontSize: 'text-[10px]',
    pnlFontSize: 'text-[11px]',
    closedFontSize: 'text-[11px]',
  },
  932: {
    bottomOffset: 'bottom-60',
    maxHeight: '300px',
    iconSize: 'w-8 h-8',
    entryFontSize: 'text-[15px]',
    leverageFontSize: 'text-[10px]',
    labelFontSize: 'text-[10px]',
    pnlFontSize: 'text-[12px]',
    closedFontSize: 'text-[12px]',
  },
}

const BASE_SIZES: PositionSizes = {
  bottomOffset: 'bottom-52',
  maxHeight: '260px',
  iconSize: 'w-7 h-7',
  entryFontSize: 'text-[14px]',
  leverageFontSize: 'text-[9px]',
  labelFontSize: 'text-[9px]',
  pnlFontSize: 'text-[11px]',
  closedFontSize: 'text-[11px]',
}

function getPositionSizes(): PositionSizes {
  if (typeof window === 'undefined') return BASE_SIZES
  const height = window.screen.height
  if (height < 667 || height > 932) return BASE_SIZES
  return POSITION_SIZES_BY_HEIGHT[height] ?? BASE_SIZES
}

function usePositionSizes(): PositionSizes {
  const [sizes] = useState<PositionSizes>(() => getPositionSizes())
  return sizes
}

export interface Position {
  id: string
  playerId: string
  playerName: string
  isLong: boolean
  leverage: number
  collateral: number
  openPrice: number
  closePrice: number | null
  realizedPnl: number
  openedAt: number
  settledAt: number | null
  status: 'open' | 'settled'
}

export interface PriceData {
  symbol: string
  price: number
  change: number
  changePercent: number
  tradeSize?: number
  tradeSide?: 'BUY' | 'SELL'
  tradeTime?: number
}

export interface ClosingState {
  reason?: 'manual' | 'liquidated'
  realizedPnl?: number
}

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

export function PositionCard({
  position,
  index,
  priceData,
  onClose,
  isClosing,
  closingReason,
  realizedPnl,
  sizes,
}: {
  position: Position
  index: number
  priceData: PriceData | null
  onClose: (id: string) => void
  isClosing: boolean
  closingReason?: 'manual' | 'liquidated'
  realizedPnl?: number
  sizes: PositionSizes
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinimized(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleExpand = useCallback(() => {
    if (isClosing || !isMinimized) return
    setIsMinimized(false)
    setTimeout(() => setIsMinimized(true), 2000)
  }, [isClosing, isMinimized])

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
      {!isNearZero && !isClosing && (
        <m.div
          className="absolute inset-0 pointer-events-none rounded-xl"
          animate={{
            opacity: [0.08, 0.16, 0.08],
          }}
          transition={{
            duration: 1,
            repeat: prefersReducedMotion ? 0 : Infinity,
          }}
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

      <div className="relative flex items-center p-2 gap-2">
        <m.div
          animate={{ scale: showCollapsedContent ? 0.85 : 1 }}
          transition={SMOOTH_SPRING}
          onClick={handleExpand}
          className={cn(
            `${sizes.iconSize} rounded-lg flex items-center justify-center shrink-0 cursor-pointer`,
            position.isLong ? 'bg-green-500/20' : 'bg-red-500/20'
          )}
        >
          <span className={cn('text-base', position.isLong ? 'text-green-400' : 'text-red-400')}>
            {position.isLong ? '▲' : '▼'}
          </span>
        </m.div>

        <div className="relative flex items-center flex-1 overflow-hidden">
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
              <span
                className={`${sizes.labelFontSize} text-tron-white-dim uppercase tracking-wider truncate leading-none mb-0.5`}
              >
                Entry
              </span>
              <span
                className={`${sizes.entryFontSize} font-mono font-bold text-tron-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.5)] leading-none`}
              >
                ${formatPrice(position.openPrice)}
              </span>
            </div>

            {position.leverage > 1 && (
              <div
                className={cn(
                  `${sizes.leverageFontSize} px-1.5 py-0.5 rounded font-bold shrink-0`,
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

            <div
              className={cn(
                `${sizes.labelFontSize} px-1.5 py-1 rounded-lg font-bold font-mono shrink-0`,
                position.isLong && 'bg-green-500/20 text-green-400 border border-green-500/30',
                !position.isLong && 'bg-red-500/20 text-red-400 border border-red-500/30'
              )}
            >
              {position.isLong ? 'LONG' : 'SHORT'}
            </div>
          </m.div>

          <m.div
            animate={{
              width: showCollapsedContent ? 'auto' : 0,
              opacity: showCollapsedContent ? 1 : 0,
            }}
            transition={SMOOTH_SPRING}
            className="flex items-center overflow-hidden pointer-events-auto"
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
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={cn(
                      `${sizes.closedFontSize} font-black font-mono leading-none tracking-wider`,
                      isLiquidated ? 'text-red-400' : 'text-tron-cyan'
                    )}
                  >
                    {isLiquidated ? 'Liquidated' : 'Closed'}
                  </span>
                  <span
                    className={cn(
                      `${sizes.labelFontSize} font-bold font-mono leading-none tabular-nums`,
                      realizedPnl !== undefined && realizedPnl >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
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
                  onClick={handleClose}
                  className={cn(
                    `${sizes.pnlFontSize} font-black font-mono leading-none inline-block text-right ml-0.5 tabular-nums cursor-pointer`,
                    'min-w-[48px] p-2 -m-2 touch-manipulation',
                    pnlTextColor
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

export interface PositionIndicatorProps {
  openPositions: Map<string, Position>
  localPlayerId: string | null
  priceData: PriceData | null
  closePosition: (id: string) => void
  closingPositions: Map<string, ClosingState>
  isPlaying?: boolean
}

export function PositionIndicator({
  openPositions,
  localPlayerId,
  priceData,
  closePosition,
  closingPositions,
  isPlaying,
}: PositionIndicatorProps) {
  const sizes = usePositionSizes()
  const localPositions = useMemo(
    () =>
      Array.from(openPositions.values())
        .filter((pos) => pos.playerId === localPlayerId && pos.status === 'open')
        .sort((a, b) => b.openedAt - a.openedAt),
    [openPositions, localPlayerId]
  )

  if (isPlaying === false) {
    return null
  }

  return (
    <div
      className={`fixed left-0 right-0 z-20 px-3 pb-2 ${sizes.bottomOffset} pointer-events-none`}
    >
      <div className="max-w-2xl mx-auto flex flex-col items-end">
        <div
          className="flex flex-col items-end overflow-y-auto pointer-events-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
          style={{
            maxHeight: sizes.maxHeight,
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
                  sizes={sizes}
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
