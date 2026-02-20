'use client'

import React from 'react'
import { m } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GAME_CONFIG } from '../../game/constants'
import { itemVariants } from './types'

interface SinglePlayerHealthProps {
  dollars: number
}

/**
 * SinglePlayerHealth - Simplified health display for bottom navigation.
 *
 * Shows only the local player's cash/health to reduce cognitive load.
 * Removes opponent health entirely - users focus on their own game
 * and make faster decisions.
 */
export const SinglePlayerHealth = React.memo(
  function SinglePlayerHealth({ dollars }: SinglePlayerHealthProps) {
    const healthPercent = Math.min(1, Math.max(0, dollars / GAME_CONFIG.STARTING_CASH))
    const isLowHealth = healthPercent <= 0.3
    const isMediumHealth = healthPercent <= 0.6 && healthPercent > 0.3

    const healthColor = isLowHealth ? 'red' : isMediumHealth ? 'yellow' : 'green'

    const healthGradientClasses = {
      green: 'bg-gradient-to-r from-emerald-500 to-green-400',
      yellow: 'bg-gradient-to-r from-yellow-500 to-amber-400',
      red: 'bg-gradient-to-r from-red-600 to-red-500',
    }

    return (
      <m.div
        variants={itemVariants}
        className="w-full max-w-xs mx-auto"
        initial="hidden"
        animate="visible"
      >
        {/* Label and dollar amount row */}
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[10px] sm:text-xs text-tron-cyan tracking-wider font-medium">
            Balance
          </span>
          <m.span
            className={cn(
              'text-sm sm:text-base font-bold font-numeric',
              isLowHealth ? 'text-red-400' : 'text-white'
            )}
            style={{
              textShadow: isLowHealth
                ? '0 0 10px rgba(248,113,113,0.8)'
                : '0 0 10px rgba(255,255,255,0.3)',
            }}
            key={dollars}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            ${dollars.toLocaleString()}
          </m.span>
        </div>

        {/* Health bar */}
        <div
          className={cn(
            'relative h-2.5 sm:h-3 bg-black/80 rounded-full overflow-hidden border border-white/20',
            isLowHealth && 'animate-pulse'
          )}
        >
          <m.div
            className={cn('h-full rounded-full', healthGradientClasses[healthColor])}
            initial={{ width: 0 }}
            animate={{ width: `${healthPercent * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />

          {/* Glow effect for low health */}
          {isLowHealth && (
            <m.div
              className="absolute inset-0 bg-red-500/20 rounded-full"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
      </m.div>
    )
  },
  (prevProps, nextProps) => {
    return prevProps.dollars === nextProps.dollars
  }
)
