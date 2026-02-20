'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTradingStore } from '../game/stores/trading-store'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatPrice'
import type { Position } from '../game/types/trading'

export function PositionIndicator() {
  const { openPositions, localPlayerId, priceData } = useTradingStore()

  // Get local player's open positions
  const localPositions = Array.from(openPositions.values())
    .filter((pos) => pos.playerId === localPlayerId && pos.status === 'open')
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, 5) // Show up to 5 positions

  return (
    <div className="fixed left-0 right-0 z-20 px-3 pb-2 bottom-56 pointer-events-none">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence>
          {localPositions.map((position, index) => {
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

            return (
              <motion.div
                key={position.id}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  'glass-panel-vibrant rounded-xl p-2 mb-1.5 relative overflow-hidden',
                  borderStyle
                )}
              >
                {/* Animated glow effect for profit/loss */}
                {!isNearZero && (
                  <motion.div
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

                <div className="relative flex items-center justify-between gap-2">
                  {/* Left: Entry Point & Direction */}
                  <div className="flex items-center gap-2">
                    {/* Direction indicator */}
                    <motion.div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center relative',
                        position.isLong ? 'bg-green-500/20' : 'bg-red-500/20'
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
                      <motion.div
                        className={cn(
                          'absolute inset-0 rounded-lg',
                          position.isLong ? 'border border-green-400' : 'border border-red-400'
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
                    </motion.div>

                    {/* Entry price with current price */}
                    <div className="flex flex-col">
                      <span className="text-[9px] text-tron-white-dim uppercase tracking-wider">
                        Entry
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono font-bold text-tron-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.5)]">
                          ${formatPrice(position.openPrice)}
                        </span>
                        {/* Current price */}
                        <motion.span
                          className={cn(
                            'text-[10px] font-mono font-medium',
                            isInProfit
                              ? 'text-green-400'
                              : isNearZero
                                ? 'text-tron-white-dim'
                                : 'text-red-400'
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
                        </motion.span>
                        <span
                          className={cn(
                            'text-xs font-mono',
                            isInProfit
                              ? 'text-green-400'
                              : isNearZero
                                ? 'text-tron-white-dim'
                                : 'text-red-400'
                          )}
                        >
                          ${formatPrice(currentPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Real-time PnL (percentage only) */}
                  <div className="flex-1 flex items-center justify-center">
                    <motion.div
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1 rounded-lg',
                        isNearZero
                          ? 'bg-black/30 border border-tron-cyan/20'
                          : isInProfit
                            ? 'bg-green-500/20 border border-green-500/40'
                            : 'bg-red-500/20 border border-red-500/40'
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
                          'text-lg font-black font-mono',
                          isNearZero
                            ? 'text-tron-cyan'
                            : isInProfit
                              ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                              : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.7)]'
                        )}
                      >
                        {isInProfit ? '+' : ''}
                        {pnlPercent.toFixed(1)}%
                      </span>
                    </motion.div>
                  </div>

                  {/* Right: Position type badge with leverage */}
                  <div className="flex items-center gap-1">
                    {/* Leverage badge */}
                    {position.leverage > 1 && (
                      <motion.div
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold',
                          position.leverage === 2 &&
                            'bg-green-500/30 border border-green-500/50 text-green-300',
                          position.leverage === 5 &&
                            'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300',
                          position.leverage === 10 &&
                            'bg-red-500/30 border border-red-500/50 text-red-300'
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
                      </motion.div>
                    )}

                    <div
                      className={cn(
                        'px-1.5 py-1 rounded-lg text-[10px] font-bold font-mono shrink-0',
                        position.isLong &&
                          'bg-green-500/20 text-green-400 border border-green-500/30',
                        !position.isLong && 'bg-red-500/20 text-red-400 border border-red-500/30'
                      )}
                    >
                      {position.isLong ? 'LONG' : 'SHORT'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Show placeholder if no positions */}
        {localPositions.length === 0 && (
          <div className="glass-panel-vibrant rounded-xl p-3 text-center">
            <span className="text-xs text-tron-white-dim">No open positions</span>
            <span className="text-[10px] text-tron-cyan/50 block mt-1">
              Slice coins to open positions
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
