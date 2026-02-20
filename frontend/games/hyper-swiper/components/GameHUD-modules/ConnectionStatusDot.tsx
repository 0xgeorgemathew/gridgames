'use client'

import React from 'react'
import { m } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ConnectionStatusDotProps {
  isPriceConnected: boolean
  priceError: string | null
}

/**
 * Connection Status Dot - Animated indicator for price feed connection status.
 */
export const ConnectionStatusDot = React.memo(function ConnectionStatusDot({
  isPriceConnected,
  priceError,
}: ConnectionStatusDotProps) {
  const colorClass = isPriceConnected
    ? 'bg-tron-cyan'
    : priceError
      ? 'bg-red-400'
      : 'bg-tron-orange'

  return (
    <m.div
      className={cn('w-2 h-2 rounded-full', colorClass)}
      animate={{
        scale: isPriceConnected ? [1, 1.4, 1] : priceError ? [1, 1.2, 1] : [0.8, 1, 0.8],
        opacity: isPriceConnected ? [1, 0.7, 1] : 1,
      }}
      transition={{
        duration: isPriceConnected ? 1.5 : 0.5,
        repeat: isPriceConnected ? Infinity : 3,
      }}
      style={{
        boxShadow: isPriceConnected
          ? '0 0 8px rgba(0, 243, 255, 0.8)'
          : priceError
            ? '0 0 8px rgba(248, 113, 113, 0.8)'
            : '0 0 8px rgba(255, 107, 0, 0.8)',
      }}
    />
  )
})
