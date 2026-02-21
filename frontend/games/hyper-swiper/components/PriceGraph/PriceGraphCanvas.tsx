/**
 * PriceGraphCanvas - Full-screen immersive background component
 * Arcade-optimized for 500× leverage trading game
 *
 * Features:
 * - Single neon line (green above zero, red below)
 * - Permanent zero line (center)
 * - Liquidation bands (tension indicators)
 * - Momentum-reactive styling (thickness, glow)
 * - PnL overlay text
 */

'use client'

import React, { useSyncExternalStore, useMemo } from 'react'
import { usePriceGraph } from './usePriceGraph'
import { useTradingStore } from '../../game/stores/trading-store'
import { GRAPH_COLORS, ARCADE_GRAPH_CONFIG } from './constants'

const emptySubscribe = () => () => {}

function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

/**
 * Zero line component - horizontal center line
 * Above = longs winning, Below = shorts winning
 */
const ZeroLine = React.memo(function ZeroLine() {
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: '50%',
        height: '1px',
        backgroundColor: GRAPH_COLORS.zeroLineColor,
        transform: 'translateY(-50%)',
        zIndex: 2,
      }}
    >
      {/* Zero label */}
      <div
        className="absolute right-2 -translate-y-1/2 text-[10px] font-mono text-white/40"
        style={{ top: '50%' }}
      >
        0%
      </div>
    </div>
  )
})

/**
 * Liquidation bands component - faint red bands at liquidation threshold
 * Creates tension by showing danger zones
 */
const LiquidationBands = React.memo(function LiquidationBands({
  liquidationDisplayValue,
  maxAbsValue,
}: {
  liquidationDisplayValue: number
  maxAbsValue: number
}) {
  // Calculate band position as percentage from center
  // The band position is relative to the max value for proper scaling
  const bandPosition = useMemo(() => {
    if (maxAbsValue <= 0) return 50
    // Position as percentage from center (50%)
    const offset =
      (liquidationDisplayValue / (maxAbsValue * ARCADE_GRAPH_CONFIG.autoScalePadding)) * 50
    return Math.min(45, Math.max(5, 50 - offset)) // Clamp to visible range
  }, [liquidationDisplayValue, maxAbsValue])

  return (
    <>
      {/* Upper liquidation band (shorts liquidated) */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: `${bandPosition}%`,
          height: '8px',
          background: `linear-gradient(to bottom, ${GRAPH_COLORS.liquidationBandColor}, transparent)`,
          transform: 'translateY(-100%)',
          zIndex: 1,
        }}
      >
        <div
          className="absolute right-2 text-[8px] font-mono text-red-400/50"
          style={{ top: '2px' }}
        >
          LIQUIDATION
        </div>
      </div>

      {/* Lower liquidation band (longs liquidated) */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: `${bandPosition}%`,
          height: '8px',
          background: `linear-gradient(to top, ${GRAPH_COLORS.liquidationBandColor}, transparent)`,
          transform: 'translateY(100%)',
          zIndex: 1,
        }}
      >
        <div
          className="absolute right-2 text-[8px] font-mono text-red-400/50"
          style={{ bottom: '2px' }}
        >
          LIQUIDATION
        </div>
      </div>
    </>
  )
})

/**
 * PnL overlay component - shows current position status
 */
