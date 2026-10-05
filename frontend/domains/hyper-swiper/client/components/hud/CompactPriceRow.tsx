'use client'

import React from 'react'
import type { CryptoSymbol } from '@/domains/hyper-swiper/client/state/trading.store'
import type { PriceData } from '@/domains/hyper-swiper/shared/trading.types'
import { formatTime } from './types'

interface CompactPriceRowProps {
  priceData: PriceData | null
  selectedCrypto: CryptoSymbol
  isPriceConnected: boolean
  priceError: string | null
  gameTimeRemaining: number
  isSoundMuted: boolean
  onToggleSound: () => void
  onShowHowToPlay: () => void
  onEndGame: () => void
  isGameReady: boolean
  playerBalance?: number
  opponentBalance?: number
  playerName?: string
  opponentName?: string
}

function getDisplayName(name: string | undefined, maxLength: number = 8): string {
  if (!name) return 'YOU'
  if (name.toLowerCase().endsWith('.base.eth')) {
    const baseName = name.slice(0, -9)
    return baseName.length > maxLength ? baseName.slice(0, maxLength) : baseName
  }
  const firstName = name.split(' ')[0] || name
  return firstName.length > maxLength ? firstName.slice(0, maxLength) : firstName
}

export const CompactPriceRow = React.memo(function CompactPriceRow({
  gameTimeRemaining,
  isGameReady,
  playerBalance,
  opponentBalance,
  playerName,
  opponentName,
}: CompactPriceRowProps) {
  const isLowTime = gameTimeRemaining <= 30000
  const isWinning =
    playerBalance !== undefined && opponentBalance !== undefined && playerBalance > opponentBalance
  const isTied =
    playerBalance !== undefined &&
    opponentBalance !== undefined &&
    playerBalance === opponentBalance

  return (
    <div className="hyper-scoreboard">
      <div className="hyper-scoreboard__seat">
        <span className="arena-label">YOU / {getDisplayName(playerName)}</span>
        <strong style={{ color: isWinning ? 'var(--arena-long)' : 'var(--arena-text)' }}>
          {isGameReady && playerBalance !== undefined ? `$${playerBalance.toLocaleString()}` : '—'}
        </strong>
      </div>
      <div
        className="hyper-scoreboard__timer"
        style={{ color: isLowTime ? 'var(--arena-short)' : 'var(--arena-text)' }}
      >
        <span className="arena-label">{isLowTime ? 'Final seconds' : 'Round clock'}</span>
        <strong>{isGameReady ? formatTime(gameTimeRemaining) : '—:—'}</strong>
      </div>
      <div className="hyper-scoreboard__seat">
        <span className="arena-label">RIVAL / {getDisplayName(opponentName || 'RIVAL')}</span>
        <strong
          style={{ color: !isWinning && !isTied ? 'var(--arena-short)' : 'var(--arena-text)' }}
        >
          {isGameReady && opponentBalance !== undefined
            ? `$${opponentBalance.toLocaleString()}`
            : '—'}
        </strong>
      </div>
    </div>
  )
})
