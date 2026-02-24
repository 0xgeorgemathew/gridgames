'use client'

import { formatPrice } from '@/platform/utils/price.utils'

interface CountUpProps {
  value: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Real-time price display.
 * Replaces the old slow CountUp spring for maximum HFT-style reactivity.
 */
export function CountUp({ value, className, style }: CountUpProps) {
  return (
    <span className={className} style={style}>
      {formatPrice(value)}
    </span>
  )
}
