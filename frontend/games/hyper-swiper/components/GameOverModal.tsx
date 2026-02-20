'use client'

import React from 'react'
import { m } from 'framer-motion'
import { useTradingStore } from '../game/stores/trading-store'
import { cn } from '@/lib/utils'
import { PlayerName } from '@/components/ens/PlayerName'
import { formatPrice } from '@/lib/formatPrice'

const GLOW_ANIMATION = {
  textShadow: [
    '0 0 20px rgba(0,217,255,0.4)',
    '0 0 40px rgba(0,217,255,0.8)',
    '0 0 20px rgba(0,217,255,0.4)',
  ] as string[],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
} as const

export const GameOverModal = React.memo(function GameOverModal() {
  const { isGameOver, gameOverData, localPlayerId, playAgain, players, gameSettlement } =
    useTradingStore()
  const [showModal, setShowModal] = React.useState(false)

  // Show modal after short delay
  React.useEffect(() => {
    if (isGameOver && gameOverData) {
      const timer = setTimeout(() => {
        setShowModal(true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setShowModal(false)
    }
  }, [isGameOver, gameOverData])

  if (!showModal || !gameOverData) return null

  const isWinner = gameOverData.winnerId === localPlayerId
  const isTie = gameOverData.winnerId === null

  // Use gameSettlement for detailed results
  const localPlayerResult = gameSettlement?.playerResults?.find((r) => r.playerId === localPlayerId)
  const opponentResult = gameSettlement?.playerResults?.find((r) => r.playerId !== localPlayerId)

  // Fallback to players array if gameSettlement not available
  const localPlayer = players.find((p) => p.id === localPlayerId)
  const opponent = players.find((p) => p.id !== localPlayerId)

  // Use settlement results or fallback
  const localFinalBalance = localPlayerResult?.finalBalance ?? localPlayer?.dollars ?? 0
  const opponentFinalBalance = opponentResult?.finalBalance ?? opponent?.dollars ?? 0
  const localTotalPnl = localPlayerResult?.totalPnl ?? 0
  const opponentTotalPnl = opponentResult?.totalPnl ?? 0
  const localPositionCount = localPlayerResult?.positionCount ?? 0
  const opponentPositionCount = opponentResult?.positionCount ?? 0

  // Get local player's positions from settlement
  const localPositions =
    gameSettlement?.positions?.filter((p) => p.playerId === localPlayerId) ?? []

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center"
    >
      <m.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="glass-panel-vibrant rounded-2xl p-8 max-w-lg mx-4 text-center max-h-[90vh] overflow-y-auto"
      >
        {/* Victory/Defeat Header */}
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
          className="mb-6"
        >
          <m.h2
            className={cn(
              'font-[family-name:var(--font-orbitron)] text-4xl sm:text-5xl font-black tracking-[0.15em]',
              isTie ? 'text-white' : isWinner ? 'text-tron-cyan' : 'text-tron-orange'
            )}
            animate={isWinner ? GLOW_ANIMATION.textShadow : undefined}
            transition={GLOW_ANIMATION.transition}
          >
            {isTie ? "IT'S A TIE" : isWinner ? 'VICTORY' : 'DEFEAT'}
          </m.h2>
          {isTie ? (
            <div className="text-white/70 mt-2 text-sm tracking-[0.2em]">GAME ENDED IN A TIE</div>
          ) : (
            <div className="text-white/70 mt-2 text-sm tracking-[0.2em] flex items-center justify-center gap-2">
              {gameOverData.winnerName ? (
                <PlayerName
                  username={
                    !gameOverData.winnerName.startsWith('0x') ? gameOverData.winnerName : undefined
                  }
                  address={
                    gameOverData.winnerName.startsWith('0x') ? gameOverData.winnerName : undefined
                  }
                  className="text-white"
                />
              ) : (
                <span>UNKNOWN</span>
              )}
              <span>WINS BY TOTAL PNL</span>
            </div>
          )}
        </m.div>

        {/* Final Price */}
        {gameSettlement && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 bg-black/40 border border-white/10 rounded-lg p-3"
          >
            <span className="text-[10px] text-white/50 tracking-[0.2em]">FINAL BTC PRICE</span>
            <div className="text-xl font-mono font-bold text-tron-cyan">
              ${formatPrice(gameSettlement.closePrice)}
            </div>
          </m.div>
        )}

        {/* Player Results */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 bg-black/40 border border-white/10 rounded-xl p-4"
        >
          <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-white/50 mb-3 uppercase">
            Final Results
          </h3>
          <p className="text-[9px] tracking-[0.14em] text-white/45 mb-3 uppercase">
            Winner is decided by total realized PnL
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Local Player */}
            <m.div
              whileHover={{ scale: 1.02 }}
              className={cn(
                'relative flex flex-col items-center p-3 rounded-lg border backdrop-blur-sm overflow-hidden group',
                isWinner
                  ? 'border-cyan-400/30 bg-cyan-950/20'
                  : 'border-orange-400/30 bg-orange-950/20'
              )}
            >
              <div className="absolute inset-0 opacity-10 tron-grid pointer-events-none" />
              <span
                className={cn(
                  'text-[10px] mb-1 tracking-[0.2em] relative z-10',
                  isWinner ? 'text-cyan-400/80' : 'text-orange-400/80'
                )}
              >
                YOU
              </span>
              <m.span
                className={cn(
                  'font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-[0.2em] relative z-10',
                  isWinner ? 'text-tron-cyan' : 'text-tron-orange'
                )}
                animate={{
                  textShadow: isWinner
                    ? [
                        '0 0 15px rgba(0,243,255,0.5)',
                        '0 0 30px rgba(0,243,255,0.8)',
                        '0 0 15px rgba(0,243,255,0.5)',
                      ]
                    : [
                        '0 0 15px rgba(255,107,0,0.5)',
                        '0 0 30px rgba(255,107,0,0.8)',
                        '0 0 15px rgba(255,107,0,0.5)',
                      ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {localTotalPnl >= 0 ? '+' : ''}${localTotalPnl.toFixed(2)}
              </m.span>
              <div className="flex flex-col items-center mt-1 relative z-10">
                <span
                  className={cn(
                    'text-[10px] font-mono',
                    isWinner ? 'text-cyan-300' : 'text-orange-300'
                  )}
                >
                  Final Balance: ${localFinalBalance.toFixed(2)}
                </span>
                <span className="text-[9px] text-white/40">
                  {localPositionCount} position{localPositionCount !== 1 ? 's' : ''}
                </span>
              </div>
            </m.div>

            {/* Opponent */}
            <m.div
              whileHover={{ scale: 1.02 }}
              className={cn(
                'relative flex flex-col items-center p-3 rounded-lg border backdrop-blur-sm overflow-hidden group',
                isWinner
                  ? 'border-orange-400/30 bg-orange-950/20'
                  : 'border-cyan-400/30 bg-cyan-950/20'
              )}
            >
              <div className="absolute inset-0 opacity-10 tron-grid pointer-events-none" />
              <span
                className={cn(
                  'text-[10px] mb-1 tracking-[0.2em] flex items-center gap-2 relative z-10',
                  isWinner ? 'text-orange-400/80' : 'text-cyan-400/80'
                )}
              >
                {opponent?.name ? (
                  <PlayerName
                    username={!opponent.name.startsWith('0x') ? opponent.name : undefined}
                    address={opponent.name.startsWith('0x') ? opponent.name : undefined}
                    className={isWinner ? 'text-orange-400/80' : 'text-cyan-400/80'}
                  />
                ) : (
                  'OPPONENT'
                )}
              </span>
              <m.span
                className={cn(
                  'font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-[0.2em] relative z-10',
                  isWinner ? 'text-tron-orange' : 'text-tron-cyan'
                )}
                animate={{
                  textShadow: isWinner
                    ? [
                        '0 0 15px rgba(255,107,0,0.5)',
                        '0 0 30px rgba(255,107,0,0.8)',
                        '0 0 15px rgba(255,107,0,0.5)',
                      ]
                    : [
                        '0 0 15px rgba(0,243,255,0.5)',
                        '0 0 30px rgba(0,243,255,0.8)',
                        '0 0 15px rgba(0,243,255,0.5)',
                      ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {opponentTotalPnl >= 0 ? '+' : ''}${opponentTotalPnl.toFixed(2)}
              </m.span>
              <div className="flex flex-col items-center mt-1 relative z-10">
                <span
                  className={cn(
                    'text-[10px] font-mono',
                    isWinner ? 'text-orange-300' : 'text-cyan-300'
                  )}
                >
                  Final Balance: ${opponentFinalBalance.toFixed(2)}
                </span>
                <span className="text-[9px] text-white/40">
                  {opponentPositionCount} position{opponentPositionCount !== 1 ? 's' : ''}
                </span>
              </div>
            </m.div>
          </div>
        </m.div>

        {/* Your Positions Summary */}
        {localPositions.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6 bg-black/40 border border-white/10 rounded-xl p-3"
          >
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-white/50 mb-2 uppercase">
              Your Positions
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {localPositions.map((pos) => (
                <div
                  key={pos.positionId}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg text-xs',
                    pos.isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={pos.isLong ? 'text-green-400' : 'text-red-400'}>
                      {pos.isLong ? '▲ LONG' : '▼ SHORT'}
                    </span>
                    {pos.isLiquidated && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-400/40">
                        LIQ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-tron-cyan font-mono">${formatPrice(pos.openPrice)}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white font-mono">${formatPrice(pos.closePrice)}</span>
                  </div>
                  <span
                    className={cn(
                      'font-bold font-mono',
                      pos.isProfitable ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {pos.realizedPnl >= 0 ? '+' : ''}${pos.realizedPnl.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* PLAY AGAIN Button */}
        <m.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={playAgain}
          className="relative group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <m.div
            className="absolute inset-0 rounded-lg"
            animate={{
              boxShadow: [
                '0 0 20px rgba(0,217,255,0.3)',
                '0 0 60px rgba(0,217,255,0.6)',
                '0 0 20px rgba(0,217,255,0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative px-12 py-3 bg-black/40 backdrop-blur-md border border-cyan-400/30 rounded">
            <m.span
              className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] font-medium block text-tron-cyan"
              animate={{
                textShadow: [
                  '0 0 10px rgba(0,217,255,0.5)',
                  '0 0 20px rgba(0,217,255,0.8)',
                  '0 0 10px rgba(0,217,255,0.5)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              PLAY AGAIN
            </m.span>
          </div>
          <m.div
            className="absolute inset-0 rounded-lg"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,217,255,0.15) 0%, transparent 70%)',
            }}
          />
        </m.button>
      </m.div>
    </m.div>
  )
})
