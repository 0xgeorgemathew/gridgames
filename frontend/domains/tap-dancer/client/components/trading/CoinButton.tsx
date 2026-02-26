'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { cn } from '@/platform/utils/classNames.utils'
import { useTradingStore } from '@/domains/tap-dancer/client/state/slices/index'

// ============================================================================
// COIN BUTTON - TRON LEGACY ARCADE AESTHETIC
// ============================================================================
// Circular coin-style button matching Hyper Swiper's visual language:
// - Multi-layer neon glow (exponential falloff)
// - Solid dark core
// - Refined edge ring system
// - Equilateral triangle symbol (UP/DOWN)
// - Light glow default, brightest glow on press
// ============================================================================

/**
 * Color configuration matching Hyper Swiper's CoinRenderer
 * @see frontend/domains/hyper-swiper/client/phaser/systems/CoinRenderer.ts
 */
const COIN_THEME = {
  up: {
    // Cyan/Electric Blue
    primary: '#00ffaa',
    glow: '#00ffcc',
    darkCore: '#001a12',
    edgeAccent: '#00ff88',
  },
  down: {
    // Magenta/Neon
    primary: '#ff2266',
    glow: '#ff4488',
    darkCore: '#1a0812',
    edgeAccent: '#ff6699',
  },
} as const

/**
 * Generate INSET box-shadow for light glow (default state)
 * Subtle, present but not overwhelming - inside the button
 */
function generateLightGlow(theme: (typeof COIN_THEME)[keyof typeof COIN_THEME]): string {
  const r = parseInt(theme.glow.slice(1, 3), 16)
  const g = parseInt(theme.glow.slice(3, 5), 16)
  const b = parseInt(theme.glow.slice(5, 7), 16)

  // Semi-on state: very subtle, almost off
  return `
    inset 0 0 10px rgba(${r}, ${g}, ${b}, 0.08),
    inset 0 0 20px rgba(${r}, ${g}, ${b}, 0.04)
  `
    .trim()
    .replace(/\n/g, '')
}

/**
 * Generate INSET box-shadow for brightest glow (pressed state)
 * Intense, full-power glow effect - inside the button
 */
function generateBrightestGlow(theme: (typeof COIN_THEME)[keyof typeof COIN_THEME]): string {
  const r = parseInt(theme.glow.slice(1, 3), 16)
  const g = parseInt(theme.glow.slice(3, 5), 16)
  const b = parseInt(theme.glow.slice(5, 7), 16)

  return `
    inset 0 0 20px rgba(${r}, ${g}, ${b}, 0.5),
    inset 0 0 40px rgba(${r}, ${g}, ${b}, 0.35),
    inset 0 0 60px rgba(${r}, ${g}, ${b}, 0.2),
    inset 0 0 80px rgba(${r}, ${g}, ${b}, 0.1)
  `
    .trim()
    .replace(/\n/g, '')
}

/**
 * Generate INSET box-shadow for medium glow (beat state)
 * Subtle pulse glow - between light and brightest
 */
function generateMediumGlow(theme: (typeof COIN_THEME)[keyof typeof COIN_THEME]): string {
  const r = parseInt(theme.glow.slice(1, 3), 16)
  const g = parseInt(theme.glow.slice(3, 5), 16)
  const b = parseInt(theme.glow.slice(5, 7), 16)

  return `
    inset 0 0 18px rgba(${r}, ${g}, ${b}, 0.35),
    inset 0 0 35px rgba(${r}, ${g}, ${b}, 0.2),
    inset 0 0 50px rgba(${r}, ${g}, ${b}, 0.1)
  `
    .trim()
    .replace(/\n/g, '')
}

interface CoinButtonProps {
  direction: 'up' | 'down'
  onClick: () => void
  disabled?: boolean
  'aria-label': string
  size?: number
}

/**
 * Equilateral triangle SVG pointing UP
 */
function TriangleUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ width: '55%', height: '55%' }}>
      {/* Outer glow triangle */}
      <polygon
        points="50,20 20,75 80,75"
        fill="currentColor"
        opacity={0.3}
        transform="scale(1.15) translate(-4.35, -4.35)"
      />
      {/* Main white triangle */}
      <polygon points="50,20 20,75 80,75" fill="white" opacity={0.95} />
    </svg>
  )
}

/**
 * Equilateral triangle SVG pointing DOWN
 */
function TriangleDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ width: '55%', height: '55%' }}>
      {/* Outer glow triangle */}
      <polygon
        points="20,25 80,25 50,80"
        fill="currentColor"
        opacity={0.3}
        transform="scale(1.15) translate(-4.35, -4.35)"
      />
      {/* Main white triangle */}
      <polygon points="20,25 80,25 50,80" fill="white" opacity={0.95} />
    </svg>
  )
}

/**
 * Radar ripple effect component - expands from center INSIDE the button
 */
function RadarRipple({
  theme,
  size,
}: {
  theme: (typeof COIN_THEME)[keyof typeof COIN_THEME]
  size: number
}) {
  return (
    <m.div
      initial={{ scale: 0, opacity: 0.9 }}
      animate={{ scale: 1, opacity: 0 }}
      transition={{
        duration: 0.5,
        ease: 'easeOut',
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full"
      style={{
        width: size,
        height: size,
        border: `2px solid ${theme.primary}`,
        boxShadow: `inset 0 0 15px ${theme.glow}`,
      }}
    />
  )
}

export const CoinButton = React.memo(function CoinButton({
  direction,
  onClick,
  disabled = false,
  'aria-label': ariaLabel,
  size = 88,
}: CoinButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const theme = COIN_THEME[direction]

  const beatActive = useTradingStore((state) => state.beatActive)

  const handlePressStart = useCallback(() => {
    if (!disabled) setIsPressed(true)
  }, [disabled])

  const handlePressEnd = useCallback(() => {
    setIsPressed(false)
  }, [])

  // Memoize glow style to prevent recalculation on every render
  const glowStyle = useMemo(() => {
    if (disabled) return 'none'
    if (isPressed) return generateBrightestGlow(theme)
    if (beatActive) return generateMediumGlow(theme)
    return generateLightGlow(theme)
  }, [disabled, isPressed, beatActive, theme])

  // Memoize scale value to prevent unnecessary animation recalculations
  const scaleValue = isPressed ? 0.88 : beatActive ? 1.02 : 1

  return (
    <m.button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      aria-label={ariaLabel}
      className={cn(
        'relative rounded-full cursor-pointer overflow-hidden',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        disabled && 'cursor-not-allowed'
      )}
      style={
        {
          width: size,
          height: size,
          '--tw-ring-color': theme.primary,
          '--tw-ring-offset-color': 'rgba(0, 0, 0, 0.8)',
          touchAction: 'manipulation',
          willChange: 'transform',
        } as React.CSSProperties
      }
      animate={{
        scale: scaleValue,
      }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 20,
        mass: 0.5,
      }}
    >
      {/* Dark core background with radial gradient */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%,
            ${theme.darkCore}ee 0%,
            ${theme.darkCore} 70%,
            ${theme.darkCore} 100%
          )`,
          opacity: disabled ? 0.4 : 1,
        }}
      />

      {/* Inner glow layer - inset box-shadow */}
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: glowStyle,
          opacity: disabled ? 0.3 : 1,
        }}
      />

      {/* Edge ring system - multi-layer via box-shadow */}
      <span
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: '3px',
          border: `1px solid rgba(255, 255, 255, 0.6)`,
          borderRadius: '50%',
          boxShadow: `
            inset 0 0 0 2px ${theme.darkCore},
            inset 0 0 0 4px ${theme.edgeAccent},
            inset 0 0 0 6px rgba(${parseInt(theme.glow.slice(1, 3), 16)}, ${parseInt(theme.glow.slice(3, 5), 16)}, ${parseInt(theme.glow.slice(5, 7), 16)}, 0.5)
          `,
          opacity: disabled ? 0.3 : 1,
        }}
      />

      {/* Triangle symbol */}
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          color: theme.glow,
          opacity: disabled ? 0.3 : 1,
          filter: disabled ? 'saturate(0.3)' : 'none',
        }}
      >
        {direction === 'up' ? (
          <TriangleUp className="drop-shadow-[0_0_8px_currentColor]" />
        ) : (
          <TriangleDown className="drop-shadow-[0_0_8px_currentColor]" />
        )}
      </span>

      {/* Radar ripple effect on press - INSIDE the button */}
      <AnimatePresence>
        {isPressed && !disabled && <RadarRipple theme={theme} size={size} />}
      </AnimatePresence>

      {/* Disabled overlay */}
      {disabled && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            filter: 'saturate(0.3)',
          }}
        />
      )}
    </m.button>
  )
})
