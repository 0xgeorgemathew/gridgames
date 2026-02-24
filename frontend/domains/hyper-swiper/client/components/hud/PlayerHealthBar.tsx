'use client'

import React from 'react'
import { m } from 'framer-motion'
import { cn } from '@/platform/utils/classNames.utils'
import { CLIENT_GAME_CONFIG as CFG } from '../../game.config'
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
    const healthPercent = Math.min(1, Math.max(0, dollars / CFG.STARTING_BALANCE))
    const isLowHealth = healthPercent <= 0.3
    const isMediumHealth = healthPercent <= 0.6 && healthPercent > 0.3

    const healthColor = isLowHealth ? 'red' : isMediumHealth ? 'yellow' : 'green'

    const healthGradientClasses = {
      green: 'bg-gradient-to-r from-emerald-700/70 to-emerald-500/70',
      yellow: 'bg-gradient-to-r from-yellow-700/70 to-amber-600/70',
      red: 'bg-gradient-to-r from-red-800/70 to-red-600/70',
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
                ? '0 0 5px rgba(248,113,113,0.5)'
                : '0 0 5px rgba(255,255,255,0.2)',
            }}
            key={dollars}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            ${dollars.toLocaleString()}
          </m.span>
        </div>

        {/* Health bar container - Angled/Skewed arcade style */}
        <div className="relative px-1 pb-1">
          <div
            className={cn(
              'relative h-3 sm:h-3.5 bg-tron-black/60 border border-tron-cyan/20 overflow-hidden transform -skew-x-[15deg]',
              isLowHealth && 'animate-pulse'
            )}
          >
            {/* Grid texture inside empty portion */}
            <div className="absolute inset-0 opacity-30 tron-grid pointer-events-none bg-[length:10px_10px]" />

            <m.div
              className={cn(
                'h-full relative shadow-[0_0_8px_rgba(currentColor,0.3)]',
                healthGradientClasses[healthColor]
              )}
              initial={{ width: 0 }}
              animate={{ width: `${healthPercent * 100}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="absolute top-0 right-0 bottom-0 w-[5px] bg-white/50 blur-[1px]" />
            </m.div>

            {/* Glossy top overlay */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-white/10 pointer-events-none" />

            {/* Glowing tick marks every 25% */}
            <div className="absolute inset-0 flex justify-between px-[25%] opacity-40 pointer-events-none">
              <div className="w-[1px] h-full bg-tron-cyan/50" />
              <div className="w-[1px] h-full bg-tron-cyan/50" />
              <div className="w-[1px] h-full bg-tron-cyan/50" />
            </div>

            {/* Glow effect for low health */}
            {isLowHealth && (
              <m.div
                className="absolute inset-0 bg-red-800/20"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>

          {/* Sub-bar decoration */}
          <div className="flex justify-between w-full mt-1 transform -skew-x-[15deg] opacity-60">
            <div className="flex gap-1">
              <div className="h-[2px] w-8 bg-tron-cyan/40" />
              <div className="h-[2px] w-2 bg-tron-cyan/70" />
            </div>
            <div className="h-[2px] w-12 bg-tron-cyan/40" />
          </div>
        </div>
      </m.div>
    )
  },
  (prevProps, nextProps) => {
    return prevProps.dollars === nextProps.dollars
  }
)
