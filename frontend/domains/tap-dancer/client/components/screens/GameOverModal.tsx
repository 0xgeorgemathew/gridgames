'use client'

import React from 'react'
import { MatchResultOverlay } from '@/platform/ui/MatchResultOverlay'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
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
      return { text: 'VICTORY', colorClass: 'text-tron-cyan' }
    }
    return { text: 'DEFEAT', colorClass: 'text-tron-orange' }
  }

  const resultStyle = getResultStyle()

  return (
    <MatchResultOverlay
      title={resultStyle.text}
      accent={isWinner ? 'cyan' : 'orange'}
      onPlayAgain={playAgain}
      subtitle={
        <>
          {' '}
          <PlayerName
            username={
              !gameOverData.winnerName.startsWith('0x') ? gameOverData.winnerName : undefined
            }
            address={gameOverData.winnerName.startsWith('0x') ? gameOverData.winnerName : undefined}
            className="text-white/70"
            enableGlow={false}
          />
          <span>WINS</span>
        </>
      }
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
              className={cn('text-[10px]', !isWinner ? 'text-cyan-400/80' : 'text-orange-400/80')}
              enableGlow={false}
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
    </MatchResultOverlay>
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
          ? 'border-cyan-400/20 bg-cyan-950/15'
          : 'border-orange-400/20 bg-orange-950/15'
      )}
    >
      <div className="absolute inset-0 opacity-[0.06] tron-grid pointer-events-none" />

      <div className="relative z-10 flex flex-col items-start min-w-[48px]">
        <span
          className={cn(
            'text-[10px] tracking-[0.15em] font-medium',
            accent === 'cyan' ? 'text-cyan-400/80' : 'text-orange-400/80'
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
            'font-[family-name:var(--font-orbitron)] text-base font-bold tracking-wider',
            pnl >= 0 ? 'text-green-400' : 'text-red-400'
          )}
        >
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
