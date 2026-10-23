'use client'

import React from 'react'
import type { CryptoSymbol } from '@/domains/tap-dancer/client/state/trading.types'
import type { PriceData } from '@/domains/tap-dancer/shared/trading.types'
import { MatchScoreRow } from '@/platform/ui/MatchScoreRow'

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

export const CompactPriceRow = React.memo(function CompactPriceRow(props: CompactPriceRowProps) {
  return <MatchScoreRow {...props} />
})
