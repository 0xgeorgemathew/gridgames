'use client'

import React from 'react'
import { m } from 'framer-motion'

/**
 * Price Loading State - Cyberpunk aesthetic loading indicator.
 */
export const PriceLoadingState = React.memo(function PriceLoadingState() {
  return (
    <div className="flex items-center gap-4 bg-tron-black/80 px-6 py-4 border border-tron-cyan/30 rounded-sm hologram relative overflow-hidden">
      {/* Background scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,243,255,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />

      {/* Decorative targeting corners */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tron-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tron-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-tron-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tron-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />

      {/* Animated loading ring */}
      <div className="relative z-10">
        <m.div
          className="w-10 h-10 rounded-full border-2 border-tron-cyan/20 border-t-tron-cyan border-l-tron-cyan"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <m.div
          className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-r-tron-orange/70 border-b-tron-orange/70"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
        <m.div
          className="absolute inset-0 m-auto w-2 h-2 bg-tron-cyan/50 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>

      {/* Loading text with glitch effect */}
      <div className="flex flex-col z-10 ml-2">
        <m.span
          className="text-sm font-mono text-tron-cyan tracking-[0.2em] font-bold"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          DATALINK: ACTIVE
        </m.span>
        <m.span className="text-[10px] text-tron-white-dim font-mono tracking-wider mt-0.5 relative">
          <m.span
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          >
            SYNCING BTC FEED
          </m.span>
          <m.span
            className="inline-block ml-1 text-tron-orange"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, times: [0, 0.5, 1] }}
          >
            _
          </m.span>
        </m.span>
      </div>
    </div>
  )
})
