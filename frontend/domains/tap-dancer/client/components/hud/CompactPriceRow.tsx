'use client'

import React from 'react'
import { cn } from '@/platform/utils/classNames.utils'
import styles from '../stage.module.css'
import type { CryptoSymbol } from '@/domains/tap-dancer/client/state/trading.types'
import type { PriceData } from '@/domains/tap-dancer/shared/trading.types'
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
    <div className={styles.scores}>
      {isGameReady && playerBalance !== undefined && (
        <div className={styles.score}>
          <span className="arena-label">{getDisplayName(playerName)}</span>
          <strong className={styles.balance}>{'$'}{playerBalance.toLocaleString()}</strong>
          <span className={styles.scoreStatus}>{isWinning ? 'LEADING' : isTied ? 'LEVEL' : 'CHASING'}</span>
        </div>
      )}
      {isGameReady && (
        <div className={styles.roundClock}>
          <span className="arena-label">ROUND</span>
          <strong className={cn(styles.clock, isLowTime && styles.negative)}>{formatTime(gameTimeRemaining)}</strong>
        </div>
      )}
      {isGameReady && playerBalance !== undefined && (
        <div className={cn(styles.score, styles.rival)}>
          <span className="arena-label">{getDisplayName(opponentName || 'RIVAL')}</span>
          <strong className={styles.balance}>{'$'}{opponentBalance?.toLocaleString() ?? '0'}</strong>
          <span className={styles.scoreStatus}>OPPONENT</span>
        </div>
      )}
    </div>
  )
})
