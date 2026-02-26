'use client'

import { useShallow } from 'zustand/react/shallow'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { PositionIndicator } from '@/platform/ui/PositionIndicator'

export function PositionList() {
  const { openPositions, localPlayerId, priceData, closePosition, closingPositions, isPlaying } =
    useTradingStore(
      useShallow((s) => ({
        openPositions: s.openPositions,
        localPlayerId: s.localPlayerId,
        priceData: s.priceData,
        closePosition: s.closePosition,
        closingPositions: s.closingPositions,
        isPlaying: s.isPlaying,
      }))
    )

  return (
    <PositionIndicator
      openPositions={openPositions}
      localPlayerId={localPlayerId}
      priceData={priceData}
      closePosition={closePosition}
      closingPositions={closingPositions}
      isPlaying={isPlaying}
    />
  )
}
