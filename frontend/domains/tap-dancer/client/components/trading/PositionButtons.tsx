'use client'

import React from 'react'
import { m } from 'framer-motion'
import { useTradingStore } from '@/domains/tap-dancer/client/state/trading.store'
import { CLIENT_GAME_CONFIG as CFG } from '@/domains/tap-dancer/client/game.config'
import { cn } from '@/platform/utils/classNames.utils'

export const PositionButtons = React.memo(function PositionButtons() {
  const { openPosition, players, localPlayerId } = useTradingStore()
  const player = players.find((p) => p.id === localPlayerId)
  const canOpen = player && player.dollars >= CFG.POSITION_COLLATERAL

  const handleLong = () => {
    if (!canOpen) return
    openPosition('long')
  }

  const handleShort = () => {
    if (!canOpen) return
    openPosition('short')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 flex gap-3 p-3 bg-black/60 backdrop-blur-md z-40 border-t border-tron-cyan/20">
      <m.button
        onClick={handleLong}
        disabled={!canOpen}
        whileHover={{ scale: canOpen ? 1.02 : 1 }}
        whileTap={{ scale: canOpen ? 0.98 : 1 }}
        className={cn(
          'flex-1 py-5 rounded-xl font-bold text-lg transition-all relative overflow-hidden',
          canOpen
            ? 'bg-green-500/20 border border-green-400/50 text-green-400 hover:bg-green-500/30'
            : 'bg-green-500/10 border border-green-400/20 text-green-400/40 cursor-not-allowed'
        )}
        style={{
          boxShadow: canOpen ? '0 0 30px rgba(34,197,94,0.2)' : 'none',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">▲</span>
          <span className="font-[family-name:var(--font-orbitron)] tracking-wider">LONG</span>
        </div>
      </m.button>

      <m.button
        onClick={handleShort}
        disabled={!canOpen}
        whileHover={{ scale: canOpen ? 1.02 : 1 }}
        whileTap={{ scale: canOpen ? 0.98 : 1 }}
        className={cn(
          'flex-1 py-5 rounded-xl font-bold text-lg transition-all relative overflow-hidden',
          canOpen
            ? 'bg-red-500/20 border border-red-400/50 text-red-400 hover:bg-red-500/30'
            : 'bg-red-500/10 border border-red-400/20 text-red-400/40 cursor-not-allowed'
        )}
        style={{
          boxShadow: canOpen ? '0 0 30px rgba(239,68,68,0.2)' : 'none',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">▼</span>
          <span className="font-[family-name:var(--font-orbitron)] tracking-wider">SHORT</span>
        </div>
      </m.button>
    </div>
  )
})
