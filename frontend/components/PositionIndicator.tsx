'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTradingStore } from '@/game/stores/trading-store'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/formatPrice'

// Order settlement duration - must match server value
const ORDER_SETTLEMENT_DURATION_MS = 5000 // 5 seconds

export function PositionIndicator() {
  const { activeOrders, localPlayerId, pendingOrders, priceData, leverage } = useTradingStore()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let raf: number
    const tick = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Get local player's active orders
  const localOrders = Array.from(activeOrders.values())
    .filter((order) => order.playerId === localPlayerId)
    .sort((a, b) => a.settlesAt - b.settlesAt)
    .slice(0, 5) // Increased to 5 visible (was 3)

  return (
    <div className="fixed left-0 right-0 z-20 px-3 pb-2 bottom-56 pointer-events-none">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence>
          {localOrders.map((order, index) => {
            const isCall = order.coinType === 'call'
            const timeLeft = Math.max(0, order.settlesAt - now)
            const progress = Math.min(1, timeLeft / ORDER_SETTLEMENT_DURATION_MS)

            // Check if settled
            const settled = pendingOrders.get(order.orderId)
            const isWin = settled?.isCorrect

            // Check if order timed out (no settlement received)
            const isTimedOut = !settled && timeLeft === 0

            // Amount is based on current leverage
            const amount = leverage

            // Border and glow styles based on state
            const borderStyle = isTimedOut
              ? 'border-2 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
              : settled
                ? isWin
                  ? 'border-2 border-green-500/60 shadow-[0_0_18px_rgba(74,222,128,0.35)]'
                  : 'border-2 border-red-500/60 shadow-[0_0_18px_rgba(248,113,113,0.35)]'
                : 'border border-tron-cyan/30'

            // Calculate P&L for pending orders
            const pnl =
              !settled && !isTimedOut && priceData
                ? ((priceData.price - order.priceAtOrder) / order.priceAtOrder) * 100
                : null
            const isInProfit = pnl !== null && ((isCall && pnl > 0) || (!isCall && pnl < 0))

            return (
              <motion.div
                key={order.orderId}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  'glass-panel-vibrant rounded-xl p-2 mb-1.5 relative overflow-hidden',
                  borderStyle
                )}
              >
                {/* Animated glow effect for wins/losses */}
                {settled && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{
                      opacity: [0.08, 0.16, 0.08],
                    }}
                    transition={{
                      duration: 1,
                      repeat: 2,
                    }}
                    style={{
                      background: isWin
                        ? 'radial-gradient(circle at center, rgba(74,222,128,0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle at center, rgba(248,113,113,0.15) 0%, transparent 70%)',
                    }}
                  />
                )}

                <div className="relative flex items-center justify-between gap-2">
                  {/* Left: Entry Point & Direction */}
                  <div className="flex items-center gap-2">
                    {/* Direction indicator - more prominent */}
                    <motion.div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center relative',
                        isCall ? 'bg-green-500/20' : 'bg-red-500/20',
                        settled && (isWin ? 'bg-green-500/30' : 'bg-red-500/30')
                      )}
                      animate={!settled && !isTimedOut ? { y: [0, -3, 0, 3, 0] } : {}}
                      transition={
                        !settled && !isTimedOut ? { duration: 1.5, repeat: Infinity } : {}
                      }
                    >
                      {isCall ? (
                        <span className="text-green-400 text-lg">▲</span>
                      ) : (
                        <span className="text-red-400 text-lg">▼</span>
                      )}

                      {/* Pulse ring for pending orders */}
                      {!settled && !isTimedOut && (
                        <motion.div
                          className={cn(
                            'absolute inset-0 rounded-lg',
                            isCall ? 'border border-green-400' : 'border border-red-400'
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
                      )}
                    </motion.div>

                    {/* Entry price with current price comparison */}
                    <div className="flex flex-col">
                      <span className="text-[9px] text-tron-white-dim uppercase tracking-wider">
                        Entry
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono font-bold text-tron-cyan drop-shadow-[0_0_6px_rgba(0,243,255,0.5)]">
                          ${formatPrice(order.priceAtOrder)}
                        </span>
                        {/* Current price comparison for pending orders */}
                        {!settled && !isTimedOut && priceData && (
                          <>
                            <motion.span
                              className={cn(
                                'text-[10px] font-mono font-medium',
                                isInProfit
                                  ? 'text-green-400'
                                  : pnl !== null && pnl !== 0
                                    ? 'text-red-400'
                                    : 'text-tron-white-dim'
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
                              {isInProfit ? '↑' : pnl !== null && pnl !== 0 ? '↓' : '→'}
                            </motion.span>
                            <span
                              className={cn(
                                'text-xs font-mono',
                                isInProfit
                                  ? 'text-green-400'
                                  : pnl !== null && pnl !== 0
                                    ? 'text-red-400'
                                    : 'text-tron-white-dim'
                              )}
                            >
                              ${formatPrice(priceData.price)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center: Progress bar (pending) or Result badge (settled) */}
                  <div className="flex-1 flex items-center justify-center">
                    {!settled && !isTimedOut ? (
                      // Countdown with progress bar
                      <div className="w-full flex flex-col items-center gap-1">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[9px] text-tron-white-dim">Expires</span>
                          <motion.span
                            className={cn(
                              'text-base font-mono font-bold',
                              timeLeft < 3000 ? 'text-yellow-400' : 'text-tron-cyan'
                            )}
                            animate={
                              timeLeft < 3000
                                ? {
                                    scale: [1, 1.08, 1],
                                    opacity: [1, 0.75, 1],
                                  }
                                : {}
                            }
                            transition={timeLeft < 3000 ? { duration: 0.5, repeat: Infinity } : {}}
                          >
                            {(timeLeft / 1000).toFixed(1)}s
                          </motion.span>
                        </div>
                        <div className="h-1.5 bg-black/50 rounded-full overflow-hidden w-full">
                          <motion.div
                            className={cn(
                              'h-full',
                              isCall
                                ? 'bg-gradient-to-r from-green-500 to-green-400'
                                : 'bg-gradient-to-r from-red-500 to-red-400'
                            )}
                            initial={{ width: '100%' }}
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                      </div>
                    ) : isTimedOut ? (
                      // Timed out state
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-yellow-400 font-bold">Timed Out</span>
                        <span className="text-base text-yellow-400">?</span>
                      </div>
                    ) : (
                      // SETTLED STATE - Prominent result display
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-lg',
                          isWin
                            ? 'bg-green-500/20 border border-green-500/40'
                            : 'bg-red-500/20 border border-red-500/40'
                        )}
                      >
                        {/* Large result icon */}
                        <motion.div
                          animate={
                            isWin
                              ? {
                                  scale: [1, 1.15, 1],
                                  rotate: [0, 8, -8, 0],
                                }
                              : {
                                  scale: [1, 1.08, 1],
                                  x: [0, -2, 2, 0],
                                }
                          }
                          transition={{
                            duration: 0.5,
                            delay: 0.1,
                          }}
                        >
                          {isWin ? (
                            <Check className="w-5 h-5 text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.7)]" />
                          ) : (
                            <X className="w-5 h-5 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]" />
                          )}
                        </motion.div>

                        {/* Amount with sign */}
                        <span
                          className={cn(
                            'text-lg font-black font-mono',
                            isWin
                              ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                              : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.7)]'
                          )}
                        >
                          {isWin ? `+$${amount}` : `-$${amount}`}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Right: Coin type badge with leverage indicator */}
                  <div className="flex items-center gap-1">
                    {/* Leverage badge if not 1X */}
                    {leverage > 1 && (
                      <motion.div
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold',
                          leverage === 2 &&
                            'bg-green-500/30 border border-green-500/50 text-green-300',
                          leverage === 5 &&
                            'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300',
                          leverage === 10 && 'bg-red-500/30 border border-red-500/50 text-red-300'
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
                        {leverage}X
                      </motion.div>
                    )}

                    <div
                      className={cn(
                        'px-1.5 py-1 rounded-lg text-[10px] font-bold font-mono shrink-0',
                        order.coinType === 'call' &&
                          'bg-green-500/20 text-green-400 border border-green-500/30',
                        order.coinType === 'put' &&
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                      )}
                    >
                      {order.coinType === 'call' ? 'LONG' : 'SHORT'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
