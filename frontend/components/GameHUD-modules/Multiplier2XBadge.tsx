'use client'

import React, { useState, useEffect } from 'react'
import { useTradingStore } from '@/game/stores/trading-store'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * 2X Multiplier Badge - Small inline badge for use in headers.
 * Shows the active whale multiplier with countdown.
 */
export const Multiplier2XBadge = React.memo(function Multiplier2XBadge() {
  const { whale2XExpiresAt, whaleMultiplier } = useTradingStore()
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, (whale2XExpiresAt || 0) - Date.now())
  )

  useEffect(() => {
    const calculateTimeLeft = () => {
      const remaining = whale2XExpiresAt ? Math.max(0, whale2XExpiresAt - Date.now()) : 0
      setTimeLeft(remaining)
    }

    const interval = setInterval(calculateTimeLeft, 50)
    return () => clearInterval(interval)
  }, [whale2XExpiresAt])

  const isActive = timeLeft > 0
  const secondsLeft = Math.ceil(timeLeft / 1000)

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key="2x-badge"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="px-2 py-1 rounded font-black text-xs tracking-wider bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50"
          style={{ textShadow: '0 0 10px rgba(217,70,239,0.8)' }}
        >
          ⚡ {whaleMultiplier}X ({secondsLeft}s)
        </motion.div>
      )}
    </AnimatePresence>
  )
})
