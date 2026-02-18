'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GAME_CONFIG } from '@/game/constants'
import { PlayerName } from '@/components/ens/PlayerName'
import { itemVariants, type PlayerLabel } from './types'

interface PlayerHealthBarProps {
  name: string
  dollars: number
  color: 'green' | 'red'
  index: number
  label: PlayerLabel
}

const healthGradientClasses = {
  green: 'bg-gradient-to-r from-emerald-500 to-green-400',
  yellow: 'bg-gradient-to-r from-yellow-500 to-amber-400',
  red: 'bg-gradient-to-r from-red-600 to-red-500',
}

/**
 * Player Health Bar - Displays player name, health bar, and dollar amount.
 */
export const PlayerHealthBar = React.memo(
  function PlayerHealthBar({ name, dollars, label }: PlayerHealthBarProps) {
    const healthPercent = dollars / GAME_CONFIG.STARTING_CASH
    const healthColor = healthPercent > 0.6 ? 'green' : healthPercent > 0.3 ? 'yellow' : 'red'
    const isYou = label === 'YOU'

    return (
      <motion.div
        variants={itemVariants}
        className={cn(
          'space-y-1.5 relative rounded-lg',
          isYou ? 'border-r-2 border-tron-cyan/50' : ''
        )}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between gap-1">
          <motion.span
            className="font-bold tracking-wide truncate text-[10px] sm:text-xs md:text-sm text-white flex items-center"
            animate={{
              textShadow:
                healthColor === 'red'
                  ? '0 0 10px rgba(255,68,68,0.8), 0 0 20px rgba(255,68,68,0.5)'
                  : '0 0 10px rgba(255,255,255,0.5)',
            }}
            transition={{ duration: 0.3 }}
          >
            <PlayerName
              username={!name.startsWith('0x') ? name : undefined}
              address={name.startsWith('0x') ? name : undefined}
              className={isYou ? 'text-white' : 'text-red-400'}
            />
          </motion.span>
          {isYou ? (
            <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded bg-tron-cyan text-black shadow-[0_0_10px_rgba(0,243,255,0.5)]">
              YOU
            </span>
          ) : (
            <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/50">
              OPP
            </span>
          )}
        </div>

        <div className="relative h-3 sm:h-4 bg-black/80 rounded-full overflow-hidden border border-white/20">
          <motion.div
            className={cn('h-full rounded-full', healthGradientClasses[healthColor])}
            initial={{ width: 0 }}
            animate={{ width: `${healthPercent * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        </div>

        <motion.span
          className={cn(
            'text-[10px] sm:text-xs font-mono font-bold text-center block',
            healthColor === 'red' ? 'text-red-400 animate-pulse' : 'text-white/80'
          )}
          key={dollars}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          ${dollars}
        </motion.span>
      </motion.div>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.dollars === nextProps.dollars &&
      prevProps.label === nextProps.label &&
      prevProps.name === nextProps.name
    )
  }
)
