'use client'

import React from 'react'
import type { CryptoSymbol } from '@/domains/hyper-swiper/client/state/trading.store'
import type { PriceData } from '@/domains/hyper-swiper/shared/trading.types'
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
