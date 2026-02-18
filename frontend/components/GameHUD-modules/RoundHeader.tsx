'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { itemVariants } from './types'
import { formatTime } from './types'
import { Multiplier2XBadge } from './Multiplier2XBadge'

interface RoundHeaderProps {
  currentRound: number
  player1Wins: number
  player2Wins: number
  isSuddenDeath: boolean
  roundTimeRemaining: number
  isPlayer1: boolean
}

/**
 * Round Header - Displays round info, timer, and win counters.
 */
export const RoundHeader = React.memo(function RoundHeader({
  currentRound,
  player1Wins,
  player2Wins,
  isSuddenDeath,
  roundTimeRemaining,
  isPlayer1,
}: RoundHeaderProps) {
  const roundSeconds = Math.ceil(roundTimeRemaining / 1000)
  const timeClass = roundSeconds <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
  const roundDisplay = isSuddenDeath ? '⚡ SUDDEN DEATH' : `ROUND ${currentRound}`

  const yourWins = isPlayer1 ? player1Wins : player2Wins
  const oppWins = isPlayer1 ? player2Wins : player1Wins

  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center justify-between px-2 py-1.5 bg-black/20 rounded-lg border border-white/10 gap-2"
      initial="hidden"
      animate="visible"
    >
      {/* Left Section: Round Badge + 2X Indicator */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'px-3 py-1 rounded font-black text-xs tracking-wider',
            isSuddenDeath
              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
              : 'bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/50'
          )}
          style={{
            textShadow: isSuddenDeath
              ? '0 0 10px rgba(239,68,68,0.8)'
              : '0 0 10px rgba(0,243,255,0.5)',
          }}
        >
          {roundDisplay}
        </div>
        <Multiplier2XBadge />
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-sm">⏱️</span>
        <span
          className={cn('text-2xl sm:text-3xl font-mono font-black tracking-wider', timeClass)}
          style={{ textShadow: '0 0 15px rgba(255,255,255,0.3)' }}
        >
          {formatTime(roundSeconds)}
        </span>
      </div>

      {/* Win Counter */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'text-xs font-bold px-2 py-1 rounded',
            oppWins > yourWins ? 'bg-tron-cyan/20 text-tron-cyan' : 'bg-white/10 text-white/60'
          )}
        >
          OPP: {oppWins}
        </span>
        <span className="text-white/30">:</span>
        <span
          className={cn(
            'text-xs font-bold px-2 py-1 rounded',
            yourWins > oppWins ? 'bg-tron-orange/20 text-tron-orange' : 'bg-white/10 text-white/60'
          )}
        >
          YOU: {yourWins}
        </span>
      </div>
    </motion.div>
  )
})