const PnLOverlay = React.memo(function PnLOverlay({
  currentValue,
  startPrice,
}: {
  currentValue: number | null
  startPrice: number | null
}) {
  const openPositions = useTradingStore((state) => state.openPositions)
  const localPlayerId = useTradingStore((state) => state.localPlayerId)

  // Calculate aggregate PnL for local player
  const { totalPnL, isPositive } = useMemo(() => {
    if (!currentValue || !startPrice) {
      return { totalPnL: 0, isPositive: true }
    }

    // Get local player's open positions
    const localPositions = Array.from(openPositions.values()).filter(
      (pos) => pos.playerId === localPlayerId && pos.status === 'open'
    )

    if (localPositions.length === 0) {
      // Show current chart status if no positions
      const pctChange = currentValue > 0 ? '+LONGS' : '-SHORTS'
      return {
        totalPnL: currentValue,
        isPositive: currentValue >= 0,
      }
    }

    // Calculate total PnL
    let total = 0
    for (const pos of localPositions) {
      // Simple PnL calculation based on direction and price change
      // isLong: true = LONG (profit when price goes up), false = SHORT (profit when price goes down)
      const direction = pos.isLong ? 1 : -1
      total += direction * currentValue
    }

    return {
      totalPnL: total,
      isPositive: total >= 0,
    }
  }, [currentValue, startPrice, openPositions, localPlayerId])

  if (!currentValue) return null

  const displayText = isPositive
    ? `LONGS +${Math.abs(totalPnL).toFixed(1)}%`
    : `SHORTS +${Math.abs(totalPnL).toFixed(1)}%`

  return (
    <div className="absolute top-4 left-4 pointer-events-none" style={{ zIndex: 10 }}>
      <div
        className={`text-lg font-mono font-bold tracking-wider ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}
        style={{
          textShadow: isPositive
            ? '0 0 10px rgba(0, 255, 136, 0.5)'
            : '0 0 10px rgba(255, 68, 102, 0.5)',
        }}
      >
        {displayText}
      </div>
    </div>
  )
})

/**
 * Glow overlay component - momentum-reactive glow effect
 */
const GlowOverlay = React.memo(function GlowOverlay({
  glowIntensity,
  isAboveZero,
}: {
  glowIntensity: number
  isAboveZero: boolean
}) {
  if (glowIntensity <= 0) return null

  const glowColor = isAboveZero
    ? `rgba(0, 255, 136, ${glowIntensity * 0.3})`
    : `rgba(255, 68, 102, ${glowIntensity * 0.3})`

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, ${glowColor}, transparent 70%)`,
        opacity: glowIntensity,
        zIndex: 0,
        transition: 'opacity 0.2s ease-out',
      }}
    />
  )
})

/**
 * Main price graph component - Positioned above the bottom HUD
 * Memoized to prevent unnecessary re-renders
 */
export const PriceGraphCanvas = React.memo(function PriceGraphCanvas() {
	const mounted = useMounted()
	const { setContainer, momentumStyle, maxAbsValue, liquidationDisplayValue } = usePriceGraph()
	const isPriceConnected = useTradingStore((state) => state.isPriceConnected)
	const priceData = useTradingStore((state) => state.priceData)
	const isPlaying = useTradingStore((state) => state.isPlaying)
	const firstPrice = useTradingStore((state) => state.firstPrice)

	const isLoading = !isPriceConnected || !priceData
	const showGraph = isPlaying && !isLoading

	// Determine current chart state for glow
	const isAboveZero = useMemo(() => {
		if (!priceData || !firstPrice) return true
		const change = ((priceData.price - firstPrice) / firstPrice) * 100
		return change >= 0
	}, [priceData, firstPrice])

	if (!mounted) return null

	return (
		<div
			className="absolute left-0 right-0 top-0 bottom-32"
			style={{
				pointerEvents: 'none',
				zIndex: 0,
				opacity: showGraph ? 1 : 0,
				transition: 'opacity 0.5s ease-in-out',
			}}
		>
			{/* Chart container */}
			<div ref={setContainer} className="absolute inset-0 h-full w-full" />

			{/* Zero line */}
			{showGraph && <ZeroLine />}

			{/* Liquidation bands */}
			{showGraph && (
				<LiquidationBands
					liquidationDisplayValue={liquidationDisplayValue}
					maxAbsValue={maxAbsValue}
				/>
			)}

			{/* PnL overlay */}
			{showGraph && priceData && (
				<PnLOverlay
					currentValue={maxAbsValue * (isAboveZero ? 1 : -1)}
					startPrice={firstPrice}
				/>
			)}

      {/* Pulse effect overlay */}
      {momentumStyle.pulseEffect && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            background: isAboveZero
              ? 'radial-gradient(ellipse at center, rgba(0, 255, 136, 0.1), transparent 50%)'
              : 'radial-gradient(ellipse at center, rgba(255, 68, 102, 0.1), transparent 50%)',
            zIndex: 0,
          }}
        />
      )}
    </div>
  )
})
