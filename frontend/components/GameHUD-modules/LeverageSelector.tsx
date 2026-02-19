'use client'

import React from 'react'
import { useTradingStore } from '@/game/stores/trading-store'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Leverage options available during gameplay.
 * Higher leverage = higher risk and reward.
 */
const LEVERAGE_OPTIONS = [
  { value: 1, color: 'cyan', label: '1X', description: 'Safe' },
  { value: 2, color: 'green', label: '2X', description: 'Balanced' },
  { value: 5, color: 'yellow', label: '5X', description: 'Risky' },
  { value: 10, color: 'red', label: '10X', description: 'Extreme' },
] as const

/**
 * Get the glow color for each leverage level.
 */
function getLeverageGlow(leverage: number): string {
  switch (leverage) {
    case 1:
      return '0 0 20px rgba(0, 243, 255, 0.5)'
    case 2:
      return '0 0 20px rgba(74, 222, 128, 0.5)'
    case 5:
      return '0 0 20px rgba(250, 204, 21, 0.5)'
    case 10:
      return '0 0 20px rgba(248, 113, 113, 0.5)'
    default:
      return '0 0 20px rgba(0, 243, 255, 0.5)'
  }
}

/**
 * Get the text color class for each leverage level.
 */
function getLeverageColorClass(leverage: number): string {
  switch (leverage) {
    case 1:
      return 'text-tron-cyan'
    case 2:
      return 'text-green-400'
    case 5:
      return 'text-yellow-400'
    case 10:
      return 'text-red-400'
    default:
      return 'text-tron-cyan'
  }
}

/**
 * Get the border color class for each leverage level.
 */
function getLeverageBorderClass(leverage: number, isSelected: boolean): string {
  const opacity = isSelected ? '0.8' : '0.3'
  switch (leverage) {
    case 1:
      return `border-tron-cyan/${opacity}`
    case 2:
      return `border-green-400/${opacity}`
    case 5:
      return `border-yellow-400/${opacity}`
    case 10:
      return `border-red-400/${opacity}`
    default:
      return `border-tron-cyan/${opacity}`
  }
}

/**
 * LeverageSelector - Manual leverage control for gameplay.
 *
 * Displays 4 pill buttons (1X, 2X, 5X, 10X) with risk-colored glows.
 * Players can change leverage at any time - only new orders are affected.
 */
export const LeverageSelector = React.memo(function LeverageSelector() {
  const { leverage, setLeverage, isPlaying } = useTradingStore()

  if (!isPlaying) return null

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {LEVERAGE_OPTIONS.map((option) => {
        const isSelected = leverage === option.value

        return (
          <motion.button
            key={option.value}
            onClick={() => setLeverage(option.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'relative px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-black text-xs sm:text-sm tracking-wider',
              'border transition-all duration-200 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0',
              'flex flex-col items-center justify-center',
              getLeverageBorderClass(option.value, isSelected),
              isSelected
                ? `${getLeverageColorClass(option.value)} bg-black/40`
                : 'text-white/40 bg-black/20'
            )}
            style={{
              boxShadow: isSelected ? getLeverageGlow(option.value) : 'none',
            }}
            title={`${option.description} - ${option.value}x transfer on correct prediction`}
          >
            {/* Animated glow ring for selected option */}
            {isSelected && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  boxShadow: getLeverageGlow(option.value),
                }}
              />
            )}

            {/* Label */}
            <span className="relative z-10">{option.label}</span>

            {/* Risk indicator dot */}
            <motion.div
              className={cn(
                'relative z-10 w-1.5 h-1.5 rounded-full mt-0.5',
                option.value === 1 && 'bg-tron-cyan',
                option.value === 2 && 'bg-green-400',
                option.value === 5 && 'bg-yellow-400',
                option.value === 10 && 'bg-red-400'
              )}
              animate={isSelected ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1, repeat: isSelected ? Infinity : 0 }}
            />
          </motion.button>
        )
      })}
    </div>
  )
})
