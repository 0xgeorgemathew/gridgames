'use client'

import React from 'react'
import { useTradingStore } from '@/domains/hyper-swiper/client/state/trading.store'
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

  const result = isTie ? 'DRAW' : isWinner ? 'VICTORY' : 'DEFEAT'
  const color = isTie
    ? 'var(--arena-accent)'
    : isWinner
      ? 'var(--arena-long)'
      : 'var(--arena-short)'
  const seats = [
    {
      label: 'YOU',
      player: localPlayer,
      balance: localFinalBalance,
      pnl: localTotalPnl,
      count: localPositionCount,
    },
    {
      label: 'RIVAL',
      player: opponent,
      balance: opponentFinalBalance,
      pnl: opponentTotalPnl,
      count: opponentPositionCount,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-[#080b1b]/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hyper-result-title"
    >
      <section className="arena-dialog hyper-result">
        <div className="hyper-result__seal" style={{ color }} aria-hidden="true">
          {isTie ? '=' : isWinner ? '↗' : '↘'}
        </div>
        <p className="arena-label text-center mb-3">Orbital arena / Round complete</p>
        <h2 id="hyper-result-title" className="arena-display hyper-result__title" style={{ color }}>
          {result}
        </h2>
        <p className="arena-meta text-center mt-4">
          {isTie
            ? 'An even finish. Settle it next round.'
            : isWinner
              ? 'Your edge made the difference.'
              : 'The next round is a new market.'}
        </p>
        {!isTie && gameOverData.winnerName && (
          <div className="text-center mt-3 text-xs">
            <span className="arena-label">Winner / </span>
            <PlayerName
              username={gameOverData.winnerName}
              address={
                gameOverData.winnerName.startsWith('0x') ? gameOverData.winnerName : undefined
              }
            />
          </div>
        )}
        <div className="hyper-result__scores">
          {seats.map((seat) => (
            <div key={seat.label}>
              <p className="arena-label">{seat.label}</p>
              <div className="text-xs truncate mt-1">
                <PlayerName username={seat.player?.name || seat.label} />
              </div>
              <strong>${seat.balance.toFixed(2)}</strong>
              <p className="arena-label">Final balance</p>
              <div className="mt-4 border-t border-white/10 pt-3 text-xs flex justify-between gap-2">
                <span className="arena-meta">P&amp;L</span>
                <b style={{ color: seat.pnl >= 0 ? 'var(--arena-long)' : 'var(--arena-short)' }}>
                  {seat.pnl >= 0 ? '+' : '-'}${Math.abs(seat.pnl).toFixed(2)}
                </b>
              </div>
              <div className="mt-2 text-xs flex justify-between gap-2">
                <span className="arena-meta">Positions</span>
                <b>{seat.count}</b>
              </div>
            </div>
          ))}
        </div>
        <button onClick={playAgain} className="arena-button arena-button--primary w-full">
          BACK TO THE ARENA ↗
        </button>
      </section>
    </div>
  )
})
