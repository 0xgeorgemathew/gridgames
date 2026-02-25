'use client'

import React from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { cn } from '@/platform/utils/classNames.utils'
import type { Position } from '@/domains/tap-dancer/shared/trading.types'

/**
 * Calculate PnL for a position based on current price
 */
function calculatePnL(position: Position, currentPrice: number): number {
  const priceDiff = currentPrice - position.openPrice
  const direction = position.isLong ? 1 : -1
  const priceChange = priceDiff * direction
  const leverageFactor = position.leverage
  const pnl = (priceChange / position.openPrice) * position.collateral * leverageFactor
  return pnl
}

interface PositionCardProps {
  position: Position
  currentPrice: number | null
  onClose: () => void
}

const PositionCard = React.memo(function PositionCard({
  position,
  currentPrice,
  onClose,
}: PositionCardProps) {
  const pnl = currentPrice ? calculatePnL(position, currentPrice) : 0
  const isProfitable = pnl >= 0

  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClose}
      className={cn(
        'p-3 rounded-xl cursor-pointer backdrop-blur-sm border transition-all hover:scale-[1.02]',
        position.isLong
          ? 'bg-green-500/10 border-green-500/40 hover:border-green-400/60'
          : 'bg-red-500/10 border-red-500/40 hover:border-red-400/60'
      )}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-bold font-[family-name:var(--font-orbitron)] tracking-wider',
              position.isLong ? 'text-green-400' : 'text-red-400'
            )}
          >
            {position.isLong ? '▲ LONG' : '▼ SHORT'}
          </span>
          <span className="text-xs text-white/40">@ ${position.openPrice.toFixed(2)}</span>
        </div>
        <span
          className={cn(
            'font-mono font-bold text-base',
            isProfitable ? 'text-green-400' : 'text-red-400'
          )}
          style={{
            textShadow: isProfitable
              ? '0 0 8px rgba(74, 222, 128, 0.4)'
              : '0 0 8px rgba(248, 113, 113, 0.4)',
          }}
        >
          {isProfitable ? '+' : ''}${pnl.toFixed(2)}
        </span>
      </div>
      <div className="text-[10px] text-white/30 mt-1">Tap to close</div>
    </m.div>
  )
})

export const PositionList = React.memo(function PositionList() {
  const { openPositions, localPlayerId, closePosition, priceData, isPlaying } = useTradingStore()

  const myPositions = Array.from(openPositions.values())
    .filter((p) => p.playerId === localPlayerId && p.status === 'open')
    .sort((a, b) => b.openedAt - a.openedAt) // Newest first

  if (!isPlaying || myPositions.length === 0) return null

  return (
    <div className="fixed bottom-24 left-0 right-0 px-3 z-30 pointer-events-none">
      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {myPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              currentPrice={priceData?.price ?? null}
              onClose={() => closePosition(position.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
})
