'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { itemVariants } from './types'
import { formatTime } from './types'
import { Multiplier2XBadge } from './Multiplier2XBadge'

interface TimerDisplayProps {
  gameTimeRemaining: number // milliseconds
}

/**
 * TimerDisplay - Displays game timer and 2X multiplier badge.
 */
export const RoundHeader = React.memo(function TimerDisplay({
  gameTimeRemaining,
}: TimerDisplayProps) {
  const isLowTime = gameTimeRemaining <= 30000 // Red when <= 30 seconds

  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center justify-center px-4 py-2 bg-black/20 rounded-lg border border-white/10 gap-4"
      initial="hidden"
      animate="visible"
    >
      {/* 2X Badge */}
      <Multiplier2XBadge />

      {/* Timer */}
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-sm">⏱️</span>
        <span
          className={cn(
            'text-2xl sm:text-3xl font-mono font-black tracking-wider',
            isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
          )}
          style={{ textShadow: '0 0 15px rgba(255,255,255,0.3)' }}
        >
          {formatTime(gameTimeRemaining)}
        </span>
      </div>
    </motion.div>
  )
})
