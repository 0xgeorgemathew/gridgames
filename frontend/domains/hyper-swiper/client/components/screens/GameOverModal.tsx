'use client'

import React from 'react'
import { m } from 'framer-motion'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
import { cn } from '@/platform/utils/classNames.utils'
import { PlayerName } from '@/platform/ui/PlayerName'

export const GameOverModal = React.memo(function GameOverModal() {
  const { isGameOver, gameOverData, localPlayerId, playAgain, players, gameSettlement } =
    useTradingStore()
  const [showModal, setShowModal] = React.useState(false)

  React.useEffect(() => {
    if (isGameOver && gameOverData) {
      const timer = setTimeout(() => setShowModal(true), 500)
      return () => clearTimeout(timer)
    } else {
      setShowModal(false)
    }
  }, [isGameOver, gameOverData])

  if (!showModal || !gameOverData) return null

  const isWinner = gameOverData.winnerId === localPlayerId
  const isTie = gameOverData.winnerId === null

  const localPlayerResult = gameSettlement?.playerResults?.find((r) => r.playerId === localPlayerId)
  const opponentResult = gameSettlement?.playerResults?.find((r) => r.playerId !== localPlayerId)

  const localPlayer = players.find((p) => p.id === localPlayerId)
  const opponent = players.find((p) => p.id !== localPlayerId)

  const localTotalPnl = localPlayerResult?.totalPnl ?? 0
  const opponentTotalPnl = opponentResult?.totalPnl ?? 0
  const localPositionCount = localPlayerResult?.positionCount ?? 0
  const opponentPositionCount = opponentResult?.positionCount ?? 0
  const localFinalBalance = localPlayerResult?.finalBalance ?? localPlayer?.dollars ?? 0
  const opponentFinalBalance = opponentResult?.finalBalance ?? opponent?.dollars ?? 0

  function getResultStyle(): { text: string; colorClass: string; glowClass: string } {
    if (isTie) {
      return {
        text: 'TIE',
        colorClass: 'text-white',
        glowClass: 'drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]',
      }
    }
    if (isWinner) {
      return {
        text: 'VICTORY',
        colorClass: 'text-tron-cyan',
        glowClass: 'drop-shadow-[0_0_30px_rgba(0,243,255,0.8)]',
      }
    }
    return {
      text: 'DEFEAT',
      colorClass: 'text-tron-orange',
      glowClass: 'drop-shadow-[0_0_30px_rgba(255,107,0,0.8)]',
    }
  }

  const resultStyle = getResultStyle()

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-end justify-center pb-6 px-4"
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 243, 255, 0.1) 2px, rgba(0, 243, 255, 0.1) 4px)',
          }}
        />
      </div>

      {/* Animated border glow line */}
      <m.div
        className="absolute top-0 left-0 right-0 h-[2px] bg-tron-cyan"
        animate={{
          opacity: [0.5, 1, 0.5],
          boxShadow: [
            '0 0 20px rgba(0, 243, 255, 0.3)',
            '0 0 40px rgba(0, 243, 255, 0.6)',
            '0 0 20px rgba(0, 243, 255, 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <m.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm text-center"
      >
        {/* Main panel with corner accents */}
        <div className="relative glass-panel-vibrant rounded-2xl p-5 overflow-hidden">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-tron-cyan/60" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-tron-cyan/60" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-tron-cyan/60" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-tron-cyan/60" />

          {/* Inner glow border */}
          <div className="absolute inset-[1px] rounded-2xl border border-tron-cyan/10 pointer-events-none" />

          {/* Grid background */}
          <div className="absolute inset-0 opacity-[0.04] tron-grid pointer-events-none" />

          {/* Result Header */}
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
            className="relative z-10 mb-4"
          >
            <m.h2
              className={cn(
                'font-[family-name:var(--font-orbitron)] text-3xl font-black tracking-[0.2em]',
                resultStyle.colorClass,
                resultStyle.glowClass
              )}
              animate={{
                textShadow: isWinner
                  ? [
                      '0 0 20px rgba(0, 243, 255, 0.6)',
                      '0 0 40px rgba(0, 243, 255, 0.8)',
                      '0 0 20px rgba(0, 243, 255, 0.6)',
                    ]
                  : isTie
                    ? [
                        '0 0 20px rgba(255, 255, 255, 0.4)',
                        '0 0 30px rgba(255, 255, 255, 0.6)',
                        '0 0 20px rgba(255, 255, 255, 0.4)',
                      ]
                    : [
                        '0 0 20px rgba(255, 107, 0, 0.6)',
                        '0 0 40px rgba(255, 107, 0, 0.8)',
                        '0 0 20px rgba(255, 107, 0, 0.6)',
                      ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {resultStyle.text}
            </m.h2>
            {!isTie && gameOverData.winnerName && (
              <div className="text-white/50 mt-1 text-[10px] tracking-[0.2em] flex items-center justify-center gap-1.5">
                <PlayerName
                  username={
                    !gameOverData.winnerName.startsWith('0x') ? gameOverData.winnerName : undefined
                  }
                  address={
                    gameOverData.winnerName.startsWith('0x') ? gameOverData.winnerName : undefined
                  }
                  className="text-white/70"
                />
                <span>WINS</span>
              </div>
            )}
          </m.div>

          {/* Scoreboard — two stacked rows */}
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 mb-4 space-y-2"
          >
            {/* You */}
            <PlayerRow
              label="YOU"
              pnl={localTotalPnl}
              balance={localFinalBalance}
              positions={localPositionCount}
              isHighlight={isWinner || isTie}
              highlightColor="cyan"
            />
            {/* Opponent */}
            <PlayerRow
              label={
                opponent?.name ? (
                  <PlayerName
                    username={!opponent.name.startsWith('0x') ? opponent.name : undefined}
                    address={opponent.name.startsWith('0x') ? opponent.name : undefined}
                    className={cn(
                      'text-[10px]',
                      !isWinner ? 'text-cyan-400/80' : 'text-orange-400/80'
                    )}
                  />
                ) : (
                  'OPP'
                )
              }
              pnl={opponentTotalPnl}
              balance={opponentFinalBalance}
              positions={opponentPositionCount}
              isHighlight={!isWinner && !isTie}
              highlightColor="cyan"
            />
          </m.div>

          {/* Play Again */}
          <m.button
            whileTap={{ scale: 0.95 }}
            onClick={playAgain}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="relative z-10 w-full group"
          >
            <m.div
              className="absolute inset-0 rounded-lg"
              animate={{
                boxShadow: [
                  '0 0 15px rgba(0, 243, 255, 0.2)',
                  '0 0 40px rgba(0, 243, 255, 0.5)',
                  '0 0 15px rgba(0, 243, 255, 0.2)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative py-3 bg-tron-black/80 backdrop-blur-md border border-tron-cyan/40 rounded-lg overflow-hidden group-hover:border-tron-cyan/70 transition-colors">
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-tron-cyan/0 group-hover:bg-tron-cyan/10 transition-colors duration-300" />

              {/* Corner accents on button */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tron-cyan/50 group-hover:border-tron-cyan transition-colors" />

              <span
                className="relative font-[family-name:var(--font-orbitron)] text-sm tracking-[0.25em] font-medium text-tron-cyan"
                style={{ textShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}
              >
                PLAY AGAIN
              </span>
            </div>
          </m.button>
        </div>
      </m.div>
    </m.div>
  )
})

/* ─── Compact player row ─── */

function PlayerRow({
  label,
  pnl,
  balance,
  positions,
  isHighlight,
}: {
  label: React.ReactNode
  pnl: number
  balance: number
  positions: number
  isHighlight: boolean
  highlightColor?: 'cyan' | 'orange'
}) {
  const accent = isHighlight ? 'cyan' : 'orange'

  return (
    <div
      className={cn(
        'relative flex items-center justify-between px-3 py-2.5 rounded-lg border overflow-hidden transition-all duration-300',
        accent === 'cyan'
          ? 'border-cyan-400/30 bg-cyan-950/20'
          : 'border-orange-400/30 bg-orange-950/20'
      )}
    >
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.06] tron-grid pointer-events-none" />

      {/* Glow effect for winner */}
      {isHighlight && (
        <m.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            boxShadow:
              accent === 'cyan'
                ? [
                    'inset 0 0 15px rgba(0, 243, 255, 0.05)',
                    'inset 0 0 25px rgba(0, 243, 255, 0.1)',
                    'inset 0 0 15px rgba(0, 243, 255, 0.05)',
                  ]
                : [
                    'inset 0 0 15px rgba(255, 107, 0, 0.05)',
                    'inset 0 0 25px rgba(255, 107, 0, 0.1)',
                    'inset 0 0 15px rgba(255, 107, 0, 0.05)',
                  ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Corner accents */}
      <div
        className={cn(
          'absolute top-0 left-0 w-2 h-2 border-t border-l',
          accent === 'cyan' ? 'border-cyan-400/40' : 'border-orange-400/40'
        )}
      />
      <div
        className={cn(
          'absolute top-0 right-0 w-2 h-2 border-t border-r',
          accent === 'cyan' ? 'border-cyan-400/40' : 'border-orange-400/40'
        )}
      />
      <div
        className={cn(
          'absolute bottom-0 left-0 w-2 h-2 border-b border-l',
          accent === 'cyan' ? 'border-cyan-400/40' : 'border-orange-400/40'
        )}
      />
      <div
        className={cn(
          'absolute bottom-0 right-0 w-2 h-2 border-b border-r',
          accent === 'cyan' ? 'border-cyan-400/40' : 'border-orange-400/40'
        )}
      />

      {/* Left: Label */}
      <div className="relative z-10 flex flex-col items-start min-w-[48px]">
        <span
          className={cn(
            'text-[10px] tracking-[0.15em] font-medium font-[family-name:var(--font-orbitron)]',
            accent === 'cyan' ? 'text-cyan-400/90' : 'text-orange-400/90'
          )}
          style={{
            textShadow:
              accent === 'cyan'
                ? '0 0 8px rgba(0, 243, 255, 0.4)'
                : '0 0 8px rgba(255, 107, 0, 0.4)',
          }}
        >
          {label}
        </span>
        <span className="text-[9px] text-white/40">{positions} pos</span>
      </div>

      {/* Right: PnL + Balance */}
      <div className="relative z-10 flex items-center gap-3">
        <span className="text-[10px] font-mono text-white/50">${balance.toFixed(2)}</span>
        <span
          className={cn(
            'font-[family-name:var(--font-orbitron)] text-base font-bold tracking-wider',
            pnl >= 0 ? 'text-green-400' : 'text-red-400'
          )}
          style={{
            textShadow: pnl >= 0 ? '0 0 10px rgba(74, 222, 128, 0.4)' : '0 0 10px rgba(248, 113, 113, 0.4)',
          }}
        >
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
