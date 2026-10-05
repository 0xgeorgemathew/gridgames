'use client'

import React from 'react'
import { m } from 'framer-motion'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { cn } from '@/platform/utils/classNames.utils'
import { PlayerName } from '@/platform/ui/PlayerName'
import styles from '../stage.module.css'

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

  function getResultStyle(): { text: string; colorClass: string } {
    if (isWinner) {
      return { text: 'VICTORY', colorClass: styles.positive }
    }
    return { text: 'DEFEAT', colorClass: styles.negative }
  }

  const resultStyle = getResultStyle()

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={styles.resultBackdrop}
    >
      <m.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={styles.result}
      >
        <p className="arena-label mb-3">Tap Dancer / Round results</p>
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
          className="mb-6"
        >
          <h2
            className={cn(
              'arena-display text-5xl font-black tracking-tight',
              resultStyle.colorClass
            )}
          >
            {resultStyle.text}
          </h2>
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
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-4 space-y-2"
        >
          <PlayerRow
            label="YOU"
            pnl={localTotalPnl}
            balance={localFinalBalance}
            positions={localPositionCount}
            isHighlight={isWinner}
            highlightColor="cyan"
          />
          <PlayerRow
            label={
              opponent?.name ? (
                <PlayerName
                  username={!opponent.name.startsWith('0x') ? opponent.name : undefined}
                  address={opponent.name.startsWith('0x') ? opponent.name : undefined}
                  className={cn(
                    'text-[10px]',
                    !isWinner ? 'text-[#d9f56e]/80' : 'text-[#ff68bc]/80'
                  )}
                />
              ) : (
                'OPP'
              )
            }
            pnl={opponentTotalPnl}
            balance={opponentFinalBalance}
            positions={opponentPositionCount}
            isHighlight={!isWinner}
            highlightColor="cyan"
          />
        </m.div>

        <m.button
          whileTap={{ scale: 0.95 }}
          onClick={playAgain}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="arena-button arena-button--primary w-full"
        >
          PLAY AGAIN ↗
        </m.button>
      </m.div>
    </m.div>
  )
})

function PlayerRow({
  label,
  pnl,
  balance,
  positions,
  isHighlight,
  highlightColor,
}: {
  label: React.ReactNode
  pnl: number
  balance: number
  positions: number
  isHighlight: boolean
  highlightColor: 'cyan' | 'orange'
}) {
  const accent = isHighlight ? 'cyan' : 'orange'

  return (
    <div
      className={cn(
        'relative flex items-center justify-between px-3 py-2.5 rounded-lg border overflow-hidden',
        accent === 'cyan'
          ? 'border-[#d9f56e]/30 bg-[#d9f56e]/5'
          : 'border-[#ff68bc]/20 bg-[#ff68bc]/5'
      )}
    >
      <div className="absolute inset-0 opacity-[0.06]  pointer-events-none" />

      <div className="relative z-10 flex flex-col items-start min-w-[48px]">
        <span
          className={cn(
            'text-[10px] tracking-[0.15em] font-medium',
            accent === 'cyan' ? 'text-[#d9f56e]/80' : 'text-[#ff68bc]/80'
          )}
        >
          {label}
        </span>
        <span className="text-[9px] text-white/30">{positions} pos</span>
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <span className={cn('text-[10px] font-mono text-white/40')}>${balance.toFixed(2)}</span>
        <span
          className={cn(
            'font-mono text-base font-bold tracking-wider',
            pnl >= 0 ? 'text-[#d9f56e]' : 'text-[#ff68bc]'
          )}
        >
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
