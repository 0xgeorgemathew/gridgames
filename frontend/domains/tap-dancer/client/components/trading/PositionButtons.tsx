'use client'

import React from 'react'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { CLIENT_GAME_CONFIG as CFG } from '@/domains/tap-dancer/client/game.config'
import { CoinButton } from './CoinButton'

export const PositionButtons = React.memo(function PositionButtons() {
  const { openPosition, players, localPlayerId } = useTradingStore()
  const player = players.find((p) => p.id === localPlayerId)
  const canOpen = player && player.dollars >= CFG.POSITION_COLLATERAL

  const handleUp = () => {
    if (!canOpen) return
    openPosition('long')
  }

  const handleDown = () => {
    if (!canOpen) return
    openPosition('short')
  }

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center items-center gap-12 z-40">
      <CoinButton
        direction="up"
        onClick={handleUp}
        disabled={!canOpen}
        aria-label="Open Long Position (UP)"
        size={88}
      />
      <CoinButton
        direction="down"
        onClick={handleDown}
        disabled={!canOpen}
        aria-label="Open Short Position (DOWN)"
        size={88}
      />
    </div>
  )
})
