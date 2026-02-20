'use client'

import { useTradingStore } from '../game/stores/trading-store'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const FLASH_DURATION = 800 // 0.8 seconds

/**
 * SettlementFlash - Shows simple position opened feedback
 * With perp-style positions, we show a brief flash when a position is opened
 * No settlement flash during gameplay - all positions settle at game end
 */
export function SettlementFlash() {
  const { openPositions, localPlayerId } = useTradingStore()
  const [isVisible, setIsVisible] = useState(false)
  const [isLong, setIsLong] = useState(true)
  const lastShownIdRef = useRef<string | null>(null)

  // Get the most recent position for the local player
  const localPositions = Array.from(openPositions.values())
    .filter((pos) => pos.playerId === localPlayerId)
    .sort((a, b) => b.openedAt - a.openedAt)
  const latestPosition = localPositions[0]

  useEffect(() => {
    if (!latestPosition || !localPlayerId) {
      lastShownIdRef.current = null
      return
    }

    // Only show if this is a new position
    if (latestPosition.id !== lastShownIdRef.current) {
      lastShownIdRef.current = latestPosition.id

      // Use setTimeout to avoid synchronous setState in effect
      const showTimer = setTimeout(() => {
        setIsLong(latestPosition.isLong)
        setIsVisible(true)
      }, 0)

      // Hide after duration via timeout callback (async setState)
      const hideTimer = setTimeout(() => setIsVisible(false), FLASH_DURATION)

      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [latestPosition, localPlayerId])

  if (!isVisible) return null

  const directionText = isLong ? 'LONG ▲' : 'SHORT ▼'
  const directionColor = isLong ? 'text-green-400' : 'text-red-400'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Subtle background glow */}
          <motion.div
            className={cn('absolute inset-0', isLong ? 'bg-green-500/5' : 'bg-red-500/5')}
            animate={{
              opacity: [0, 0.2, 0],
            }}
            transition={{
              duration: FLASH_DURATION / 1000,
              ease: 'easeOut',
            }}
          />

          {/* Position opened display */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{
              duration: FLASH_DURATION / 1000,
              ease: 'easeOut',
            }}
            className="relative"
          >
            <motion.span
              className={cn(
                'text-5xl sm:text-6xl font-black font-mono tracking-tight block',
                directionColor
              )}
              style={{
                textShadow: isLong
                  ? '0 0 20px rgba(74, 222, 128, 0.6)'
                  : '0 0 20px rgba(248, 113, 113, 0.6)',
              }}
            >
              {directionText}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
