'use client'

import React from 'react'
import { motion } from 'framer-motion'

/**
 * Price Loading State - Cyberpunk aesthetic loading indicator.
 */
export const PriceLoadingState = React.memo(function PriceLoadingState() {
  return (
    <div className="flex items-center gap-3">
      {/* Animated loading ring */}
      <div className="relative">
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-tron-cyan/30 border-t-tron-cyan"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 w-8 h-8 rounded-full border-2 border-transparent border-r-tron-orange/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Loading text with glitch effect */}
      <div className="flex flex-col">
        <motion.span
          className="text-xs font-mono text-tron-cyan tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          CONNECTING TO PRICE FEED
        </motion.span>
        <motion.span
          className="text-[10px] text-tron-white-dim font-mono"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >
          AWAITING LIVE BTC DATA
        </motion.span>
      </div>
    </div>
  )
})
